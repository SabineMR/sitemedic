/**
 * Profit Split Query — Platform Admin
 *
 * Aggregates profit data from two revenue streams:
 *   1. ASG bookings  — completed bookings across all orgs
 *   2. SiteMedic subscriptions — active org tier counts × tier pricing
 *
 * Each stream's net profit is split 4 ways:
 *   25% Sabine / 25% Kai / 25% Operational / 25% Reserve
 *
 * No database changes required — reads existing bookings + organizations tables.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export type ProfitTimeRange = 'last_4_weeks' | 'last_12_weeks' | 'last_52_weeks';

export interface FourWayAmounts {
  sabine: number;
  kai: number;
  operational: number;
  reserve: number;
}

export interface ASGBreakdown {
  grossRevenue: number;
  totalMedicPay: number;
  totalReferralCommissions: number;
  totalMileageReimbursements: number;
  netProfit: number;
  split: FourWayAmounts;
  bookingCount: number;
}

export interface TierCount {
  tier: string;
  count: number;
  monthlyPrice: number;
  revenue: number;
}

export interface SiteMedicBreakdown {
  tierCounts: TierCount[];
  grossRevenue: number;
  stripeFees: number;
  netProfit: number;
  split: FourWayAmounts;
  totalActiveSubscriptions: number;
}

export interface ProfitSplitData {
  asg: ASGBreakdown;
  sitemedic: SiteMedicBreakdown;
  combined: {
    netProfit: number;
    split: FourWayAmounts;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Monthly subscription prices per tier (GBP) */
const TIER_MONTHLY_PRICES: Record<string, number> = {
  starter: 49,
  growth: 149,
  enterprise: 349,
};

/** Stripe fee rate (2.9% + £0.30 per transaction) */
const STRIPE_PERCENTAGE = 0.029;
const STRIPE_FIXED_FEE = 0.30;

// =============================================================================
// HELPERS
// =============================================================================

function getDateRange(timeRange: ProfitTimeRange): Date {
  const now = new Date();
  const start = new Date(now);
  switch (timeRange) {
    case 'last_4_weeks':
      start.setDate(now.getDate() - 28);
      break;
    case 'last_12_weeks':
      start.setDate(now.getDate() - 84);
      break;
    case 'last_52_weeks':
      start.setDate(now.getDate() - 364);
      break;
  }
  return start;
}

function splitFourWays(amount: number): FourWayAmounts {
  const quarter = parseFloat((amount / 4).toFixed(2));
  return {
    sabine: quarter,
    kai: quarter,
    operational: quarter,
    reserve: quarter,
  };
}

function addSplits(a: FourWayAmounts, b: FourWayAmounts): FourWayAmounts {
  return {
    sabine: parseFloat((a.sabine + b.sabine).toFixed(2)),
    kai: parseFloat((a.kai + b.kai).toFixed(2)),
    operational: parseFloat((a.operational + b.operational).toFixed(2)),
    reserve: parseFloat((a.reserve + b.reserve).toFixed(2)),
  };
}

// =============================================================================
// DATA FETCHING
// =============================================================================

export async function fetchProfitSplitData(
  timeRange: ProfitTimeRange = 'last_12_weeks'
): Promise<ProfitSplitData> {
  const supabase = createClient();
  const startDate = getDateRange(timeRange);

  // ------------------------------------------------------------------
  // 1. ASG Bookings — fetch all completed bookings across all orgs
  // ------------------------------------------------------------------
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      total,
      platform_fee,
      medic_payout,
      mileage_reimbursement,
      referral_payout_amount,
      pay_model,
      sabine_share,
      kai_share,
      operational_bucket_amount,
      reserve_bucket_amount
    `)
    .eq('status', 'completed')
    .gte('shift_date', startDate.toISOString());

  if (bookingsError) {
    console.error('Error fetching bookings for profit split:', bookingsError);
  }

  const safeBookings = bookings || [];

  // Aggregate ASG data
  let grossRevenue = 0;
  let totalMedicPay = 0;
  let totalReferralCommissions = 0;
  let totalMileageReimbursements = 0;
  let asgSplit: FourWayAmounts = { sabine: 0, kai: 0, operational: 0, reserve: 0 };

  safeBookings.forEach((b) => {
    const total = Number(b.total) || 0;
    const medicPayout = Number(b.medic_payout) || 0;
    const referral = Number(b.referral_payout_amount) || 0;
    const mileage = Number(b.mileage_reimbursement) || 0;

    grossRevenue += total;
    totalMedicPay += medicPayout;
    totalReferralCommissions += referral;
    totalMileageReimbursements += mileage;

    // For hourly model bookings, use pre-calculated 4-way split columns
    if (b.pay_model === 'hourly' && b.sabine_share != null) {
      asgSplit.sabine += Number(b.sabine_share) || 0;
      asgSplit.kai += Number(b.kai_share) || 0;
      asgSplit.operational += Number(b.operational_bucket_amount) || 0;
      asgSplit.reserve += Number(b.reserve_bucket_amount) || 0;
    } else {
      // For percentage model: calculate net from platform_fee minus deductions
      const platformFee = Number(b.platform_fee) || 0;
      const net = platformFee - referral - mileage;
      const quarter = parseFloat((net / 4).toFixed(2));
      asgSplit.sabine += quarter;
      asgSplit.kai += quarter;
      asgSplit.operational += quarter;
      asgSplit.reserve += quarter;
    }
  });

  // Round aggregated splits
  asgSplit = {
    sabine: parseFloat(asgSplit.sabine.toFixed(2)),
    kai: parseFloat(asgSplit.kai.toFixed(2)),
    operational: parseFloat(asgSplit.operational.toFixed(2)),
    reserve: parseFloat(asgSplit.reserve.toFixed(2)),
  };

  const asgNet = parseFloat(
    (grossRevenue - totalMedicPay - totalReferralCommissions - totalMileageReimbursements).toFixed(2)
  );

  const asg: ASGBreakdown = {
    grossRevenue: parseFloat(grossRevenue.toFixed(2)),
    totalMedicPay: parseFloat(totalMedicPay.toFixed(2)),
    totalReferralCommissions: parseFloat(totalReferralCommissions.toFixed(2)),
    totalMileageReimbursements: parseFloat(totalMileageReimbursements.toFixed(2)),
    netProfit: asgNet,
    split: asgSplit,
    bookingCount: safeBookings.length,
  };

  // ------------------------------------------------------------------
  // 2. SiteMedic Subscriptions — current snapshot (not time-filtered)
  // ------------------------------------------------------------------
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, subscription_tier, subscription_status')
    .not('subscription_tier', 'is', null);

  if (orgsError) {
    console.error('Error fetching orgs for profit split:', orgsError);
  }

  const activeOrgs = (orgs || []).filter(
    (o) => o.subscription_status === 'active' || o.subscription_status === 'trialing'
  );

  // Count per tier
  const tierMap = new Map<string, number>();
  activeOrgs.forEach((o) => {
    const tier = o.subscription_tier || 'starter';
    tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
  });

  const tierCounts: TierCount[] = [];
  let subscriptionGross = 0;
  let totalSubscriptionCount = 0;

  for (const [tier, count] of tierMap.entries()) {
    const price = TIER_MONTHLY_PRICES[tier] || 0;
    const revenue = count * price;
    subscriptionGross += revenue;
    totalSubscriptionCount += count;
    tierCounts.push({ tier, count, monthlyPrice: price, revenue });
  }

  // Stripe fees: 2.9% + £0.30 per subscription
  const stripeFees = parseFloat(
    (subscriptionGross * STRIPE_PERCENTAGE + totalSubscriptionCount * STRIPE_FIXED_FEE).toFixed(2)
  );
  const smNet = parseFloat((subscriptionGross - stripeFees).toFixed(2));
  const smSplit = splitFourWays(smNet);

  const sitemedic: SiteMedicBreakdown = {
    tierCounts,
    grossRevenue: subscriptionGross,
    stripeFees,
    netProfit: smNet,
    split: smSplit,
    totalActiveSubscriptions: totalSubscriptionCount,
  };

  // ------------------------------------------------------------------
  // 3. Combined totals
  // ------------------------------------------------------------------
  const combinedNet = parseFloat((asgNet + smNet).toFixed(2));
  const combinedSplit = addSplits(asgSplit, smSplit);

  return {
    asg,
    sitemedic,
    combined: {
      netProfit: combinedNet,
      split: combinedSplit,
    },
  };
}

// =============================================================================
// REACT QUERY HOOK
// =============================================================================

export function useProfitSplit(timeRange: ProfitTimeRange = 'last_12_weeks') {
  return useQuery({
    queryKey: ['platform', 'profit-split', timeRange],
    queryFn: () => fetchProfitSplitData(timeRange),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
