import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import React from 'npm:react@18.2.0';

// Import invoice PDF components (will import from npm bundle)
import { InvoiceDocument } from './components/InvoiceDocument.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client: {
    company_name: string;
    billing_address: string;
    billing_postcode: string;
    vat_number: string | null;
  };
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  subtotal: number;
  vat: number;
  total: number;
  payment_terms: 'prepay' | 'net_30';
  late_fee_charged: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse request
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'invoiceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice with client and line items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(
          company_name,
          billing_address,
          billing_postcode,
          vat_number
        ),
        line_items:invoice_line_items(
          description,
          quantity,
          unit_price,
          amount
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found', details: invoiceError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format dates (UK format: dd MMM yyyy)
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    // Build invoice data
    const invoiceData: InvoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: formatDate(invoice.invoice_date),
      due_date: formatDate(invoice.due_date),
      client: {
        company_name: invoice.client.company_name,
        billing_address: invoice.client.billing_address,
        billing_postcode: invoice.client.billing_postcode,
        vat_number: invoice.client.vat_number,
      },
      line_items: invoice.line_items.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        amount: parseFloat(item.amount),
      })),
      subtotal: parseFloat(invoice.subtotal),
      vat: parseFloat(invoice.vat),
      total: parseFloat(invoice.total),
      payment_terms: invoice.payment_terms,
      late_fee_charged: parseFloat(invoice.late_fee_charged || 0),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceDocument, { data: invoiceData })
    );

    // Upload to Supabase Storage
    const fileName = `${invoice.invoice_number}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(fileName, 31536000); // 365 days

    if (!urlData) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update invoice record
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_url: urlData.signedUrl,
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
      // Don't fail - PDF was generated successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData.signedUrl,
        invoice_number: invoice.invoice_number,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
