/**
 * RIDDOR Detector Edge Function
 * Phase 6: RIDDOR Auto-Flagging - Plan 01
 *
 * Purpose: Automatically detect RIDDOR-reportable incidents when treatments are completed.
 * Called by mobile app after treatment save or by web dashboard on treatment review.
 *
 * Algorithm: Rule-based detection matching injury type + body part against HSE criteria.
 * Confidence scoring: HIGH/MEDIUM/LOW based on signal strength.
 *
 * Authentication: Service role key or user JWT
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { detectRIDDOR } from './detection-rules.ts';
import { calculateConfidence } from './confidence-scoring.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRequest {
  treatment_id: string;
}

interface DetectionResponse {
  detected: boolean;
  category: string | null;
  reason: string;
  confidence_level?: string;
  riddor_incident_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { treatment_id } = await req.json() as DetectionRequest;

    if (!treatment_id) {
      return new Response(
        JSON.stringify({ error: 'treatment_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create Supabase client with service role key for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch treatment record
    const { data: treatment, error: fetchError } = await supabase
      .from('treatments')
      .select('*')
      .eq('id', treatment_id)
      .single();

    if (fetchError || !treatment) {
      return new Response(
        JSON.stringify({ error: 'Treatment not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Vertical gate — RIDDOR only applies to specific workplace verticals.
    const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];

    // Resolve effective vertical: prefer booking-level event_vertical on treatment,
    // fall back to org primary vertical from org_settings.
    let effectiveVertical: string | null = treatment.event_vertical ?? null;

    if (!effectiveVertical) {
      const { data: orgSettings } = await supabase
        .from('org_settings')
        .select('industry_verticals')
        .eq('org_id', treatment.org_id)
        .single();
      effectiveVertical = orgSettings?.industry_verticals?.[0] ?? 'general';
    }

    if (NON_RIDDOR_VERTICALS.includes(effectiveVertical)) {
      return new Response(
        JSON.stringify({
          detected: false,
          category: null,
          reason: `RIDDOR does not apply to vertical: ${effectiveVertical}`,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    // End vertical gate — proceed with RIDDOR detection below.

    // Run RIDDOR detection algorithm
    const detection = detectRIDDOR({
      injury_type: treatment.injury_type,
      body_part: treatment.body_part || '',
      severity: treatment.severity || '',
      treatment_types: treatment.treatment_types || [],
      outcome: treatment.outcome || '',
    });

    // If RIDDOR detected, create incident record
    let riddorIncidentId: string | undefined;

    if (detection.is_riddor) {
      const confidence = calculateConfidence(detection);

      // Calculate deadline date
      // Specified injuries: 10 days from incident
      // Over-7-day injuries: 15 days from incident
      const deadlineDays = detection.category === 'specified_injury' ? 10 : 15;
      const deadlineDate = new Date(treatment.created_at);
      deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

      // Create RIDDOR incident record
      const { data: incident, error: insertError } = await supabase
        .from('riddor_incidents')
        .insert({
          treatment_id: treatment.id,
          worker_id: treatment.worker_id,
          org_id: treatment.org_id,
          category: detection.category,
          confidence_level: confidence,
          auto_flagged: true,
          medic_confirmed: null, // NULL = awaiting medic review
          deadline_date: deadlineDate.toISOString().split('T')[0], // DATE format YYYY-MM-DD
          status: 'draft',
          detected_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      // Ignore duplicate errors (23505 = unique_violation on treatment_id)
      // This is expected if function is called multiple times for same treatment
      if (insertError) {
        if (insertError.code === '23505' || insertError.message.includes('23505')) {
          console.log(`RIDDOR incident already exists for treatment ${treatment_id}`);
          // Fetch existing incident
          const { data: existingIncident } = await supabase
            .from('riddor_incidents')
            .select('id')
            .eq('treatment_id', treatment_id)
            .single();
          riddorIncidentId = existingIncident?.id;
        } else {
          console.error('Error creating RIDDOR incident:', insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      } else {
        riddorIncidentId = incident?.id;
      }
    }

    // Return detection result
    const response: DetectionResponse = {
      detected: detection.is_riddor,
      category: detection.category,
      reason: detection.reason,
      confidence_level: detection.is_riddor ? calculateConfidence(detection) : undefined,
      riddor_incident_id: riddorIncidentId,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('RIDDOR detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
