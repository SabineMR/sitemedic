/**
 * Generate Payslip PDF Edge Function
 * Phase 6.5: Creates PDF payslip from payslip record and uploads to Storage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import React from 'npm:react@18.2.0';
import { PayslipDocument } from './components/PayslipDocument.tsx';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface GeneratePayslipRequest {
  payslipId: string;
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
    const { payslipId }: GeneratePayslipRequest = await req.json();

    if (!payslipId) {
      return new Response(
        JSON.stringify({ error: 'payslipId required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`💰 Generating payslip PDF for payslip ID: ${payslipId}`);

    // Ensure storage bucket exists (idempotent)
    try {
      await supabase.storage.createBucket('payslips', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
      console.log('✓ Payslips storage bucket ready');
    } catch (bucketError: any) {
      // Ignore "already exists" errors
      if (!bucketError.message?.includes('already exists')) {
        console.warn('Storage bucket check:', bucketError.message);
      }
    }

    // Fetch payslip with related data
    const { data: payslip, error: payslipError } = await supabase
      .from('payslips')
      .select(`
        *,
        medics(first_name, last_name, employment_status, utr, umbrella_company_name),
        timesheets(hours_worked, hourly_rate, bookings(site_name))
      `)
      .eq('id', payslipId)
      .single();

    if (payslipError || !payslip) {
      console.error('Error fetching payslip:', payslipError);
      return new Response(
        JSON.stringify({ error: 'Payslip not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format data for PDF template
    const medicName = `${payslip.medics.first_name} ${payslip.medics.last_name}`;
    const payslipData = {
      medic_name: medicName,
      employment_status: payslip.medics.employment_status,
      utr: payslip.medics.utr,
      umbrella_company_name: payslip.medics.umbrella_company_name,
      pay_period_start: new Date(payslip.pay_period_start).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      pay_period_end: new Date(payslip.pay_period_end).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      payment_date: new Date(payslip.payment_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      gross_pay: Number(payslip.gross_pay),
      tax_deducted: Number(payslip.tax_deducted),
      ni_deducted: Number(payslip.ni_deducted),
      net_pay: Number(payslip.net_pay),
      hours_worked: Number(payslip.timesheets.hours_worked),
      hourly_rate: Number(payslip.timesheets.hourly_rate),
      booking_site: payslip.timesheets.bookings.site_name,
      payslip_reference: payslip.payslip_reference,
    };

    console.log('📝 Rendering payslip PDF...');

    // Generate PDF using React-PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(PayslipDocument, { data: payslipData })
    );

    console.log('✓ PDF rendered, size:', pdfBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const fileName = `${payslip.medic_id}/${payslip.id}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payslips')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading payslip PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ PDF uploaded to storage:', fileName);

    // Generate signed URL with 365-day expiry (1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('payslips')
      .createSignedUrl(fileName, 31536000); // 365 days in seconds

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const signedUrl = signedUrlData.signedUrl;

    // Update payslip record with PDF URL
    const { error: updateError } = await supabase
      .from('payslips')
      .update({ pdf_url: signedUrl })
      .eq('id', payslipId);

    if (updateError) {
      console.error('Error updating payslip record:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payslip record' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Payslip PDF generated and uploaded: ${payslip.payslip_reference}`);

    return new Response(
      JSON.stringify({
        pdf_url: signedUrl,
        payslip_reference: payslip.payslip_reference,
        medic_name: medicName,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error generating payslip PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
