/**
 * RIDDOR F2508 PDF Generator Edge Function
 * Phase 6: RIDDOR Auto-Flagging - Plan 03
 *
 * Purpose: Generate pre-filled HSE F2508 RIDDOR report PDF from treatment data.
 * Stores PDF in Supabase Storage and returns signed URL for download.
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { F2508Document } from './F2508Document.tsx';
import { mapTreatmentToF2508 } from './f2508-mapping.ts';
import type { RIDDORIncidentData } from './types.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateF2508Request {
  riddor_incident_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { riddor_incident_id } = await req.json() as GenerateF2508Request;

    if (!riddor_incident_id) {
      return new Response(
        JSON.stringify({ error: 'riddor_incident_id is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Generating F2508 for RIDDOR incident: ${riddor_incident_id}`);

    // Fetch RIDDOR incident with joined treatment, worker, and organization data
    const { data: incident, error: fetchError } = await supabase
      .from('riddor_incidents')
      .select(`
        id,
        category,
        confidence_level,
        deadline_date,
        detected_at,
        treatments (
          id,
          injury_type,
          body_part,
          severity,
          mechanism_of_injury,
          treatment_types,
          outcome,
          created_at,
          reference_number,
          event_vertical
        ),
        workers (
          first_name,
          last_name,
          role,
          company
        ),
        organizations (
          company_name,
          site_address,
          postcode,
          phone
        )
      `)
      .eq('id', riddor_incident_id)
      .single();

    if (fetchError || !incident) {
      console.error('Error fetching RIDDOR incident:', fetchError);
      return new Response(
        JSON.stringify({ error: 'RIDDOR incident not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate vertical — F2508 only applies to RIDDOR verticals.
    const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];
    const treatmentVertical = (incident.treatments as unknown as { event_vertical?: string })?.event_vertical;
    if (treatmentVertical && NON_RIDDOR_VERTICALS.includes(treatmentVertical)) {
      return new Response(
        JSON.stringify({ error: `F2508 does not apply to vertical: ${treatmentVertical}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Map treatment data to F2508 fields
    const f2508Data = mapTreatmentToF2508(incident as unknown as RIDDORIncidentData);

    console.log('F2508 data mapped, generating PDF...');

    // Generate PDF using @react-pdf/renderer
    const generatedAt = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const pdfBuffer = await renderToBuffer(
      <F2508Document data={f2508Data} generatedAt={generatedAt} />
    );

    console.log(`PDF generated (${pdfBuffer.byteLength} bytes), uploading to storage...`);

    // Upload to Supabase Storage
    const fileName = `${riddor_incident_id}/F2508-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('riddor-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to store PDF' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`PDF uploaded to storage: ${fileName}`);

    // Update riddor_incidents with PDF path
    await supabase
      .from('riddor_incidents')
      .update({ f2508_pdf_path: fileName })
      .eq('id', riddor_incident_id);

    // Generate signed URL (7-day expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('riddor-reports')
      .createSignedUrl(fileName, 604800); // 7 days in seconds

    console.log('F2508 generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        pdf_path: fileName,
        signed_url: signedUrlData?.signedUrl,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('F2508 generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
