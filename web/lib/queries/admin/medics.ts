/**
 * Admin Medics Query Hooks
 *
 * TanStack Query hooks for fetching medic roster with utilization metrics,
 * territory assignments, and availability management.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

// =============================================================================
// TYPES
// =============================================================================

export interface TerritoryAssignment {
  postcode_sector: string;
  region: string;
  role: 'primary' | 'secondary';
}

export interface MedicWithMetrics {
  // Core medic fields
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  home_postcode: string;
  home_address: string;

  // Certifications
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;

  // Stripe
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;

  // Employment
  employment_status: 'self_employed' | 'umbrella';

  // Performance
  star_rating: number;
  total_shifts_completed: number;
  total_shifts_cancelled: number;
  riddor_compliance_rate: number;

  // Availability
  available_for_work: boolean;
  unavailable_reason: string | null;
  unavailable_until: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Computed metrics
  utilization_pct: number; // 0-100
  territory_assignments: TerritoryAssignment[];
  upcoming_bookings_count: number;
  completed_bookings_this_week: number;
}

interface UpdateAvailabilityParams {
  medicId: string;
  available: boolean;
  reason?: string;
  unavailableUntil?: string; // ISO date string
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Fetch all medics with utilization metrics and territory assignments.
 * IMPORTANT: Now accepts orgId parameter for org-scoped filtering.
 *
 * Utilization calculation:
 * - Count confirmed/in_progress bookings this week
 * - Divide by 5 working days
 * - Multiply by 100 for percentage
 *
 * Uses parallel queries to avoid N+1 issues.
 */
export async function fetchMedicsWithMetrics(supabase: SupabaseClient, orgId: string): Promise<MedicWithMetrics[]> {
  // Get start and end of current week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Fetch all medics for this org
  const { data: medics, error: medicsError } = await supabase
    .from('medics')
    .select('*')
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .order('last_name', { ascending: true });

  if (medicsError) {
    console.error('Error fetching medics:', medicsError);
    throw medicsError;
  }

  if (!medics || medics.length === 0) {
    return [];
  }

  const medicIds = medics.map(m => m.id);

  // Fetch all data in parallel to avoid N+1 queries
  const [territoriesResult, bookingsThisWeekResult, upcomingBookingsResult] = await Promise.all([
    // 1. Fetch territory assignments for this org
    supabase
      .from('territories')
      .select('postcode_sector, region, primary_medic_id, secondary_medic_id')
      .eq('org_id', orgId) // CRITICAL: Filter by org_id
      .or(`primary_medic_id.in.(${medicIds.join(',')}),secondary_medic_id.in.(${medicIds.join(',')})`),

    // 2. Fetch bookings this week for this org (for utilization calculation)
    supabase
      .from('bookings')
      .select('medic_id, status, shift_date')
      .eq('org_id', orgId) // CRITICAL: Filter by org_id
      .in('medic_id', medicIds)
      .in('status', ['confirmed', 'in_progress'])
      .gte('shift_date', monday.toISOString().split('T')[0])
      .lte('shift_date', sunday.toISOString().split('T')[0]),

    // 3. Fetch upcoming bookings for this org (future bookings)
    supabase
      .from('bookings')
      .select('medic_id, status, shift_date')
      .eq('org_id', orgId) // CRITICAL: Filter by org_id
      .in('medic_id', medicIds)
      .in('status', ['confirmed', 'in_progress', 'pending'])
      .gte('shift_date', now.toISOString().split('T')[0])
  ]);

  // Process territories data
  const territoriesByMedic = new Map<string, TerritoryAssignment[]>();
  if (territoriesResult.data) {
    territoriesResult.data.forEach(territory => {
      if (territory.primary_medic_id) {
        if (!territoriesByMedic.has(territory.primary_medic_id)) {
          territoriesByMedic.set(territory.primary_medic_id, []);
        }
        territoriesByMedic.get(territory.primary_medic_id)!.push({
          postcode_sector: territory.postcode_sector,
          region: territory.region,
          role: 'primary'
        });
      }
      if (territory.secondary_medic_id) {
        if (!territoriesByMedic.has(territory.secondary_medic_id)) {
          territoriesByMedic.set(territory.secondary_medic_id, []);
        }
        territoriesByMedic.get(territory.secondary_medic_id)!.push({
          postcode_sector: territory.postcode_sector,
          region: territory.region,
          role: 'secondary'
        });
      }
    });
  }

  // Process bookings data - group by medic_id
  const bookingsThisWeekByMedic = new Map<string, number>();
  if (bookingsThisWeekResult.data) {
    bookingsThisWeekResult.data.forEach(booking => {
      if (booking.medic_id) {
        bookingsThisWeekByMedic.set(
          booking.medic_id,
          (bookingsThisWeekByMedic.get(booking.medic_id) || 0) + 1
        );
      }
    });
  }

  const upcomingBookingsByMedic = new Map<string, number>();
  if (upcomingBookingsResult.data) {
    upcomingBookingsResult.data.forEach(booking => {
      if (booking.medic_id) {
        upcomingBookingsByMedic.set(
          booking.medic_id,
          (upcomingBookingsByMedic.get(booking.medic_id) || 0) + 1
        );
      }
    });
  }

  // Combine all data
  return medics.map(medic => {
    const completedThisWeek = bookingsThisWeekByMedic.get(medic.id) || 0;
    const utilizationPct = Math.min(100, (completedThisWeek / 5) * 100); // Cap at 100%

    return {
      ...medic,
      utilization_pct: Math.round(utilizationPct),
      territory_assignments: territoriesByMedic.get(medic.id) || [],
      upcoming_bookings_count: upcomingBookingsByMedic.get(medic.id) || 0,
      completed_bookings_this_week: completedThisWeek
    };
  });
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * Query hook for medics with metrics.
 * IMPORTANT: Now uses org context to filter medics.
 *
 * Features:
 * - 60-second polling for real-time updates
 * - Optimistic updates via mutations
 * - Initial data support for server-side rendering
 */
export function useMedics(initialData?: MedicWithMetrics[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['admin', 'medics', 'with-metrics', orgId], // Include orgId in cache key
    queryFn: () => fetchMedicsWithMetrics(supabase, orgId),
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000, // Consider data fresh for 30s
    initialData,
  });
}

/**
 * Mutation hook to update medic availability.
 *
 * Features:
 * - Optimistic updates
 * - Automatic refetch on success
 */
export function useUpdateMedicAvailability() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async (params: UpdateAvailabilityParams) => {
      const updateData: any = {
        available_for_work: params.available,
      };

      if (!params.available) {
        updateData.unavailable_reason = params.reason || null;
        updateData.unavailable_until = params.unavailableUntil || null;
      } else {
        // Clear unavailable fields when making available
        updateData.unavailable_reason = null;
        updateData.unavailable_until = null;
      }

      const { data, error } = await supabase
        .from('medics')
        .update(updateData)
        .eq('id', params.medicId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'medics', 'with-metrics', orgId] });

      // Snapshot previous value
      const previousMedics = queryClient.getQueryData<MedicWithMetrics[]>(['admin', 'medics', 'with-metrics', orgId]);

      // Optimistically update
      if (previousMedics) {
        queryClient.setQueryData<MedicWithMetrics[]>(
          ['admin', 'medics', 'with-metrics', orgId],
          previousMedics.map(medic =>
            medic.id === params.medicId
              ? {
                  ...medic,
                  available_for_work: params.available,
                  unavailable_reason: params.available ? null : (params.reason || medic.unavailable_reason),
                  unavailable_until: params.available ? null : (params.unavailableUntil || medic.unavailable_until),
                }
              : medic
          )
        );
      }

      return { previousMedics };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousMedics) {
        queryClient.setQueryData(['admin', 'medics', 'with-metrics', orgId], context.previousMedics);
      }
      console.error('Error updating medic availability:', err);
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin', 'medics', 'with-metrics', orgId] });
    },
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get color class for utilization percentage.
 *
 * - Green: < 50% (plenty of capacity)
 * - Yellow: 50-80% (moderate load)
 * - Red: > 80% (high utilization, approaching capacity)
 */
export function getUtilizationColor(pct: number): string {
  if (pct < 50) return 'bg-green-400';
  if (pct <= 80) return 'bg-yellow-400';
  return 'bg-red-400';
}

/**
 * Get text color for utilization percentage.
 */
export function getUtilizationTextColor(pct: number): string {
  if (pct < 50) return 'text-green-400';
  if (pct <= 80) return 'text-yellow-400';
  return 'text-red-400';
}
