/**
 * React Query Hooks for Marketplace Roster
 * Phase 37: Company Accounts — Plan 01
 *
 * Hooks for fetching and caching roster data:
 *   - useCompanyRoster: Fetch roster medics for a company
 *   - useCompanyProfile: Fetch company profile with team preview
 *
 * Follows the same pattern as useQuoteList (Phase 34).
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { CompanyRosterMedicWithDetails, CompanyProfileDisplay } from '@/lib/marketplace/roster-types';

// =============================================================================
// Response Interfaces
// =============================================================================

export interface RosterListResponse {
  roster: CompanyRosterMedicWithDetails[];
}

export interface CompanyProfileResponse {
  profile: CompanyProfileDisplay;
}

// =============================================================================
// Hook: Fetch Company Roster
// =============================================================================

/**
 * Fetch roster medics for a company with optional status filter.
 * Used in company admin roster management views.
 *
 * @param companyId - UUID of the company
 * @param statusFilter - Filter by status (default: 'active')
 * @returns useQuery hook with RosterListResponse
 */
export function useCompanyRoster(companyId: string | undefined, statusFilter?: string) {
  return useQuery<RosterListResponse>({
    queryKey: ['company-roster', companyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/marketplace/roster?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch roster');
      }
      return res.json();
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

// =============================================================================
// Hook: Fetch Company Profile
// =============================================================================

/**
 * Fetch company profile with denormalized aggregations and team preview.
 * Used on company profile pages for public display.
 *
 * @param companyId - UUID of the company
 * @returns useQuery hook with CompanyProfileResponse
 */
export function useCompanyProfile(companyId: string | undefined) {
  return useQuery<CompanyProfileResponse>({
    queryKey: ['company-profile', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/companies/${companyId}/profile`);
      if (!res.ok) {
        throw new Error('Failed to fetch company profile');
      }
      return res.json();
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}
