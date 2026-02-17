/**
 * Timesheet Query Hooks - Admin Batch Approval
 *
 * Performance-critical hooks for Friday payout workflow.
 * Key pattern: Single bulk upsert for batch operations (NOT N individual updates).
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

// =============================================================================
// TYPES
// =============================================================================

export interface TimesheetWithDetails {
  id: string;
  booking_id: string;
  medic_id: string;
  scheduled_hours: number;
  logged_hours: number;
  discrepancy_reason: string | null;
  medic_submitted_at: string | null;
  manager_approved_at: string | null;
  manager_approved_by: string | null;
  manager_rejection_reason: string | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  admin_rejection_reason: string | null;
  payout_amount: number;
  payout_status: 'pending' | 'manager_approved' | 'admin_approved' | 'paid' | 'rejected';
  paid_at: string | null;
  stripe_transfer_id: string | null;
  medic_confirmed: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  booking: {
    site_name: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
    client: {
      company_name: string;
    };
  };
  medic: {
    first_name: string;
    last_name: string;
  };
}

export interface TimesheetFilterState {
  status: 'all' | 'pending' | 'manager_approved' | 'admin_approved' | 'paid' | 'rejected';
  weekFilter: 'current' | 'last' | 'all';
  search: string;
}

export interface PayoutSummary {
  totalPayout: number;
  medicCount: number;
  avgPerMedic: number;
}

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

/**
 * Fetch pending timesheets (ready for admin approval)
 * Returns timesheets with status 'pending' or 'manager_approved'
 * IMPORTANT: Now accepts orgId parameter for org-scoped filtering
 */
export async function fetchPendingTimesheets(
  supabase: SupabaseClient,
  orgId: string
): Promise<TimesheetWithDetails[]> {
  const { data, error } = await supabase
    .from('timesheets')
    .select(`
      *,
      booking:bookings!inner (
        site_name,
        shift_date,
        shift_start_time,
        shift_end_time,
        client:clients!inner (
          company_name
        )
      ),
      medic:medics!inner (
        first_name,
        last_name
      )
    `)
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .in('payout_status', ['pending', 'manager_approved'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending timesheets:', error);
    throw error;
  }

  return (data || []) as unknown as TimesheetWithDetails[];
}

/**
 * Fetch ALL timesheets (for overview/history view)
 * IMPORTANT: Now accepts orgId parameter for org-scoped filtering
 */
export async function fetchAllTimesheets(
  supabase: SupabaseClient,
  orgId: string
): Promise<TimesheetWithDetails[]> {
  const { data, error } = await supabase
    .from('timesheets')
    .select(`
      *,
      booking:bookings!inner (
        site_name,
        shift_date,
        shift_start_time,
        shift_end_time,
        client:clients!inner (
          company_name
        )
      ),
      medic:medics!inner (
        first_name,
        last_name
      )
    `)
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all timesheets:', error);
    throw error;
  }

  return (data || []) as unknown as TimesheetWithDetails[];
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Hook: Fetch pending timesheets with 60s polling
 * Used for the timesheet approval page
 * IMPORTANT: Now uses org context to filter timesheets
 */
export function usePendingTimesheets(initialData?: TimesheetWithDetails[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['timesheets', 'pending', orgId], // Include orgId in cache key
    queryFn: () => fetchPendingTimesheets(supabase, orgId),
    initialData,
    refetchInterval: 60000, // 60s polling (consistent with Phase 5 pattern)
    staleTime: 30000, // Consider data stale after 30s
  });
}

/**
 * Hook: Fetch all timesheets
 * Used for overview/history views
 * IMPORTANT: Now uses org context to filter timesheets
 */
export function useAllTimesheets(initialData?: TimesheetWithDetails[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['timesheets', 'all', orgId], // Include orgId in cache key
    queryFn: () => fetchAllTimesheets(supabase, orgId),
    initialData,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// =============================================================================
// MUTATION HOOKS - BATCH OPERATIONS
// =============================================================================

/**
 * CRITICAL: Batch approve timesheets using SINGLE bulk upsert
 *
 * Performance target: 20 timesheets in <5 seconds
 * Pattern: PostgreSQL bulk upsert (NOT N individual updates)
 */
export function useBatchApproveTimesheets() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async ({
      timesheetIds,
      adminUserId,
    }: {
      timesheetIds: string[];
      adminUserId: string;
    }) => {
      // Validate batch size (optimal: 500-1000 per Research)
      if (timesheetIds.length > 1000) {
        throw new Error('Batch size too large. Approve in chunks of 1000.');
      }

      if (timesheetIds.length === 0) {
        throw new Error('No timesheets selected');
      }

      // Build update array for bulk upsert
      const now = new Date().toISOString();
      const updates = timesheetIds.map((id) => ({
        id,
        payout_status: 'admin_approved' as const,
        admin_approved_at: now,
        admin_approved_by: adminUserId,
      }));

      // SINGLE database call for all updates (key performance optimization)
      const { data, error } = await supabase
        .from('timesheets')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Batch approve error:', error);
        throw error;
      }

      return { success: true, count: timesheetIds.length, data };
    },

    // Optimistic update: instantly show as approved
    onMutate: async ({ timesheetIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timesheets', 'pending', orgId] });
      await queryClient.cancelQueries({ queryKey: ['timesheets', 'all', orgId] });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<TimesheetWithDetails[]>([
        'timesheets',
        'pending',
        orgId,
      ]);
      const previousAll = queryClient.getQueryData<TimesheetWithDetails[]>([
        'timesheets',
        'all',
        orgId,
      ]);

      // Optimistically update cache
      const now = new Date().toISOString();
      const updateTimesheets = (timesheets: TimesheetWithDetails[] | undefined) =>
        timesheets?.map((t) =>
          timesheetIds.includes(t.id)
            ? {
                ...t,
                payout_status: 'admin_approved' as const,
                admin_approved_at: now,
              }
            : t
        );

      queryClient.setQueryData(
        ['timesheets', 'pending', orgId],
        updateTimesheets(previousPending)
      );
      queryClient.setQueryData(['timesheets', 'all', orgId], updateTimesheets(previousAll));

      // Return context for rollback
      return { previousPending, previousAll };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      console.error('Batch approve failed:', err);
      if (context?.previousPending) {
        queryClient.setQueryData(['timesheets', 'pending', orgId], context.previousPending);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['timesheets', 'all', orgId], context.previousAll);
      }
      // TODO: Add toast notification when toast library is set up
    },

    // Success notification
    onSuccess: (data) => {
      console.log(`Successfully approved ${data.count} timesheet${data.count === 1 ? '' : 's'} for payout`);
      // TODO: Add toast notification when toast library is set up
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'pending', orgId] });
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'all', orgId] });
    },
  });
}

/**
 * Batch reject timesheets with rejection reason
 * Similar pattern to batch approve
 */
export function useBatchRejectTimesheets() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async ({
      timesheetIds,
      adminUserId,
      rejectionReason,
    }: {
      timesheetIds: string[];
      adminUserId: string;
      rejectionReason: string;
    }) => {
      // Validate batch size
      if (timesheetIds.length > 1000) {
        throw new Error('Batch size too large. Reject in chunks of 1000.');
      }

      if (timesheetIds.length === 0) {
        throw new Error('No timesheets selected');
      }

      if (!rejectionReason.trim()) {
        throw new Error('Rejection reason is required');
      }

      // Build update array for bulk upsert
      const now = new Date().toISOString();
      const updates = timesheetIds.map((id) => ({
        id,
        payout_status: 'rejected' as const,
        admin_approved_at: now,
        admin_approved_by: adminUserId,
        admin_rejection_reason: rejectionReason,
      }));

      // SINGLE database call
      const { data, error } = await supabase
        .from('timesheets')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Batch reject error:', error);
        throw error;
      }

      return { success: true, count: timesheetIds.length, data };
    },

    // Optimistic update
    onMutate: async ({ timesheetIds, rejectionReason }) => {
      await queryClient.cancelQueries({ queryKey: ['timesheets', 'pending', orgId] });
      await queryClient.cancelQueries({ queryKey: ['timesheets', 'all', orgId] });

      const previousPending = queryClient.getQueryData<TimesheetWithDetails[]>([
        'timesheets',
        'pending',
        orgId,
      ]);
      const previousAll = queryClient.getQueryData<TimesheetWithDetails[]>([
        'timesheets',
        'all',
        orgId,
      ]);

      const now = new Date().toISOString();
      const updateTimesheets = (timesheets: TimesheetWithDetails[] | undefined) =>
        timesheets?.map((t) =>
          timesheetIds.includes(t.id)
            ? {
                ...t,
                payout_status: 'rejected' as const,
                admin_approved_at: now,
                admin_rejection_reason: rejectionReason,
              }
            : t
        );

      queryClient.setQueryData(
        ['timesheets', 'pending', orgId],
        updateTimesheets(previousPending)
      );
      queryClient.setQueryData(['timesheets', 'all', orgId], updateTimesheets(previousAll));

      return { previousPending, previousAll };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      console.error('Batch reject failed:', err);
      if (context?.previousPending) {
        queryClient.setQueryData(['timesheets', 'pending', orgId], context.previousPending);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['timesheets', 'all', orgId], context.previousAll);
      }
      // TODO: Add toast notification when toast library is set up
    },

    // Success notification
    onSuccess: (data) => {
      console.log(`Rejected ${data.count} timesheet${data.count === 1 ? '' : 's'}`);
      // TODO: Add toast notification when toast library is set up
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'pending', orgId] });
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'all', orgId] });
    },
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate payout summary for selected timesheets
 * Pure function - no side effects
 */
export function calculatePayoutSummary(
  timesheets: TimesheetWithDetails[]
): PayoutSummary {
  if (!timesheets || timesheets.length === 0) {
    return {
      totalPayout: 0,
      medicCount: 0,
      avgPerMedic: 0,
    };
  }

  const totalPayout = timesheets.reduce((sum, t) => sum + t.payout_amount, 0);
  const uniqueMedicIds = new Set(timesheets.map((t) => t.medic_id));
  const medicCount = uniqueMedicIds.size;
  const avgPerMedic = medicCount > 0 ? totalPayout / medicCount : 0;

  return {
    totalPayout,
    medicCount,
    avgPerMedic,
  };
}
