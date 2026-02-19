/**
 * Platform Organizations Page
 *
 * Lists all organizations using SiteMedic platform.
 * Platform admins can view, manage, and add new organizations.
 *
 * Phase 29-04: Added pending activation queue at the top.
 * Shows orgs that have paid but not yet been activated by platform admin.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, Calendar, TrendingUp, Plus, Search, AlertTriangle, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  // Add computed metrics
  user_count?: number;
  booking_count?: number;
  revenue?: number;
}

interface PendingOrg {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  org_branding: { company_name: string | null }[] | { company_name: string | null } | null;
}

// ---------------------------------------------------------------------------
// Tier badge colours
// ---------------------------------------------------------------------------

const TIER_BADGE_STYLES: Record<string, string> = {
  starter: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  growth: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  enterprise: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

function TierBadge({ tier }: { tier: string | null }) {
  const t = tier || 'starter';
  const style = TIER_BADGE_STYLES[t] || TIER_BADGE_STYLES.starter;
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${style}`}>
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Slugify helper
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

// ---------------------------------------------------------------------------
// Get company name from pending org (handles array or object join)
// ---------------------------------------------------------------------------

function getCompanyName(org: PendingOrg): string {
  if (!org.org_branding) return org.name;
  if (Array.isArray(org.org_branding)) {
    return org.org_branding[0]?.company_name || org.name;
  }
  return org.org_branding.company_name || org.name;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<PendingOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Per-org activation state
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});
  const [activatingIds, setActivatingIds] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch active orgs + pending orgs in parallel
      const [activeResult, pendingResult] = await Promise.all([
        supabase.rpc('get_platform_organizations'),
        supabase
          .from('organizations')
          .select(`
            id, name, slug, created_at, subscription_tier, subscription_status, stripe_customer_id,
            org_branding ( company_name )
          `)
          .eq('onboarding_completed', false)
          .not('subscription_status', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (activeResult.error) throw activeResult.error;

      // Map active orgs
      if (activeResult.data && activeResult.data.length > 0) {
        const orgsWithMetrics = activeResult.data.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          created_at: org.created_at,
          user_count: Number(org.user_count) || 0,
          booking_count: Number(org.booking_count) || 0,
          revenue: Number(org.revenue) || 0,
        }));
        setOrganizations(orgsWithMetrics);
      } else {
        setOrganizations([]);
      }

      // Map pending orgs
      if (pendingResult.data && pendingResult.data.length > 0) {
        setPendingOrgs(pendingResult.data as PendingOrg[]);

        // Pre-populate slug inputs for Growth/Enterprise
        const inputs: Record<string, string> = {};
        for (const org of pendingResult.data as PendingOrg[]) {
          if (org.subscription_tier === 'growth' || org.subscription_tier === 'enterprise') {
            const companyName = getCompanyName(org);
            inputs[org.id] = org.slug || slugify(companyName);
          }
        }
        setSlugInputs((prev) => ({ ...prev, ...inputs }));
      } else {
        setPendingOrgs([]);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------
  // Activate handler
  // -------------------------------------------------------------------

  async function handleActivate(orgId: string) {
    const pendingOrg = pendingOrgs.find((o) => o.id === orgId);
    if (!pendingOrg) return;

    const needsSlug = pendingOrg.subscription_tier === 'growth' || pendingOrg.subscription_tier === 'enterprise';
    const slug = needsSlug ? slugInputs[orgId]?.trim() : undefined;

    if (needsSlug && !slug) {
      toast.error('Please enter a subdomain slug for this Growth/Enterprise org.');
      return;
    }

    setActivatingIds((prev) => new Set(prev).add(orgId));

    try {
      const res = await fetch('/api/platform/organizations/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to activate organization');
        return;
      }

      toast.success(`Organisation activated! ${data.welcomeEmailSent ? 'Welcome email sent.' : ''}`);

      // Remove from pending list and refresh active orgs
      setPendingOrgs((prev) => prev.filter((o) => o.id !== orgId));
      // Refresh active orgs list
      const supabase = createClient();
      const { data: orgs } = await supabase.rpc('get_platform_organizations');
      if (orgs && orgs.length > 0) {
        setOrganizations(
          orgs.map((org: any) => ({
            id: org.id,
            name: org.name,
            slug: org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            created_at: org.created_at,
            user_count: Number(org.user_count) || 0,
            booking_count: Number(org.booking_count) || 0,
            revenue: Number(org.revenue) || 0,
          }))
        );
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('Network error — please try again');
    } finally {
      setActivatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
    }
  }

  // -------------------------------------------------------------------
  // Filtered orgs for search
  // -------------------------------------------------------------------

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-8">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>

        {/* Search bar skeleton */}
        <Skeleton className="h-12 w-full mb-6 rounded-xl" />

        {/* Organization cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4"
            >
              {/* Card header: icon + name + slug */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>

              {/* Metrics: 3-col grid */}
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-10 rounded" />
                <Skeleton className="h-10 rounded" />
                <Skeleton className="h-10 rounded" />
              </div>

              {/* Footer */}
              <Skeleton className="h-3 w-48" />
            </div>
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
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-purple-300">Manage all organizations on the platform</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105">
          <Plus className="w-5 h-5" />
          Add Organization
        </button>
      </div>

      {/* ============================================================= */}
      {/* Pending Activation Queue                                       */}
      {/* ============================================================= */}
      {pendingOrgs.length > 0 && (
        <div className="mb-8 bg-amber-900/20 border border-amber-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold text-amber-300">
              Pending Activation ({pendingOrgs.length})
            </h2>
          </div>
          <p className="text-amber-200/70 text-sm mb-4">
            These organizations have completed payment but need manual activation.
          </p>

          <div className="space-y-4">
            {pendingOrgs.map((org) => {
              const companyName = getCompanyName(org);
              const needsSlug = org.subscription_tier === 'growth' || org.subscription_tier === 'enterprise';
              const isActivating = activatingIds.has(org.id);

              return (
                <div
                  key={org.id}
                  className="bg-amber-800/20 border border-amber-700/30 rounded-xl p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: org info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold truncate">{companyName}</h3>
                        <TierBadge tier={org.subscription_tier} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-200/60">
                        <span>
                          Signed up:{' '}
                          {new Date(org.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {org.stripe_customer_id && (
                          <a
                            href={`https://dashboard.stripe.com/test/customers/${org.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 transition-colors"
                          >
                            Stripe Dashboard
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right: slug input + activate button */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {needsSlug && (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-200/50 text-sm hidden sm:inline">Subdomain:</span>
                          <input
                            type="text"
                            value={slugInputs[org.id] || ''}
                            onChange={(e) =>
                              setSlugInputs((prev) => ({
                                ...prev,
                                [org.id]: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                              }))
                            }
                            placeholder="my-company"
                            className="w-40 px-3 py-1.5 bg-amber-900/40 border border-amber-600/40 rounded-lg text-white text-sm placeholder-amber-400/40 focus:outline-none focus:border-amber-500 transition-all"
                            disabled={isActivating}
                          />
                          <span className="text-amber-200/40 text-sm hidden sm:inline">.sitemedic.co.uk</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleActivate(org.id)}
                        disabled={isActivating}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
                      >
                        {isActivating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Activating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            aria-label="Search organizations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-800/30 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            {/* Organization Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{org.name}</h3>
                  <p className="text-sm text-purple-300">@{org.slug}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                Active
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Users</p>
                </div>
                <p className="text-xl font-bold text-white">{org.user_count}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Bookings</p>
                </div>
                <p className="text-xl font-bold text-white">{org.booking_count}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Revenue</p>
                </div>
                <p className="text-xl font-bold text-white">£{org.revenue?.toLocaleString()}</p>
              </div>
            </div>

            {/* Created Date */}
            <div className="pt-4 border-t border-purple-700/30">
              <p className="text-xs text-purple-400">
                Created: {new Date(org.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrgs.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No organizations found</h3>
          <p className="text-purple-300">
            {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first organization'}
          </p>
        </div>
      )}
    </div>
  );
}
