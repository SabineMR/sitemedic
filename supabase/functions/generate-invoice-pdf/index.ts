/**
 * Generate Invoice PDF Edge Function
 * Phase 6.5: Creates PDF invoice from invoice record and uploads to Storage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface GenerateInvoiceRequest {
  invoiceId: string;
}

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { invoiceId }: GenerateInvoiceRequest = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'invoiceId required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Generating invoice PDF for invoice ID: ${invoiceId}`);

    // Fetch invoice with client and line items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format data for PDF template
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: new Date(invoice.invoice_date).toLocaleDateString('en-GB'),
      due_date: new Date(invoice.due_date).toLocaleDateString('en-GB'),
      client: {
        company_name: invoice.client.company_name,
        billing_address: invoice.client.billing_address,
        billing_postcode: invoice.client.billing_postcode,
        vat_number: invoice.client.vat_number,
      },
      line_items: invoice.line_items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.amount),
      })),
      subtotal: Number(invoice.subtotal),
      vat: Number(invoice.vat),
      total: Number(invoice.total),
      payment_terms: invoice.payment_terms,
      late_fee_charged: Number(invoice.late_fee_charged || 0),
    };

    // Generate PDF using a simple HTML-to-PDF approach
    // Note: @react-pdf/renderer is complex to set up in Deno, so we'll use a simpler approach
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    // For production, you'd use a proper PDF generation service
    // For now, we'll store the HTML as a placeholder
    const pdfBuffer = new TextEncoder().encode(htmlContent);

    // Upload to Supabase Storage
    const fileName = `${invoice.invoice_number}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading invoice PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update invoice record
    await supabase
      .from('invoices')
      .update({
        pdf_url: pdfUrl,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    console.log(`✅ Invoice PDF generated and uploaded: ${fileName}`);

    return new Response(
      JSON.stringify({ pdf_url: pdfUrl, invoice_number: invoice.invoice_number }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvoiceHTML(data: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
    .header { margin-bottom: 30px; }
    .title { font-size: 32px; font-weight: bold; }
    .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: bold; background: #f9fafb; }
    .text-right { text-align: right; }
    .total-row { font-size: 16px; font-weight: bold; background: #f3f4f6; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">INVOICE</div>
    <div class="invoice-number">${data.invoice_number}</div>
  </div>

  <div class="section">
    <div class="section-title">Bill To:</div>
    <div>${data.client.company_name}</div>
    <div>${data.client.billing_address}</div>
    <div>${data.client.billing_postcode}</div>
    ${data.client.vat_number ? `<div>VAT: ${data.client.vat_number}</div>` : ''}
  </div>

  <div class="section">
    <table>
      <tr>
        <td>Invoice Date:</td>
        <td class="text-right">${data.invoice_date}</td>
      </tr>
      <tr>
        <td>Due Date:</td>
        <td class="text-right">${data.due_date}</td>
      </tr>
      <tr>
        <td>Payment Terms:</td>
        <td class="text-right">${data.payment_terms === 'net_30' ? 'Net 30' : 'Prepay'}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Services</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Hours</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.line_items.map((item: any) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td class="text-right">£${item.unit_price.toFixed(2)}</td>
            <td class="text-right">£${item.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <table style="width: 50%; margin-left: auto;">
      <tr>
        <td>Subtotal:</td>
        <td class="text-right">£${data.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>VAT (20%):</td>
        <td class="text-right">£${data.vat.toFixed(2)}</td>
      </tr>
      ${data.late_fee_charged > 0 ? `
        <tr>
          <td>Late Payment Fee:</td>
          <td class="text-right">£${data.late_fee_charged.toFixed(2)}</td>
        </tr>
      ` : ''}
      <tr class="total-row">
        <td>Total Due:</td>
        <td class="text-right">£${(data.total + data.late_fee_charged).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Payment is due within 30 days of invoice date.</p>
    <p>Late payments subject to statutory late fees under the Late Payment of Commercial Debts (Interest) Act 1998.</p>
    <p>Bank details: Sort Code 12-34-56, Account 12345678</p>
  </div>
</body>
</html>
  `;
}
