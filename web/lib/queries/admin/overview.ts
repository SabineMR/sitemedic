/**
 * Admin Overview Query Hooks
 *
 * Real-time metrics for admin dashboard:
 * - Active medics count
 * - Today's bookings
 * - Pending bookings requiring action
 * - Issues requiring manual approval
 * - Monthly revenue (platform fees)
 * - Weekly payouts to medics
 * - Recent activity feed
 */

import { useQuery } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Admin overview metrics
 */
export interface AdminOverview {
  activeMedics: number;
  todayBookings: number;
  pendingBookings: number;
  issuesCount: number;
  totalRevenue: number; // GBP
  weeklyPayouts: number; // GBP
  recentActivity: RecentActivity[];
}

/**
 * Recent activity item
 */
export interface RecentActivity {
  id: string;
  type: 'booking' | 'issue' | 'medic' | 'payment';
  message: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
  amount?: number; // For payment activities
}

/**
 * Fetch admin overview metrics from database
 */
export async function fetchAdminOverview(
  supabaseClient: SupabaseClient
): Promise<AdminOverview> {
  // Run all queries in parallel
  const [
    medicCount,
    todayCount,
    pendingCount,
    issuesCount,
    revenue,
    payouts,
    recentBookings,
  ] = await Promise.all([
    // Active medics count
    supabaseClient
      .from('medics')
      .select('id', { count: 'exact', head: true })
      .eq('available_for_work', true),

    // Today's bookings
    supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('shift_date', new Date().toISOString().split('T')[0]),

    // Pending bookings
    supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Issues requiring manual approval
    supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('requires_manual_approval', true)
      .eq('status', 'pending'),

    // Total revenue this month (platform fees)
    supabaseClient
      .from('bookings')
      .select('platform_fee')
      .eq('status', 'completed')
      .gte(
        'created_at',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),

    // Weekly payouts (last 7 days)
    supabaseClient
      .from('timesheets')
      .select('payout_amount')
      .eq('payout_status', 'paid')
      .gte('paid_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Recent bookings for activity feed
    supabaseClient
      .from('bookings')
      .select('id, site_name, status, total, created_at, site_postcode')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Calculate totals
  const totalRevenue = (revenue.data || []).reduce(
    (sum, booking) => sum + (booking.platform_fee || 0),
    0
  );
  const weeklyPayouts = (payouts.data || []).reduce(
    (sum, timesheet) => sum + (timesheet.payout_amount || 0),
    0
  );

  // Map recent bookings to activity format
  const recentActivity: RecentActivity[] = (recentBookings.data || []).map((booking) => {
    const timestamp = new Date(booking.created_at);
    const timeAgo = getTimeAgo(timestamp);

    let type: RecentActivity['type'] = 'booking';
    let status: RecentActivity['status'] = 'success';
    let message = '';

    switch (booking.status) {
      case 'confirmed':
        message = `New booking confirmed - ${booking.site_name} (${booking.site_postcode})`;
        status = 'success';
        break;
      case 'cancelled':
        message = `Booking cancelled - ${booking.site_name}`;
        status = 'error';
        break;
      case 'pending':
        message = `New booking pending - ${booking.site_name} (${booking.site_postcode})`;
        status = 'warning';
        break;
      case 'completed':
        message = `Booking completed - ${booking.site_name}`;
        status = 'success';
        type = 'payment';
        break;
      default:
        message = `Booking ${booking.status} - ${booking.site_name}`;
    }

    return {
      id: booking.id,
      type,
      message,
      timestamp: timeAgo,
      status,
      amount: booking.status === 'completed' ? booking.total : undefined,
    };
  });

  return {
    activeMedics: medicCount.count || 0,
    todayBookings: todayCount.count || 0,
    pendingBookings: pendingCount.count || 0,
    issuesCount: issuesCount.count || 0,
    totalRevenue,
    weeklyPayouts,
    recentActivity,
  };
}

/**
 * TanStack Query hook for admin overview with 60s polling
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => fetchAdminOverview(supabase),
    refetchInterval: 60000, // 60 seconds
  });
}

/**
 * Convert timestamp to "X minutes/hours ago" format
 */
function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
