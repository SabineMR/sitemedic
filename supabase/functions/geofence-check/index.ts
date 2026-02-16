/**
 * Supabase Edge Function: geofence-check
 *
 * Server-side geofence validation and event creation.
 *
 * WHY: Mobile apps can detect geofence entry/exit, but we need server-side
 * validation to prevent tampering and maintain state machine for consecutive pings.
 *
 * CALLED BY: Background job that processes recent location pings
 *
 * FEATURES:
 * - Checks if medic crossed geofence boundary
 * - Maintains state machine (requires 3 consecutive pings)
 * - Creates shift events (arrived_on_site / left_site)
 * - Prevents duplicate events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  calculateDistance,
  isInsideGeofence,
  processGeofenceTransition,
  createInitialGeofenceState,
} from '../_shared/geofence.ts';

/**
 * Main handler - Process geofence checks for recent pings
 */
serve(async (req) => {
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
    // Get Supabase admin client (bypasses RLS for server-side processing)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get recent location pings (last 5 minutes) that haven't been processed for geofence
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentPings, error: pingsError } = await supabaseAdmin
      .from('medic_location_pings')
      .select('*, bookings!inner(id, site_latitude, site_longitude)')
      .gte('recorded_at', fiveMinutesAgo)
      .order('medic_id, recorded_at', { ascending: true });

    if (pingsError) {
      console.error('Error fetching pings:', pingsError);
      return new Response(JSON.stringify({ error: pingsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${recentPings?.length || 0} recent pings for geofence checks`);

    // Group pings by medic + booking
    const pingsByMedicBooking = new Map<string, any[]>();
    for (const ping of recentPings || []) {
      const key = `${ping.medic_id}:${ping.booking_id}`;
      if (!pingsByMedicBooking.has(key)) {
        pingsByMedicBooking.set(key, []);
      }
      pingsByMedicBooking.get(key)!.push(ping);
    }

    let eventsCreated = 0;

    // Process each medic-booking combination
    for (const [key, pings] of pingsByMedicBooking.entries()) {
      const [medicId, bookingId] = key.split(':');

      // Get or create geofence for this booking
      const { data: geofences } = await supabaseAdmin
        .from('geofences')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('is_active', true)
        .single();

      if (!geofences) {
        // Create default geofence from booking site location
        const booking = pings[0].bookings;
        if (booking.site_latitude && booking.site_longitude) {
          await supabaseAdmin.from('geofences').insert({
            booking_id: bookingId,
            center_latitude: booking.site_latitude,
            center_longitude: booking.site_longitude,
            radius_meters: 75, // Default 75m radius
            require_consecutive_pings: 3,
            is_active: true,
            notes: 'Auto-created geofence',
          });
          console.log(`Created geofence for booking ${bookingId}`);
        }
        continue; // Skip this iteration, will process in next run
      }

      // Get current geofence state (stored in database or create new)
      // For MVP, we'll check the last few shift events to infer state
      const { data: lastEvent } = await supabaseAdmin
        .from('medic_shift_events')
        .select('event_type, event_timestamp')
        .eq('medic_id', medicId)
        .eq('booking_id', bookingId)
        .in('event_type', ['arrived_on_site', 'left_site'])
        .order('event_timestamp', { ascending: false })
        .limit(1)
        .single();

      // Infer current state from last event
      let currentState = createInitialGeofenceState();
      if (lastEvent) {
        currentState.inside_geofence = lastEvent.event_type === 'arrived_on_site';
      }

      // Process each ping in sequence
      for (const ping of pings) {
        const distance = calculateDistance(
          ping.latitude,
          ping.longitude,
          geofences.center_latitude,
          geofences.center_longitude
        );

        const isInside = distance <= geofences.radius_meters;

        // Process state transition
        const { newState, event } = processGeofenceTransition(
          currentState,
          isInside,
          geofences.require_consecutive_pings
        );

        currentState = newState;

        // If event triggered, create shift event
        if (event) {
          const eventType = event === 'entered' ? 'arrived_on_site' : 'left_site';

          await supabaseAdmin.from('medic_shift_events').insert({
            medic_id: medicId,
            booking_id: bookingId,
            event_type: eventType,
            event_timestamp: ping.recorded_at,
            latitude: ping.latitude,
            longitude: ping.longitude,
            accuracy_meters: ping.accuracy_meters,
            source: 'geofence_auto',
            geofence_radius_meters: geofences.radius_meters,
            distance_from_site_meters: distance,
            notes: `Automatic geofence ${event} detected (${geofences.require_consecutive_pings} consecutive pings)`,
            device_info: {
              battery_level: ping.battery_level,
              connection_type: ping.connection_type,
            },
          });

          eventsCreated++;
          console.log(`Created ${eventType} event for medic ${medicId} at ${ping.recorded_at}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pings_processed: recentPings?.length || 0,
        events_created: eventsCreated,
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
