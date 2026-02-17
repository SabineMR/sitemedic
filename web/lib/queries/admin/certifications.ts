/**
 * Admin Certifications Query Hooks
 *
 * TanStack Query hooks for fetching certification data with expiry tracking,
 * compliance summaries, and real-time updates.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';
import type { CertificationSummary, Certification } from '@/types/certification.types';
import { parseISO, differenceInDays, isPast, isFuture } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface ExpiringCertificationWithMedic {
  medic_id: string;
  medic_name: string;
  cert_type: string;
  cert_number: string;
  expiry_date: string;
  days_remaining: number;
  status: 'valid' | 'expiring-soon' | 'expired';
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Fetch certification summary for all medics in org.
 * Uses RPC function get_certification_summary_by_org().
 */
export async function fetchCertificationSummary(
  supabase: SupabaseClient,
  orgId: string
): Promise<CertificationSummary[]> {
  const { data, error } = await supabase
    .rpc('get_certification_summary_by_org', { p_org_id: orgId });

  if (error) {
    console.error('Error fetching certification summary:', error);
    throw error;
  }

  return (data || []) as CertificationSummary[];
}

/**
 * Fetch certifications expiring within a specific time window.
 * Client-side filtering of medics.certifications JSONB.
 */
export async function fetchExpiringCertifications(
  supabase: SupabaseClient,
  orgId: string,
  daysWindow: number
): Promise<ExpiringCertificationWithMedic[]> {
  // Fetch all medics with certifications for this org
  const { data: medics, error } = await supabase
    .from('medics')
    .select('id, first_name, last_name, email, certifications')
    .eq('org_id', orgId)
    .not('certifications', 'eq', '[]');

  if (error) {
    console.error('Error fetching medics for expiring certs:', error);
    throw error;
  }

  if (!medics || medics.length === 0) {
    return [];
  }

  const today = new Date();
  const results: ExpiringCertificationWithMedic[] = [];

  // Parse each medic's certifications
  for (const medic of medics) {
    const certs = medic.certifications as Certification[];
    if (!certs || certs.length === 0) continue;

    for (const cert of certs) {
      if (!cert.expiry_date) continue;

      const expiryDate = parseISO(cert.expiry_date);
      const daysRemaining = differenceInDays(expiryDate, today);

      // Filter based on time window
      let include = false;
      let status: 'valid' | 'expiring-soon' | 'expired' = 'valid';

      if (isPast(expiryDate)) {
        // For "Expired" tab: include all expired
        include = daysWindow === -1;
        status = 'expired';
      } else if (daysRemaining <= daysWindow && isFuture(expiryDate)) {
        // For time windows: include if within window
        include = true;
        status = daysRemaining <= 30 ? 'expiring-soon' : 'valid';
      }

      if (include) {
        results.push({
          medic_id: medic.id,
          medic_name: `${medic.first_name} ${medic.last_name}`,
          cert_type: cert.type,
          cert_number: cert.cert_number,
          expiry_date: cert.expiry_date,
          days_remaining: daysRemaining,
          status,
        });
      }
    }
  }

  // Sort by days_remaining ascending (most urgent first)
  results.sort((a, b) => a.days_remaining - b.days_remaining);

  return results;
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * Query hook for certification summary by org.
 *
 * Features:
 * - 60-second polling for real-time updates
 * - Org-scoped filtering
 */
export function useCertificationSummary() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'certifications', 'summary', orgId],
    queryFn: () => fetchCertificationSummary(supabase, orgId),
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000, // Consider data fresh for 30s
  });
}

/**
 * Query hook for expiring certifications within a time window.
 *
 * @param daysWindow - Number of days to look ahead (30, 60, 90) or -1 for expired
 */
export function useExpiringCertifications(daysWindow: number) {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'certifications', 'expiring', orgId, daysWindow],
    queryFn: () => fetchExpiringCertifications(supabase, orgId, daysWindow),
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000,
  });
}
