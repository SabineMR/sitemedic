/**
 * Client-side booking queries for the client portal
 *
 * Fetches bookings scoped to the current client's user_id.
 * Uses org_id filtering and RLS for multi-tenant security.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';

export interface ClientBooking {
  id: string;
  site_name: string;
  site_address: string;
  site_postcode: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  base_rate: number;
  subtotal: number;
  vat: number;
  total: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  special_notes: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
  medics?: {
    first_name: string;
    last_name: string;
    star_rating: number;
  } | null;
}

/**
 * Fetch bookings for the current authenticated client
 */
async function fetchClientBookings(orgId: string): Promise<ClientBooking[]> {
  const supabase = createClient();

  // Get the current user's ID to find their client record
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Find the client record linked to this user
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (clientError || !clientRecord) {
    // Client may not have a linked record yet
    return [];
  }

  // Fetch bookings for this client
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      site_name,
      site_address,
      site_postcode,
      shift_date,
      shift_start_time,
      shift_end_time,
      shift_hours,
      base_rate,
      subtotal,
      vat,
      total,
      status,
      special_notes,
      is_recurring,
      recurrence_pattern,
      created_at,
      medics (
        first_name,
        last_name,
        star_rating
      )
    `
    )
    .eq('client_id', clientRecord.id)
    .eq('org_id', orgId)
    .order('shift_date', { ascending: false });

  if (error) throw error;

  return (data as ClientBooking[]) || [];
}

/**
 * React Query hook for client bookings with 60s polling
 */
export function useClientBookings() {
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['client-bookings', orgId],
    queryFn: () => fetchClientBookings(orgId),
    refetchInterval: 60_000,
  });
}

/**
 * Fetch a single booking by ID for the client
 */
async function fetchClientBookingDetail(
  orgId: string,
  bookingId: string
): Promise<ClientBooking | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Find client record
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (clientError || !clientRecord) return null;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      site_name,
      site_address,
      site_postcode,
      shift_date,
      shift_start_time,
      shift_end_time,
      shift_hours,
      base_rate,
      subtotal,
      vat,
      total,
      status,
      special_notes,
      is_recurring,
      recurrence_pattern,
      created_at,
      medics (
        first_name,
        last_name,
        star_rating
      )
    `
    )
    .eq('id', bookingId)
    .eq('client_id', clientRecord.id)
    .eq('org_id', orgId)
    .single();

  if (error) return null;

  return data as ClientBooking;
}

/**
 * React Query hook for a single client booking
 */
export function useClientBookingDetail(bookingId: string) {
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['client-booking', orgId, bookingId],
    queryFn: () => fetchClientBookingDetail(orgId, bookingId),
    enabled: !!bookingId,
  });
}
