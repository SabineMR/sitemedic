/**
 * FA Incident Generator Edge Function
 * Phase 18: Vertical Infrastructure
 * Phase 19+: Full PDF implementation
 *
 * Purpose: Generate FA incident report PDF for sporting_events verticals.
 * Currently a stub — returns 501 Not Implemented until Phase 19+ PDF work.
 *
 * Note: Confirm with client whether SGSA form (professional clubs) is required
 * alongside FA form (grassroots) before Phase 22 implementation.
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import type { FAIncidentData } from './types.ts';

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
    const body = await req.json() as Partial<FAIncidentData>;

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

    // Phase 22+: FA incident report PDF generation will be implemented here.
    return new Response(
      JSON.stringify({
        error: 'Not Implemented',
        message: 'FA incident report PDF generation is not yet available. Scheduled for Phase 22+.',
        incident_id: body.incident_id,
        event_vertical: body.event_vertical,
      }),
      { status: 501, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('FA incident generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
