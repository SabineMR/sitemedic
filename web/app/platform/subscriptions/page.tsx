/**
 * Platform Admin Subscriptions / MRR Dashboard
 *
 * Shows all org subscriptions with tier, status, and MRR contribution.
 * Aggregate MRR summary with total and per-tier breakdown.
 *
 * All data from local organizations table — no Stripe API calls.
 *
 * Phase 30-04: Initial creation.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  Building2,
  CreditCard,
  AlertTriangle,
  Loader2,
  Search,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgSubscription {
  id: string;
  name: string;
  slug: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

interface MrrSummary {
  total: number;
  starter: { count: number; mrr: number };
  growth: { count: number; mrr: number };
  enterprise: { count: number; mrr: number };
  atRisk: number;
  churned: number;
}

// ---------------------------------------------------------------------------
// Price constants (GBP monthly)
// ---------------------------------------------------------------------------

const TIER_PRICES: Record<string, number> = {
  starter: 149,
  growth: 299,
  enterprise: 599,
};

// ---------------------------------------------------------------------------
// Tier badge styles (reuse pattern from organizations page)
// ---------------------------------------------------------------------------

const TIER_BADGE_STYLES: Record<string, string> = {
  starter: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  growth: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  enterprise: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  past_due: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.starter;
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${style}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.active;
  const label = status === 'past_due' ? 'Past Due' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${style}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MRR calculation helper
// ---------------------------------------------------------------------------

function calculateMrr(orgs: OrgSubscription[]): MrrSummary {
  const summary: MrrSummary = {
    total: 0,
    starter: { count: 0, mrr: 0 },
    growth: { count: 0, mrr: 0 },
    enterprise: { count: 0, mrr: 0 },
    atRisk: 0,
    churned: 0,
  };

  for (const org of orgs) {
    const tier = org.subscription_tier || 'starter';
    const status = org.subscription_status || 'active';

    if (status === 'cancelled') {
      summary.churned += 1;
      continue; // Excluded from MRR
    }

    if (status === 'past_due') {
      summary.atRisk += 1;
      // Still included in MRR (dunning period)
    }

    const price = TIER_PRICES[tier] || TIER_PRICES.starter;

    if (tier === 'starter') {
      summary.starter.count += 1;
      summary.starter.mrr += price;
    } else if (tier === 'growth') {
      summary.growth.count += 1;
      summary.growth.mrr += price;
    } else if (tier === 'enterprise') {
      summary.enterprise.count += 1;
      summary.enterprise.mrr += price;
    }

    summary.total += price;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PlatformSubscriptionsPage() {
  const [orgs, setOrgs] = useState<OrgSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, slug, subscription_tier, subscription_status, stripe_customer_id, created_at')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setOrgs((data as OrgSubscription[]) || []);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, []);

  const mrr = calculateMrr(orgs);

  // Client-side search filter
  const filteredOrgs = orgs.filter((org) => {
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.slug?.toLowerCase().includes(q) ?? false) ||
      (org.subscription_tier || 'starter').includes(q) ||
      (org.subscription_status || 'active').includes(q)
    );
  });

  // Get org MRR
  function getOrgMrr(org: OrgSubscription): number {
    const tier = org.subscription_tier || 'starter';
    const status = org.subscription_status || 'active';
    if (status === 'cancelled') return 0;
    return TIER_PRICES[tier] || TIER_PRICES.starter;
  }

  // -------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>

        {/* Tier cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6">
              <Skeleton className="h-5 w-28 mb-3" />
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Active org count (not cancelled)
  // -------------------------------------------------------------------

  const activeCount = orgs.filter((o) => (o.subscription_status || 'active') !== 'cancelled').length;

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
        </div>
        <p className="text-purple-300">Monthly Recurring Revenue dashboard and subscription management</p>
      </div>

      {/* ============================================================= */}
      {/* Summary Cards                                                 */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total MRR */}
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-green-400" />
            <p className="text-sm text-green-300 font-medium">Total MRR</p>
          </div>
          <p className="text-3xl font-bold text-green-100">
            £{mrr.total.toLocaleString()}
          </p>
          <p className="text-xs text-green-400/70 mt-1">
            £{(mrr.total * 12).toLocaleString()} ARR
          </p>
        </div>

        {/* Active Orgs */}
        <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-purple-400" />
            <p className="text-sm text-purple-300 font-medium">Active Orgs</p>
          </div>
          <p className="text-3xl font-bold text-white">{activeCount}</p>
          <p className="text-xs text-purple-400/70 mt-1">
            Contributing to MRR
          </p>
        </div>

        {/* At Risk */}
        <div className={`border rounded-2xl p-6 ${
          mrr.atRisk > 0
            ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/50'
            : 'bg-purple-800/30 border-purple-700/50'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-4 h-4 ${mrr.atRisk > 0 ? 'text-yellow-400' : 'text-purple-400'}`} />
            <p className={`text-sm font-medium ${mrr.atRisk > 0 ? 'text-yellow-300' : 'text-purple-300'}`}>
              At Risk
            </p>
          </div>
          <p className={`text-3xl font-bold ${mrr.atRisk > 0 ? 'text-yellow-100' : 'text-white'}`}>
            {mrr.atRisk}
          </p>
          <p className={`text-xs mt-1 ${mrr.atRisk > 0 ? 'text-yellow-400/70' : 'text-purple-400/70'}`}>
            Past due payments
          </p>
        </div>

        {/* Churned */}
        <div className={`border rounded-2xl p-6 ${
          mrr.churned > 0
            ? 'bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-700/50'
            : 'bg-purple-800/30 border-purple-700/50'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className={`w-4 h-4 ${mrr.churned > 0 ? 'text-red-400' : 'text-purple-400'}`} />
            <p className={`text-sm font-medium ${mrr.churned > 0 ? 'text-red-300' : 'text-purple-300'}`}>
              Churned
            </p>
          </div>
          <p className={`text-3xl font-bold ${mrr.churned > 0 ? 'text-red-100' : 'text-white'}`}>
            {mrr.churned}
          </p>
          <p className={`text-xs mt-1 ${mrr.churned > 0 ? 'text-red-400/70' : 'text-purple-400/70'}`}>
            Cancelled subscriptions
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Tier Breakdown Cards                                           */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Starter */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-200">Starter</h3>
            <span className="text-xs text-gray-400 font-medium">£{TIER_PRICES.starter}/mo</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{mrr.starter.count} orgs</p>
          <p className="text-sm text-gray-400">
            £{mrr.starter.mrr.toLocaleString()} MRR
          </p>
        </div>

        {/* Growth */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-200">Growth</h3>
            <span className="text-xs text-blue-400 font-medium">£{TIER_PRICES.growth}/mo</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{mrr.growth.count} orgs</p>
          <p className="text-sm text-blue-400">
            £{mrr.growth.mrr.toLocaleString()} MRR
          </p>
        </div>

        {/* Enterprise */}
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-purple-200">Enterprise</h3>
            <span className="text-xs text-purple-400 font-medium">£{TIER_PRICES.enterprise}/mo</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{mrr.enterprise.count} orgs</p>
          <p className="text-sm text-purple-400">
            £{mrr.enterprise.mrr.toLocaleString()} MRR
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Search Bar                                                     */}
      {/* ============================================================= */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            placeholder="Search by name, tier, or status..."
            aria-label="Search subscriptions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-800/30 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* Org Subscriptions Table                                        */}
      {/* ============================================================= */}
      <div className="bg-purple-800/20 border border-purple-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-700/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-purple-300">Organization</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-purple-300">Tier</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-purple-300">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-purple-300">MRR</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-purple-300">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org) => {
                const tier = org.subscription_tier || 'starter';
                const status = org.subscription_status || 'active';
                const orgMrr = getOrgMrr(org);

                return (
                  <tr
                    key={org.id}
                    className="border-b border-purple-700/30 hover:bg-purple-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{org.name}</p>
                          {org.slug && (
                            <p className="text-xs text-purple-400 truncate">{org.slug}.sitemedic.co.uk</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TierBadge tier={tier} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-semibold ${orgMrr > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        £{orgMrr.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-purple-300">
                        {new Date(org.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredOrgs.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No subscriptions found</h3>
            <p className="text-purple-300 text-sm">
              {searchQuery ? 'Try adjusting your search' : 'No organizations have subscribed yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
