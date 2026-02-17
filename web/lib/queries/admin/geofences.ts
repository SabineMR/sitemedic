/**
 * Geofence coverage analytics hook.
 *
 * Coverage = % of confirmed/in_progress bookings (from today onwards) that have
 * at least one active geofence linked to them.
 *
 * Two parallel queries:
 * 1. Active bookings: bookings with status confirmed/in_progress and shift_date >= today
 * 2. Active geofence booking IDs: geofences with is_active=true and booking_id IS NOT NULL
 *
 * Client-side Set intersection avoids double-counting bookings with multiple geofences.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

export interface GeofenceCoverage {
  /** Count of active booking sites that have at least one active geofence */
  covered: number;
  /** Count of all confirmed/in_progress bookings from today onwards */
  total: number;
  /** Math.round((covered / total) * 100), or 0 when total === 0 */
  percentage: number;
}

export async function fetchGeofenceCoverage(
  supabase: SupabaseClient,
  orgId: string
): Promise<GeofenceCoverage> {
  const today = new Date().toISOString().split('T')[0];

  const [bookingsResult, geofencesResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id')
      .eq('org_id', orgId)
      .in('status', ['confirmed', 'in_progress'])
      .gte('shift_date', today),

    supabase
      .from('geofences')
      .select('booking_id')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .not('booking_id', 'is', null),
  ]);

  if (bookingsResult.error) throw bookingsResult.error;
  if (geofencesResult.error) throw geofencesResult.error;

  const activeBookingIds = new Set(
    (bookingsResult.data ?? []).map((b) => b.id as string)
  );

  const coveredIds = new Set(
    (geofencesResult.data ?? [])
      .map((g) => g.booking_id as string)
      .filter((id) => activeBookingIds.has(id))
  );

  const total = activeBookingIds.size;
  const covered = coveredIds.size;
  const percentage = total === 0 ? 0 : Math.round((covered / total) * 100);

  return { covered, total, percentage };
}

export function useGeofenceCoverage() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'geofence-coverage', orgId],
    queryFn: () => fetchGeofenceCoverage(supabase, orgId),
    refetchInterval: 60_000,
  });
}
