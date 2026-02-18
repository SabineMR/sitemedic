/**
 * Event Incident Report Generator Edge Function
 * Phase 18: Vertical Infrastructure
 * Phase 19+: Full PDF implementation
 *
 * Purpose: Generate incident report PDF for event verticals
 * (festivals, fairs_shows, private_events).
 * Currently a stub — returns 501 Not Implemented until Phase 19+ PDF work.
 *
 * Authentication: Service role key or user JWT
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import type { EventIncidentData } from './types.ts';

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

    // Phase 19+: PDF generation will be implemented here.
    return new Response(
      JSON.stringify({
        error: 'Not Implemented',
        message: 'Event incident report PDF generation is not yet available. Scheduled for Phase 19+.',
        incident_id: body.incident_id,
        event_vertical: body.event_vertical,
      }),
      { status: 501, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Event incident report generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
