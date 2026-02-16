/**
 * Supabase Edge Function: alert-monitor
 *
 * Monitors active medic shifts and creates alerts for detected issues.
 *
 * CALLED BY: Cron job every 1 minute
 *
 * ALERT TYPES DETECTED:
 * - battery_low: Battery <20%
 * - battery_critical: Battery <10%
 * - late_arrival: Not on-site 15 mins after shift start
 * - connection_lost: No ping received for >5 minutes
 * - not_moving_20min: Stationary for >20 minutes while on shift
 * - gps_accuracy_poor: GPS accuracy >100m consistently
 *
 * FEATURES:
 * - Automatic deduplication (won't spam duplicate alerts)
 * - Auto-resolution when conditions improve
 * - Severity levels for triage
 * - Metadata context for debugging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { calculateDistance } from '../_shared/geofence.ts';

interface AlertCheck {
  medicId: string;
  medicName: string;
  bookingId: string;
  siteName: string;
  latestPing?: any;
  shiftStart?: string;
  lastArrival?: any;
}

/**
 * Main handler - Monitor active shifts and create alerts
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

    console.log('[AlertMonitor] Starting alert checks...');

    // Get all active medics (those with shifts today)
    const today = new Date().toISOString().split('T')[0];
    const { data: activeShifts, error: shiftsError } = await supabaseAdmin
      .from('bookings')
      .select('id, site_name, shift_start_time, medics!inner(id, name)')
      .gte('shift_date', today)
      .lte('shift_date', today);

    if (shiftsError) {
      console.error('[AlertMonitor] Error fetching active shifts:', shiftsError);
      return new Response(JSON.stringify({ error: shiftsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[AlertMonitor] Monitoring ${activeShifts?.length || 0} active shifts`);

    let alertsCreated = 0;
    let alertsResolved = 0;

    // Process each active shift
    for (const shift of activeShifts || []) {
      const medicId = shift.medics.id;
      const medicName = shift.medics.name;
      const bookingId = shift.id;
      const siteName = shift.site_name;

      // Get latest ping for this medic + booking
      const { data: latestPing } = await supabaseAdmin
        .from('medic_location_pings')
        .select('*')
        .eq('medic_id', medicId)
        .eq('booking_id', bookingId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      // Get last arrival event
      const { data: lastArrival } = await supabaseAdmin
        .from('medic_shift_events')
        .select('*')
        .eq('medic_id', medicId)
        .eq('booking_id', bookingId)
        .eq('event_type', 'arrived_on_site')
        .order('event_timestamp', { ascending: false })
        .limit(1)
        .single();

      // Check 1: Connection Lost (no ping for >5 minutes)
      if (latestPing) {
        const minutesSinceLastPing = (Date.now() - new Date(latestPing.recorded_at).getTime()) / 1000 / 60;

        if (minutesSinceLastPing > 5) {
          // Create alert
          const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
            p_medic_id: medicId,
            p_booking_id: bookingId,
            p_alert_type: 'connection_lost',
            p_alert_severity: 'high',
            p_alert_title: `${medicName} - Connection Lost`,
            p_alert_message: `No location ping received for ${Math.round(minutesSinceLastPing)} minutes`,
            p_metadata: {
              last_ping_at: latestPing.recorded_at,
              minutes_since_ping: Math.round(minutesSinceLastPing),
            },
            p_related_ping_id: latestPing.id,
          });
          if (alert) alertsCreated++;
        } else {
          // Auto-resolve if connection restored
          const resolved = await supabaseAdmin.rpc('auto_resolve_alerts', {
            p_medic_id: medicId,
            p_booking_id: bookingId,
            p_alert_types: ['connection_lost'],
          });
          if (resolved) alertsResolved += resolved;
        }

        // Check 2: Battery Low (<20%) or Critical (<10%)
        if (latestPing.battery_level !== null) {
          if (latestPing.battery_level < 10) {
            const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
              p_medic_id: medicId,
              p_booking_id: bookingId,
              p_alert_type: 'battery_critical',
              p_alert_severity: 'critical',
              p_alert_title: `${medicName} - Critical Battery`,
              p_alert_message: `Battery at ${latestPing.battery_level}% - device may die soon`,
              p_metadata: {
                battery_level: latestPing.battery_level,
                last_ping_at: latestPing.recorded_at,
              },
              p_related_ping_id: latestPing.id,
            });
            if (alert) alertsCreated++;
          } else if (latestPing.battery_level < 20) {
            const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
              p_medic_id: medicId,
              p_booking_id: bookingId,
              p_alert_type: 'battery_low',
              p_alert_severity: 'medium',
              p_alert_title: `${medicName} - Low Battery`,
              p_alert_message: `Battery at ${latestPing.battery_level}% - may need charging soon`,
              p_metadata: {
                battery_level: latestPing.battery_level,
                last_ping_at: latestPing.recorded_at,
              },
              p_related_ping_id: latestPing.id,
            });
            if (alert) alertsCreated++;
          } else {
            // Auto-resolve if battery recovered
            const resolved = await supabaseAdmin.rpc('auto_resolve_alerts', {
              p_medic_id: medicId,
              p_booking_id: bookingId,
              p_alert_types: ['battery_low', 'battery_critical'],
            });
            if (resolved) alertsResolved += resolved;
          }
        }

        // Check 3: GPS Accuracy Poor (>100m)
        if (latestPing.accuracy_meters && latestPing.accuracy_meters > 100) {
          const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
            p_medic_id: medicId,
            p_booking_id: bookingId,
            p_alert_type: 'gps_accuracy_poor',
            p_alert_severity: 'low',
            p_alert_title: `${medicName} - Poor GPS Accuracy`,
            p_alert_message: `GPS accuracy is ${Math.round(latestPing.accuracy_meters)}m - location may be unreliable`,
            p_metadata: {
              accuracy_meters: latestPing.accuracy_meters,
              last_ping_at: latestPing.recorded_at,
            },
            p_related_ping_id: latestPing.id,
          });
          if (alert) alertsCreated++;
        } else {
          // Auto-resolve if GPS improved
          const resolved = await supabaseAdmin.rpc('auto_resolve_alerts', {
            p_medic_id: medicId,
            p_booking_id: bookingId,
            p_alert_types: ['gps_accuracy_poor'],
          });
          if (resolved) alertsResolved += resolved;
        }

        // Check 4: Not Moving for 20 Minutes (if on-site)
        if (lastArrival) {
          // Get pings from last 20 minutes
          const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
          const { data: recentPings } = await supabaseAdmin
            .from('medic_location_pings')
            .select('latitude, longitude')
            .eq('medic_id', medicId)
            .eq('booking_id', bookingId)
            .gte('recorded_at', twentyMinutesAgo)
            .order('recorded_at', { ascending: true });

          if (recentPings && recentPings.length >= 10) {
            // Check if medic moved >50m from first to last ping
            const firstPing = recentPings[0];
            const lastPing = recentPings[recentPings.length - 1];
            const distanceMoved = calculateDistance(
              firstPing.latitude,
              firstPing.longitude,
              lastPing.latitude,
              lastPing.longitude
            );

            if (distanceMoved < 50) {
              // Medic hasn't moved >50m in 20 minutes
              const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
                p_medic_id: medicId,
                p_booking_id: bookingId,
                p_alert_type: 'not_moving_20min',
                p_alert_severity: 'medium',
                p_alert_title: `${medicName} - Not Moving`,
                p_alert_message: `Medic stationary for >20 minutes (moved only ${Math.round(distanceMoved)}m)`,
                p_metadata: {
                  distance_moved_meters: Math.round(distanceMoved),
                  pings_checked: recentPings.length,
                },
              });
              if (alert) alertsCreated++;
            } else {
              // Auto-resolve if medic started moving
              const resolved = await supabaseAdmin.rpc('auto_resolve_alerts', {
                p_medic_id: medicId,
                p_booking_id: bookingId,
                p_alert_types: ['not_moving_20min'],
              });
              if (resolved) alertsResolved += resolved;
            }
          }
        }
      }

      // Check 5: Late Arrival (not on-site 15 mins after shift start)
      if (shift.shift_start_time && !lastArrival) {
        const shiftStartTime = new Date(`${today}T${shift.shift_start_time}`);
        const minutesSinceShiftStart = (Date.now() - shiftStartTime.getTime()) / 1000 / 60;

        if (minutesSinceShiftStart > 15) {
          const { data: alert } = await supabaseAdmin.rpc('create_medic_alert', {
            p_medic_id: medicId,
            p_booking_id: bookingId,
            p_alert_type: 'late_arrival',
            p_alert_severity: 'high',
            p_alert_title: `${medicName} - Late Arrival`,
            p_alert_message: `Shift started ${Math.round(minutesSinceShiftStart)} minutes ago - medic not yet on-site`,
            p_metadata: {
              shift_start_time: shift.shift_start_time,
              minutes_late: Math.round(minutesSinceShiftStart),
            },
          });
          if (alert) alertsCreated++;
        }
      } else if (lastArrival) {
        // Auto-resolve late arrival if medic arrived
        const resolved = await supabaseAdmin.rpc('auto_resolve_alerts', {
          p_medic_id: medicId,
          p_booking_id: bookingId,
          p_alert_types: ['late_arrival'],
        });
        if (resolved) alertsResolved += resolved;
      }
    }

    console.log(`[AlertMonitor] Created ${alertsCreated} alerts, auto-resolved ${alertsResolved} alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        shifts_monitored: activeShifts?.length || 0,
        alerts_created: alertsCreated,
        alerts_resolved: alertsResolved,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AlertMonitor] Unexpected error:', error);
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
