/**
 * FA Incident Generator Edge Function
 * Phase 22: Football / Sports Vertical — FOOT-07
 *
 * Generates FA Match Day Injury Form PDF for player incidents
 * or SGSA Medical Incident Report PDF for spectator incidents.
 * Routes by patient_type in vertical_extra_fields JSONB.
 *
 * Replaces the Phase 18 501 stub.
 *
 * Authentication: Service role key (called by incident-report-dispatcher)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import React from 'npm:react@18.3.1';
import { FAPlayerDocument } from './FAPlayerDocument.tsx';
import { FASpectatorDocument } from './FASpectatorDocument.tsx';
import { mapTreatmentToFAPlayer } from './fa-player-mapping.ts';
import { mapTreatmentToSGSASpectator } from './fa-spectator-mapping.ts';
import type {
  FAIncidentRequest,
  FootballExtraFields,
  FootballPlayerFields,
  FootballSpectatorFields,
} from './types.ts';

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
    const body = await req.json() as Partial<FAIncidentRequest>;

    if (!body.incident_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (body.event_vertical !== 'sporting_events') {
      return new Response(
        JSON.stringify({
          error: `fa-incident-generator only handles the sporting_events vertical. Got: ${body.event_vertical ?? 'none'}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch treatment with worker and org joins.
    // incident_id IS the treatment ID for football incidents (no riddor_incidents entry).
    const { data: treatment, error: fetchError } = await supabase
      .from('treatments')
      .select(`
        id,
        reference_number,
        injury_type,
        body_part,
        severity,
        mechanism_of_injury,
        treatment_types,
        treatment_notes,
        outcome,
        created_at,
        event_vertical,
        vertical_extra_fields,
        medic_id,
        workers(first_name, last_name, role, company),
        organizations(company_name, site_address)
      `)
      .eq('id', body.incident_id)
      .single();

    if (fetchError || !treatment) {
      return new Response(
        JSON.stringify({ error: 'Treatment not found', detail: fetchError?.message }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // vertical_extra_fields is returned as a parsed object by Supabase (JSONB column).
    // Do NOT JSON.parse() — it is already a JS object.
    const extraFields = treatment.vertical_extra_fields as FootballExtraFields | null;
    const patientType = extraFields?.patient_type;

    if (!patientType) {
      return new Response(
        JSON.stringify({ error: 'vertical_extra_fields.patient_type is required for football incidents' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const generatedAt = new Date().toISOString();
    let pdfBuffer: ArrayBuffer;
    let fileName: string;

    if (patientType === 'player') {
      const data = mapTreatmentToFAPlayer(
        treatment as unknown as Record<string, unknown>,
        extraFields as FootballPlayerFields,
      );
      pdfBuffer = await renderToBuffer(
        React.createElement(FAPlayerDocument, { data, generatedAt })
      );
      fileName = `${body.incident_id}/FA-Player-${Date.now()}.pdf`;
    } else {
      // patientType === 'spectator'
      const data = mapTreatmentToSGSASpectator(
        treatment as unknown as Record<string, unknown>,
        extraFields as FootballSpectatorFields,
      );
      pdfBuffer = await renderToBuffer(
        React.createElement(FASpectatorDocument, { data, generatedAt })
      );
      fileName = `${body.incident_id}/SGSA-Spectator-${Date.now()}.pdf`;
    }

    // Upload PDF to fa-incident-reports storage bucket
    const { error: uploadError } = await supabase.storage
      .from('fa-incident-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('FA incident PDF upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'PDF upload failed', detail: uploadError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Return 7-day signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('fa-incident-reports')
      .createSignedUrl(fileName, 604800);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL', detail: signedUrlError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        patient_type: patientType,
        signed_url: signedUrlData.signedUrl,
        file_name: fileName,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('FA incident generator error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
