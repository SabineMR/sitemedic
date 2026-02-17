'use client';

import { useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface GeofenceEntry {
  id: string;
  booking_id: string | null;
  org_id: string | null;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  site_name: string | null;
}

/**
 * Haversine formula: returns straight-line distance in metres between two
 * latitude/longitude points. Used to check whether a medic ping falls outside
 * their assigned geofence circle.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * useGeofenceExitMonitor
 *
 * Loads active geofences once (context-at-subscribe pattern, D-10-01-004) into
 * an in-memory Map keyed by booking_id, then exposes a checkPing() function that
 * is called on every medic_location_pings INSERT. If the medic is outside their
 * geofence radius the hook calls the create_medic_alert() RPC (migration 008)
 * which includes 15-minute deduplication so repeated out-of-bounds pings do not
 * flood the alerts panel.
 */
export function useGeofenceExitMonitor() {
  const geofencesByBooking = useRef(new Map<string, GeofenceEntry>());
  const supabase = createClient();

  const loadGeofences = useCallback(async () => {
    const { data } = await supabase
      .from('geofences')
      .select('id, booking_id, org_id, center_latitude, center_longitude, radius_meters, site_name')
      .eq('is_active', true);

    geofencesByBooking.current.clear();
    (data || []).forEach((g: GeofenceEntry) => {
      if (g.booking_id) {
        geofencesByBooking.current.set(g.booking_id, g);
      }
    });
  }, [supabase]);

  const checkPing = useCallback(async (
    medicId: string,
    bookingId: string,
    medicName: string,
    siteName: string,
    latitude: number,
    longitude: number,
    pingId?: string
  ) => {
    const geofence = geofencesByBooking.current.get(bookingId);
    if (!geofence) return;

    const distance = haversineMeters(latitude, longitude, geofence.center_latitude, geofence.center_longitude);
    if (distance > geofence.radius_meters) {
      const { error } = await supabase.rpc('create_medic_alert', {
        p_medic_id: medicId,
        p_booking_id: bookingId,
        p_alert_type: 'geofence_failure',
        p_alert_severity: 'high',
        p_alert_title: 'Medic Outside Geofence',
        p_alert_message: `${medicName} is ${Math.round(distance)}m outside the ${geofence.radius_meters}m boundary for ${siteName}`,
        p_metadata: { distance_meters: Math.round(distance), geofence_radius: geofence.radius_meters, lat: latitude, lng: longitude },
        p_related_ping_id: pingId ?? null,
      });
      if (error) console.error('Geofence alert RPC failed:', error);
    }
  }, [supabase]);

  return { loadGeofences, checkPing };
}
