/**
 * Motorsport Medical Statistics Sheet Generator Edge Function
 * Phase 19: Motorsport Vertical — Plan 04
 *
 * Purpose: Generate a Medical Statistics Sheet PDF that aggregates all
 * motorsport treatments for a given booking (MOTO-02 requirement).
 * Stores PDF in the motorsport-reports bucket and returns a signed URL.
 *
 * Bucket dependency: motorsport-reports bucket created by migration 128 (Plan 19-03).
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import React from 'npm:react@18.3.1';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { MotorsportStatsDocument } from './MotorsportStatsDocument.tsx';
import { mapBookingToStats } from './stats-mapping.ts';
import type { MotorsportStatsRequest } from './types.ts';
import { fetchOrgBranding, fetchLogoAsDataUri } from '../_shared/branding-helpers.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as Partial<MotorsportStatsRequest>;

    // Validate required field
    if (!body.booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { booking_id } = body;

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Generating Medical Statistics Sheet for booking: ${booking_id}`);

    // Fetch booking with org_settings join
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        org_id,
        site_name,
        site_address,
        shift_date,
        shift_end_date,
        org_settings (
          company_name
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch all motorsport treatments for this booking
    const { data: treatments, error: treatmentsError } = await supabase
      .from('treatments')
      .select(`
        id,
        injury_type,
        severity,
        outcome,
        created_at,
        vertical_extra_fields,
        worker:workers (
          first_name,
          last_name
        )
      `)
      .eq('booking_id', booking_id)
      .eq('event_vertical', 'motorsport');

    if (treatmentsError) {
      console.error('Error fetching treatments:', treatmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch treatments' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!treatments || treatments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No motorsport treatments found for this booking' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Derive medic (CMO) name from first treatment's worker
    const firstWorker = treatments[0]?.worker as { first_name?: string; last_name?: string } | null;
    const medicName = firstWorker
      ? `${firstWorker.first_name ?? ''} ${firstWorker.last_name ?? ''}`.trim()
      : 'Unknown';

    // Fetch org branding
    const branding = booking.org_id ? await fetchOrgBranding(supabase, booking.org_id) : undefined;
    let logoSrc = branding?.logo_url ?? null;
    if (logoSrc) {
      const dataUri = await fetchLogoAsDataUri(logoSrc);
      if (dataUri) logoSrc = dataUri;
    }

    // Aggregate treatment data into stats
    const statsData = mapBookingToStats(
      booking as Parameters<typeof mapBookingToStats>[0],
      treatments as Parameters<typeof mapBookingToStats>[1],
      medicName
    );

    console.log(`Stats mapped: ${statsData.total_patients} patients, generating PDF...`);

    // Render PDF using @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(
      React.createElement(MotorsportStatsDocument, { data: statsData, branding, logoSrc })
    );

    console.log(`PDF generated (${pdfBuffer.byteLength} bytes), uploading to motorsport-reports...`);

    // Upload to Supabase Storage (motorsport-reports bucket, booking-scoped path)
    const fileName = `${booking_id}/MedicalStatsSheet-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('motorsport-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to store PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`PDF uploaded to motorsport-reports: ${fileName}`);

    // Generate signed URL (7-day expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('motorsport-reports')
      .createSignedUrl(fileName, 604800); // 604800 seconds = 7 days

    console.log('Medical Statistics Sheet generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        pdf_path: fileName,
        signed_url: signedUrlData?.signedUrl,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Stats sheet generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
