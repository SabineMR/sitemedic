/**
 * Event Incident Report Generator Edge Function
 * Phase 18: Vertical Infrastructure (stub)
 * Phase 20: Purple Guide PDF implementation
 *
 * Purpose: Generate Purple Guide Patient Contact Log PDF for event verticals
 * (festivals, fairs_shows, private_events).
 * Stores PDF in Supabase Storage and returns a signed URL for download.
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import React from 'npm:react@18.3.1';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { PurpleGuideDocument } from './PurpleGuideDocument.tsx';
import { mapTreatmentToPurpleGuide } from './purple-guide-mapping.ts';
import type { EventIncidentData } from './types.ts';
import { fetchOrgBranding, fetchLogoAsDataUri } from '../_shared/branding-helpers.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_VERTICALS = ['festivals', 'fairs_shows', 'private_events'];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as Partial<EventIncidentData>;

    if (!body.incident_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!body.event_vertical || !EVENT_VERTICALS.includes(body.event_vertical)) {
      return new Response(
        JSON.stringify({
          error: `event-incident-report-generator only handles event verticals: ${EVENT_VERTICALS.join(', ')}. Got: ${body.event_vertical ?? 'none'}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Generating Purple Guide PDF for treatment: ${body.incident_id}`);

    // Fetch treatment with joined medic, org, worker, and booking data
    const { data: treatment, error: fetchError } = await supabase
      .from('treatments')
      .select(`
        id,
        reference_number,
        treatment_date,
        treatment_time,
        injury_description,
        presenting_complaint,
        mechanism_of_injury,
        treatment_types,
        treatment_notes,
        vertical_extra_fields,
        org_id,
        medics (
          first_name,
          last_name
        ),
        org_settings!treatments_org_id_fkey (
          company_name
        ),
        workers (
          first_name,
          last_name
        ),
        bookings (
          site_name,
          shift_date
        )
      `)
      .eq('id', body.incident_id)
      .single();

    if (fetchError || !treatment) {
      console.error('Error fetching treatment:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Treatment not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch org branding
    const branding = treatment.org_id ? await fetchOrgBranding(supabase, treatment.org_id) : undefined;
    let logoSrc = branding?.logo_url ?? null;
    if (logoSrc) {
      const dataUri = await fetchLogoAsDataUri(logoSrc);
      if (dataUri) logoSrc = dataUri;
    }

    // Map treatment data to Purple Guide fields
    const data = mapTreatmentToPurpleGuide(treatment);

    console.log('Purple Guide data mapped, generating PDF...');

    // Generate PDF using @react-pdf/renderer
    const generatedAt = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const pdfBuffer = await renderToBuffer(
      React.createElement(PurpleGuideDocument, { data, generatedAt, branding, logoSrc })
    );

    console.log(`PDF generated (${pdfBuffer.byteLength} bytes), uploading to storage...`);

    // Upload to Supabase Storage
    const fileName = `${body.incident_id}/PurpleGuide-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('event-incident-reports')
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

    console.log(`PDF uploaded to storage: ${fileName}`);

    // Generate signed URL (7-day expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('event-incident-reports')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days in seconds

    console.log('Purple Guide PDF generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        pdf_path: fileName,
        signed_url: signedUrlData?.signedUrl,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Event incident report generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
