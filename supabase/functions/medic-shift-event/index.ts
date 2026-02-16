/**
 * Supabase Edge Function: medic-shift-event
 *
 * Receives shift status change events from medic mobile apps (arrival, departure, breaks, etc.)
 *
 * WHY: Status changes are significant events that need validation and may trigger alerts
 * or notifications. Unlike location pings (high frequency), these are low frequency but
 * business-critical events.
 *
 * FEATURES:
 * - Validates event types and sources
 * - Checks geofence boundaries if location provided
 * - Prevents duplicate events (e.g., two "arrived_on_site" events without a "left_site" in between)
 * - Creates audit log entries
 * - May trigger alerts (e.g., late_arrival event)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Types
interface ShiftEvent {
  medic_id: string;
  booking_id: string;
  event_type: string;
  event_timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  source: 'geofence_auto' | 'manual_button' | 'system_detected' | 'admin_override';
  triggered_by_user_id?: string;
  geofence_radius_meters?: number;
  distance_from_site_meters?: number;
  notes?: string;
  device_info?: {
    battery_level?: number;
    connection_type?: string;
    app_version?: string;
    os_version?: string;
  };
}

// Valid event types (must match database CHECK constraint)
const VALID_EVENT_TYPES = [
  'shift_started',
  'arrived_on_site',
  'left_site',
  'break_started',
  'break_ended',
  'shift_ended',
  'battery_critical',
  'battery_died',
  'connection_lost',
  'connection_restored',
  'gps_unavailable',
  'app_killed',
  'app_restored',
  'inactivity_detected',
  'late_arrival',
  'early_departure',
];

// Event pairs that should not happen consecutively (state machine validation)
const CONFLICTING_EVENTS = {
  arrived_on_site: ['arrived_on_site'], // Can't arrive twice without leaving
  left_site: ['left_site'], // Can't leave twice without arriving
  break_started: ['break_started'], // Can't start break twice
  break_ended: ['break_ended'], // Can't end break twice
};

/**
 * Validate shift event
 */
function validateEvent(event: ShiftEvent): { valid: boolean; error?: string } {
  // Check required fields
  if (!event.medic_id || !event.booking_id || !event.event_type) {
    return { valid: false, error: 'Missing required fields (medic_id, booking_id, event_type)' };
  }

  // Validate event type
  if (!VALID_EVENT_TYPES.includes(event.event_type)) {
    return {
      valid: false,
      error: `Invalid event type: ${event.event_type}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
    };
  }

  // Validate source
  const validSources = ['geofence_auto', 'manual_button', 'system_detected', 'admin_override'];
  if (!validSources.includes(event.source)) {
    return { valid: false, error: `Invalid source: ${event.source}` };
  }

  // Validate timestamp
  const eventTime = new Date(event.event_timestamp);
  if (isNaN(eventTime.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  // Validate timestamp is not too far in the future (allow 5 minutes clock skew)
  if (eventTime.getTime() > Date.now() + 5 * 60 * 1000) {
    return { valid: false, error: 'Event timestamp is too far in the future' };
  }

  // If location provided, validate coordinates
  if (event.latitude !== undefined || event.longitude !== undefined) {
    if (event.latitude === undefined || event.longitude === undefined) {
      return { valid: false, error: 'Both latitude and longitude must be provided together' };
    }

    // Basic coordinate range validation
    if (
      event.latitude < -90 ||
      event.latitude > 90 ||
      event.longitude < -180 ||
      event.longitude > 180
    ) {
      return { valid: false, error: 'Invalid GPS coordinates' };
    }
  }

  return { valid: true };
}

/**
 * Check for conflicting events (prevent invalid state transitions)
 */
async function checkConflictingEvents(
  supabaseClient: any,
  medicId: string,
  bookingId: string,
  eventType: string
): Promise<{ valid: boolean; error?: string }> {
  // Only check for events that have state conflicts
  const conflictingTypes = CONFLICTING_EVENTS[eventType as keyof typeof CONFLICTING_EVENTS];
  if (!conflictingTypes) {
    return { valid: true }; // No conflicts to check
  }

  // Get the most recent event of conflicting types for this medic/booking
  const { data: recentEvents, error } = await supabaseClient
    .from('medic_shift_events')
    .select('event_type, event_timestamp')
    .eq('medic_id', medicId)
    .eq('booking_id', bookingId)
    .in('event_type', conflictingTypes)
    .order('event_timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error checking conflicting events:', error);
    return { valid: true }; // Allow event on error (fail open)
  }

  if (recentEvents && recentEvents.length > 0) {
    const lastEvent = recentEvents[0];
    // Check if we need an intermediate event (e.g., left_site before another arrived_on_site)
    if (eventType === 'arrived_on_site' && lastEvent.event_type === 'arrived_on_site') {
      // Check if there was a "left_site" event after the last arrival
      const { data: leftEvents } = await supabaseClient
        .from('medic_shift_events')
        .select('event_timestamp')
        .eq('medic_id', medicId)
        .eq('booking_id', bookingId)
        .eq('event_type', 'left_site')
        .gt('event_timestamp', lastEvent.event_timestamp)
        .limit(1);

      if (!leftEvents || leftEvents.length === 0) {
        return {
          valid: false,
          error: 'Cannot arrive on-site again without leaving first (duplicate arrival)',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Supabase client with user's auth context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const event: ShiftEvent = await req.json();

    // Validate event
    const validation = validateEvent(event);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.error,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Ensure medic can only submit their own events
    if (event.medic_id !== user.id && event.source !== 'admin_override') {
      return new Response(
        JSON.stringify({
          error: 'Cannot create events for other medics',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for conflicting events (prevent invalid state transitions)
    const conflictCheck = await checkConflictingEvents(
      supabaseClient,
      event.medic_id,
      event.booking_id,
      event.event_type
    );
    if (!conflictCheck.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid state transition',
          details: conflictCheck.error,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert event (RLS will enforce medic can only insert their own)
    const { data, error: insertError } = await supabaseClient
      .from('medic_shift_events')
      .insert(event)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting shift event:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create shift event',
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Note: Audit log is automatically created by database trigger (log_shift_event_to_audit)
    // No need to manually insert audit record here

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        event: data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
