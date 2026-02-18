/**
 * Near-Miss Geo Query Hooks - Analytics Heat Map
 *
 * Fetches near-miss incidents that have GPS coordinates for display on the heat map.
 * RLS policies handle org-level filtering — no explicit org_id WHERE clause needed.
 *
 * Patterns:
 * - TanStack Query with staleTime for efficient caching
 * - Only returns records with non-null GPS coordinates
 * - Ordered by created_at desc, limited to 500 most recent (org) / 1000 (admin)
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

export interface AdminNearMissGeoPoint {
  id: string;
  gps_lat: number;
  gps_lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string | null;
  created_at: string;
  org_id: string;
  org_name: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Deterministic colour palette for org colour-coding (cycles via index % length)
const ORG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

// =============================================================================
// QUERY HOOKS
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

/**
 * useAdminNearMissGeoData - Fetch near-miss incidents across ALL organisations
 *
 * Platform admin view — RLS migration 107 grants platform_admin role SELECT
 * on all near_misses rows without org_id restriction.
 *
 * Returns points enriched with org_name, plus an orgColorMap for colour-coding
 * so the component doesn't need to recompute it on every render.
 */
export function useAdminNearMissGeoData() {
  const supabase = createClient();

  return useQuery<{
    data: AdminNearMissGeoPoint[];
    orgColorMap: Map<string, string>;
  }>({
    queryKey: ['admin-near-miss-geo'],
    queryFn: async () => {
      // Step 1: Fetch near_misses GPS data for all orgs (platform admin RLS)
      const { data: nearMisses, error: nearMissError } = await supabase
        .from('near_misses')
        .select('id, gps_lat, gps_lng, severity, category, description, created_at, org_id')
        .not('gps_lat', 'is', null)
        .not('gps_lng', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (nearMissError) {
        console.error('Error fetching admin near-miss geo data:', nearMissError);
        throw nearMissError;
      }

      const rows = nearMisses ?? [];

      // Step 2: Get unique org_ids from the result
      const uniqueOrgIds = [...new Set(rows.map((r) => r.org_id).filter(Boolean))];

      // Step 3: Fetch org names from organizations table
      const orgNameMap = new Map<string, string>();
      if (uniqueOrgIds.length > 0) {
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', uniqueOrgIds);

        if (orgsError) {
          console.error('Error fetching org names for admin heat map:', orgsError);
          // Non-fatal — continue with unknown org names
        } else {
          (orgs ?? []).forEach((org) => {
            orgNameMap.set(org.id, org.name);
          });
        }
      }

      // Step 4: Build orgColorMap — sorted unique org_ids get deterministic colours
      const sortedOrgIds = [...uniqueOrgIds].sort();
      const orgColorMap = new Map<string, string>();
      sortedOrgIds.forEach((orgId, index) => {
        orgColorMap.set(orgId, ORG_COLORS[index % ORG_COLORS.length]);
      });

      // Step 5: Map near_misses data with org_name
      const enrichedData: AdminNearMissGeoPoint[] = rows.map((r) => ({
        id: r.id,
        gps_lat: r.gps_lat,
        gps_lng: r.gps_lng,
        severity: r.severity as AdminNearMissGeoPoint['severity'],
        category: r.category,
        description: r.description,
        created_at: r.created_at,
        org_id: r.org_id,
        org_name: orgNameMap.get(r.org_id) ?? 'Unknown Organisation',
      }));

      return { data: enrichedData, orgColorMap };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
