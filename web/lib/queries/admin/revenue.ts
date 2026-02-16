/**
 * Revenue Query Hooks - Admin Financial Dashboard
 *
 * Performance-critical hooks for revenue tracking and cash flow analysis.
 * Key patterns:
 * - Aggregate bookings/payments data client-side (datasets are small enough)
 * - Calculate cash flow gap based on Net 30 payment terms vs weekly medic payouts
 * - Handle empty data gracefully (all functions return 0/empty arrays, not null/undefined)
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface WeeklyRevenue {
  week: string; // ISO week label like "W7 2026"
  revenue: number; // Total booking value
  payouts: number; // Total medic payouts
  platformFees: number; // Platform fees
  gap: number; // Cumulative cash flow gap
}

export interface TerritoryRevenue {
  postcode_sector: string;
  region: string;
  revenue: number;
  platformFees: number;
  bookingCount: number;
}

export interface MedicRevenue {
  medic_id: string;
  medic_name: string;
  totalEarnings: number;
  shiftsCompleted: number;
  avgPerShift: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalPayouts: number;
  totalPlatformFees: number;
  avgCollectionDays: number;
  activeClients: number;
  net30Clients: number;
}

export interface RevenueData {
  weeklyTrend: WeeklyRevenue[];
  territoryBreakdown: TerritoryRevenue[];
  medicEarnings: MedicRevenue[];
  summary: RevenueSummary;
}

export interface CashFlowWarning {
  severity: 'destructive';
  title: string;
  message: string;
  gap: number;
}

export type TimeRange = 'last_4_weeks' | 'last_12_weeks' | 'last_52_weeks';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get week number and year from date
 * Returns ISO week string like "W7 2026"
 */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `W${weekNo} ${d.getUTCFullYear()}`;
}

/**
 * Calculate date range based on time range filter
 */
function getDateRange(timeRange: TimeRange): Date {
  const now = new Date();
  const weeksAgo = new Date(now);

  switch (timeRange) {
    case 'last_4_weeks':
      weeksAgo.setDate(now.getDate() - 28);
      break;
    case 'last_12_weeks':
      weeksAgo.setDate(now.getDate() - 84);
      break;
    case 'last_52_weeks':
      weeksAgo.setDate(now.getDate() - 364);
      break;
  }

  return weeksAgo;
}

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

/**
 * Fetch revenue data from Supabase and calculate aggregations
 *
 * Strategy: Fetch raw bookings/payments/timesheets data and aggregate client-side.
 * The dataset is small enough (weeks of bookings) to process in browser.
 */
export async function fetchRevenueData(
  supabase: SupabaseClient,
  timeRange: TimeRange = 'last_12_weeks'
): Promise<RevenueData> {
  const startDate = getDateRange(timeRange);
  const startDateISO = startDate.toISOString();

  // Fetch completed bookings in time range
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      shift_date,
      site_postcode,
      total,
      medic_payout,
      platform_fee,
      client_id,
      medic_id,
      status,
      created_at,
      territories:site_postcode (
        postcode_sector,
        region
      ),
      clients:client_id (
        payment_terms
      ),
      medics:medic_id (
        first_name,
        last_name
      )
    `)
    .eq('status', 'completed')
    .gte('shift_date', startDateISO)
    .order('shift_date', { ascending: true });

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return getEmptyRevenueData();
  }

  // Fetch successful payments in time range
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      status,
      created_at,
      bookings:booking_id (
        created_at
      )
    `)
    .eq('status', 'succeeded')
    .gte('created_at', startDateISO);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Fetch all clients to count Net 30
  const { data: allClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, payment_terms')
    .eq('status', 'active');

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }

  // Handle empty data gracefully
  if (!bookings || bookings.length === 0) {
    return getEmptyRevenueData();
  }

  // Calculate weekly trend
  const weeklyMap = new Map<string, {
    revenue: number;
    payouts: number;
    platformFees: number;
  }>();

  bookings.forEach((booking) => {
    const week = getISOWeek(new Date(booking.shift_date));
    const existing = weeklyMap.get(week) || { revenue: 0, payouts: 0, platformFees: 0 };

    weeklyMap.set(week, {
      revenue: existing.revenue + (booking.total || 0),
      payouts: existing.payouts + (booking.medic_payout || 0),
      platformFees: existing.platformFees + (booking.platform_fee || 0),
    });
  });

  // Calculate cumulative gap (payouts - collections)
  let cumulativePayouts = 0;
  let cumulativeCollections = 0;

  const weeklyTrend: WeeklyRevenue[] = Array.from(weeklyMap.entries())
    .map(([week, data]) => {
      cumulativePayouts += data.payouts;

      // Calculate collections for this week (payments from bookings in this week)
      const weekStart = new Date(week.split(' ')[1] + '-W' + week.split(' ')[0].substring(1));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekCollections = (payments || [])
        .filter((p) => {
          const paymentDate = new Date(p.created_at);
          return paymentDate >= weekStart && paymentDate < weekEnd;
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      cumulativeCollections += weekCollections;

      return {
        week,
        revenue: data.revenue,
        payouts: data.payouts,
        platformFees: data.platformFees,
        gap: cumulativePayouts - cumulativeCollections,
      };
    })
    .sort((a, b) => {
      const [weekA, yearA] = a.week.split(' ');
      const [weekB, yearB] = b.week.split(' ');
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(weekA.substring(1)) - parseInt(weekB.substring(1));
    });

  // Calculate territory breakdown
  const territoryMap = new Map<string, {
    region: string;
    revenue: number;
    platformFees: number;
    count: number;
  }>();

  bookings.forEach((booking) => {
    // Extract postcode sector (first part of postcode)
    const postcode = booking.site_postcode || '';
    const sector = postcode.split(' ')[0] || 'Unknown';

    const region = (booking.territories as any)?.region || 'Unknown';
    const existing = territoryMap.get(sector) || {
      region,
      revenue: 0,
      platformFees: 0,
      count: 0
    };

    territoryMap.set(sector, {
      region: existing.region,
      revenue: existing.revenue + (booking.total || 0),
      platformFees: existing.platformFees + (booking.platform_fee || 0),
      count: existing.count + 1,
    });
  });

  const territoryBreakdown: TerritoryRevenue[] = Array.from(territoryMap.entries())
    .map(([postcode_sector, data]) => ({
      postcode_sector,
      region: data.region,
      revenue: data.revenue,
      platformFees: data.platformFees,
      bookingCount: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Calculate medic earnings
  const medicMap = new Map<string, {
    name: string;
    earnings: number;
    shifts: number;
  }>();

  bookings.forEach((booking) => {
    const medicId = booking.medic_id;
    if (!medicId) return;

    const medic = booking.medics as any;
    const medicName = medic
      ? `${medic.first_name} ${medic.last_name}`
      : 'Unknown Medic';

    const existing = medicMap.get(medicId) || {
      name: medicName,
      earnings: 0,
      shifts: 0
    };

    medicMap.set(medicId, {
      name: existing.name,
      earnings: existing.earnings + (booking.medic_payout || 0),
      shifts: existing.shifts + 1,
    });
  });

  const medicEarnings: MedicRevenue[] = Array.from(medicMap.entries())
    .map(([medic_id, data]) => ({
      medic_id,
      medic_name: data.name,
      totalEarnings: data.earnings,
      shiftsCompleted: data.shifts,
      avgPerShift: data.shifts > 0 ? data.earnings / data.shifts : 0,
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  // Calculate summary
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalPayouts = bookings.reduce((sum, b) => sum + (b.medic_payout || 0), 0);
  const totalPlatformFees = bookings.reduce((sum, b) => sum + (b.platform_fee || 0), 0);

  // Calculate average collection days from payments
  let totalCollectionDays = 0;
  let paymentCount = 0;

  (payments || []).forEach((payment) => {
    const booking = payment.bookings as any;
    if (booking && booking.created_at) {
      const bookingDate = new Date(booking.created_at);
      const paymentDate = new Date(payment.created_at);
      const daysDiff = Math.floor((paymentDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
      totalCollectionDays += daysDiff;
      paymentCount++;
    }
  });

  const avgCollectionDays = paymentCount > 0 ? Math.round(totalCollectionDays / paymentCount) : 30;

  // Count active clients and Net 30 clients
  const activeClients = new Set(bookings.map(b => b.client_id)).size;
  const net30Clients = (allClients || []).filter(c => c.payment_terms === 'net_30').length;

  const summary: RevenueSummary = {
    totalRevenue,
    totalPayouts,
    totalPlatformFees,
    avgCollectionDays,
    activeClients,
    net30Clients,
  };

  return {
    weeklyTrend,
    territoryBreakdown,
    medicEarnings,
    summary,
  };
}

/**
 * Return empty revenue data structure
 * Used when no bookings exist or on error
 */
function getEmptyRevenueData(): RevenueData {
  return {
    weeklyTrend: [],
    territoryBreakdown: [],
    medicEarnings: [],
    summary: {
      totalRevenue: 0,
      totalPayouts: 0,
      totalPlatformFees: 0,
      avgCollectionDays: 0,
      activeClients: 0,
      net30Clients: 0,
    },
  };
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * useRevenue - Fetch and poll revenue data
 *
 * @param timeRange - 'last_4_weeks' | 'last_12_weeks' | 'last_52_weeks'
 * @param initialData - Optional SSR initial data
 */
export function useRevenue(
  timeRange: TimeRange = 'last_12_weeks',
  initialData?: RevenueData
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['admin', 'revenue', timeRange],
    queryFn: () => fetchRevenueData(supabase, timeRange),
    initialData,
    refetchInterval: 60000, // 60 second polling
    staleTime: 30000, // Consider stale after 30s
  });
}

// =============================================================================
// CASH FLOW CALCULATION
// =============================================================================

/**
 * Calculate cash flow gap and return warning if dangerous
 *
 * Cash flow gap = avg days to collect from clients - days to pay medics
 *
 * Pattern:
 * - Medics paid weekly (7 days after shift)
 * - Clients invoiced Net 30 (30 days average collection)
 * - Gap = 30 - 7 = 23 days (acceptable)
 * - Warning threshold: gap > 30 days (means we're paying medics 30+ days before collecting)
 *
 * @param summary - Revenue summary with avgCollectionDays
 * @returns CashFlowWarning if gap > 30 days, null otherwise
 */
export function calculateCashFlowGap(summary: RevenueSummary): CashFlowWarning | null {
  const daysToCollect = summary.avgCollectionDays || 30;
  const daysToPayMedics = 7; // Weekly Friday payouts
  const gap = daysToCollect - daysToPayMedics;

  // Only warn if gap exceeds 30 days
  if (gap <= 30) {
    return null;
  }

  return {
    severity: 'destructive',
    title: 'Cash Flow Warning',
    message: `Average payment collection is ${daysToCollect} days, but medics are paid after ${daysToPayMedics} days. This ${gap}-day gap means you're funding payroll ${gap} days before collecting from clients. Consider requiring prepayment or faster payment terms for new clients.`,
    gap,
  };
}
