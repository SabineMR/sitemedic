/**
 * Near-Miss Geo Query Hook - Analytics Heat Map
 *
 * Fetches near-miss incidents that have GPS coordinates for display on the heat map.
 * RLS policies handle org-level filtering — no explicit org_id WHERE clause needed.
 *
 * Patterns:
 * - TanStack Query with staleTime for efficient caching
 * - Only returns records with non-null GPS coordinates
 * - Ordered by created_at desc, limited to 500 most recent
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface NearMissGeoPoint {
  id: string;
  gps_lat: number;
  gps_lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string | null;
  created_at: string;
}

// =============================================================================
// QUERY HOOK
// =============================================================================

/**
 * useNearMissGeoData - Fetch near-miss incidents with GPS coordinates
 *
 * Returns only records where gps_lat and gps_lng are non-null.
 * RLS enforces org-level access — site managers see only their org's incidents.
 */
export function useNearMissGeoData() {
  const supabase = createClient();

  return useQuery<NearMissGeoPoint[]>({
    queryKey: ['near-miss-geo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('near_misses')
        .select('id, gps_lat, gps_lng, severity, category, description, created_at')
        .not('gps_lat', 'is', null)
        .not('gps_lng', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching near-miss geo data:', error);
        throw error;
      }

      return (data ?? []) as NearMissGeoPoint[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
