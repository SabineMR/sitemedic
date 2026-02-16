/**
 * Booking query hooks and mutation functions for admin
 *
 * Server-side data fetching for initial page load, client-side hooks for 60-second polling.
 * Mutations use optimistic updates for instant UI feedback with rollback on error.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
export interface BookingWithRelations {
  id: string;
  client_id: string;
  medic_id: string | null;
  site_name: string;
  site_address: string;
  site_postcode: string;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  base_rate: number;
  urgency_premium_percent: number;
  travel_surcharge: number;
  out_of_territory_cost: number;
  out_of_territory_type: string | null;
  subtotal: number;
  vat: number;
  total: number;
  platform_fee: number;
  medic_payout: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  requires_manual_approval: boolean;
  approval_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  special_notes: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurring_until: string | null;
  parent_booking_id: string | null;
  auto_matched: boolean;
  match_score: number | null;
  match_criteria: any;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  refund_amount: number;
  created_at: string;
  updated_at: string;
  // Joined relations
  clients?: {
    company_name: string;
  };
  medics?: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface AvailableMedic {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;
  star_rating: number;
  available_for_work: boolean;
}

// Server-side: Fetch bookings with client and medic joins
export async function fetchBookings(supabase: SupabaseClient): Promise<BookingWithRelations[]> {
  // Filter out old cancelled bookings for performance (>30 days old)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      clients (
        company_name
      ),
      medics (
        first_name,
        last_name
      )
    `
    )
    .or(`status.neq.cancelled,cancelled_at.gte.${thirtyDaysAgo.toISOString()}`)
    .order('shift_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as BookingWithRelations[]) || [];
}

// Server-side: Fetch available medics for reassignment
export async function fetchAvailableMedics(
  supabase: SupabaseClient,
  shiftDate: string
): Promise<AvailableMedic[]> {
  const { data, error } = await supabase
    .from('medics')
    .select('id, first_name, last_name, email, phone, has_confined_space_cert, has_trauma_cert, star_rating, available_for_work')
    .eq('available_for_work', true)
    .order('star_rating', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Client-side: useBookings hook with 60-second polling
export function useBookings(initialData?: BookingWithRelations[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => fetchBookings(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds polling
  });
}

// Client-side: Approve bookings mutation with optimistic updates
export function useApproveBookings() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (bookingIds: string[]) => {
      // Bulk update using single .in() query (not loops - avoid N+1 pitfall)
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          approved_at: new Date().toISOString(),
        })
        .in('id', bookingIds)
        .select();

      if (error) throw error;
      return data;
    },

    // Optimistic update: instant UI feedback
    onMutate: async (bookingIds) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-bookings'] });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData<BookingWithRelations[]>(['admin-bookings']);

      // Optimistically update cache
      queryClient.setQueryData<BookingWithRelations[]>(['admin-bookings'], (old) =>
        old?.map((booking) =>
          bookingIds.includes(booking.id)
            ? { ...booking, status: 'confirmed' as const, approved_at: new Date().toISOString() }
            : booking
        )
      );

      return { previousBookings };
    },

    // Rollback on error
    onError: (err, bookingIds, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['admin-bookings'], context.previousBookings);
      }
      console.error('Failed to approve bookings:', err);
    },

    // Refetch after mutation settles
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}

// Client-side: Reject bookings mutation with optimistic updates
export function useRejectBookings() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ bookingIds, reason }: { bookingIds: string[]; reason: string }) => {
      // Bulk update using single .in() query
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .in('id', bookingIds)
        .select();

      if (error) throw error;
      return data;
    },

    // Optimistic update
    onMutate: async ({ bookingIds, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-bookings'] });

      const previousBookings = queryClient.getQueryData<BookingWithRelations[]>(['admin-bookings']);

      queryClient.setQueryData<BookingWithRelations[]>(['admin-bookings'], (old) =>
        old?.map((booking) =>
          bookingIds.includes(booking.id)
            ? {
                ...booking,
                status: 'cancelled' as const,
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason,
              }
            : booking
        )
      );

      return { previousBookings };
    },

    onError: (err, variables, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['admin-bookings'], context.previousBookings);
      }
      console.error('Failed to reject bookings:', err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}

// Client-side: Reassign booking mutation
export function useReassignBooking() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      newMedicId,
      reason,
    }: {
      bookingId: string;
      newMedicId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          medic_id: newMedicId,
          approval_reason: reason,
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Optimistic update for single booking
    onMutate: async ({ bookingId, newMedicId, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-bookings'] });

      const previousBookings = queryClient.getQueryData<BookingWithRelations[]>(['admin-bookings']);

      queryClient.setQueryData<BookingWithRelations[]>(['admin-bookings'], (old) =>
        old?.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                medic_id: newMedicId,
                approval_reason: reason,
              }
            : booking
        )
      );

      return { previousBookings };
    },

    onError: (err, variables, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['admin-bookings'], context.previousBookings);
      }
      console.error('Failed to reassign booking:', err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}

// Client-side: Fetch available medics for dropdown
export function useAvailableMedics(shiftDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['available-medics', shiftDate],
    queryFn: () => fetchAvailableMedics(supabase, shiftDate),
    enabled: !!shiftDate, // Only fetch when shift date is provided
  });
}
