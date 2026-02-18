/**
 * Motorsport Incident Generator Edge Function
 * Phase 18: Vertical Infrastructure — initial 501 stub
 * Phase 19: Full Motorsport UK Accident Form PDF implementation
 *
 * Purpose: Generate a pre-filled Motorsport UK Accident Form PDF from
 * treatment data. Stores PDF in Supabase Storage (motorsport-reports bucket)
 * and returns a signed URL for download.
 *
 * DRAFT: PDF fields are inferred from MOTO-01 requirements. A DRAFT
 * watermark is applied until the form is validated against the official
 * Motorsport UK Incident Pack V8.0.
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { MotorsportIncidentDocument } from './MotorsportIncidentDocument.tsx';
import { mapTreatmentToMotorsportForm } from './motorsport-mapping.ts';
import type { MotorsportIncidentRequest } from './types.ts';

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
    const body = await req.json() as Partial<MotorsportIncidentRequest>;

    // Validate required fields
    if (!body.incident_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (body.event_vertical !== 'motorsport') {
      return new Response(
        JSON.stringify({
          error: `motorsport-incident-generator only handles the motorsport vertical. Got: ${body.event_vertical ?? 'none'}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { incident_id } = body;

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Generating Motorsport UK Accident Form for treatment: ${incident_id}`);

    // Fetch treatment with joined worker (medic) and organisation data
    const { data: treatment, error: fetchError } = await supabase
      .from('treatments')
      .select(`
        id,
        injury_type,
        body_part,
        severity,
        mechanism_of_injury,
        treatment_types,
        outcome,
        created_at,
        reference_number,
        vertical_extra_fields,
        worker:workers(first_name, last_name, role, company),
        org:organizations(company_name, site_address)
      `)
      .eq('id', incident_id)
      .single();

    if (fetchError || !treatment) {
      console.error('Error fetching treatment:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Treatment not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse vertical_extra_fields JSONB safely
    // Mobile WatermelonDB stores this as a raw JSON string (@text column type, Phase 18-01 decision).
    // Supabase returns it as-is — parse defensively.
    let extraFields: Record<string, unknown> | null = null;
    try {
      const raw = treatment.vertical_extra_fields;
      if (typeof raw === 'string' && raw.length > 0) {
        extraFields = JSON.parse(raw);
      } else if (raw && typeof raw === 'object') {
        extraFields = raw as Record<string, unknown>;
      }
    } catch (parseError) {
      console.warn('Failed to parse vertical_extra_fields, proceeding with null:', parseError);
      extraFields = null;
    }

    // Map to MotorsportFormData
    const formData = mapTreatmentToMotorsportForm(
      treatment,
      treatment.worker as { first_name?: string; last_name?: string; role?: string; company?: string } | null,
      treatment.org as { company_name?: string; site_address?: string } | null,
      extraFields as Record<string, unknown> | null,
    );

    console.log('Motorsport form data mapped, generating PDF...');

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      <MotorsportIncidentDocument data={formData} />
    );

    console.log(`PDF generated (${pdfBuffer.byteLength} bytes), uploading to motorsport-reports...`);

    // Upload to Supabase Storage
    const fileName = `${incident_id}/MotorsportAccidentForm-${Date.now()}.pdf`;
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

    console.log('Motorsport incident PDF generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        pdf_path: fileName,
        signed_url: signedUrlData?.signedUrl,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Motorsport incident generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
