/**
 * Motorsport Incident Generator Edge Function
 * Phase 18: Vertical Infrastructure
 * Phase 19+: Full PDF implementation
 *
 * Purpose: Generate Motorsport UK Accident Form PDF for motorsport verticals.
 * Currently a stub — returns 501 Not Implemented until Phase 19+ PDF work.
 *
 * Note: Obtain physical Motorsport UK Accident Form from Incident Pack V8.0
 * before implementing PDF template (Phase 19 research flag).
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import type { MotorsportIncidentData } from './types.ts';

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
    const body = await req.json() as Partial<MotorsportIncidentData>;

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

    // Phase 19+: Motorsport UK Accident Form PDF generation will be implemented here.
    return new Response(
      JSON.stringify({
        error: 'Not Implemented',
        message: 'Motorsport incident PDF generation is not yet available. Scheduled for Phase 19+.',
        incident_id: body.incident_id,
        event_vertical: body.event_vertical,
      }),
      { status: 501, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Motorsport incident generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
