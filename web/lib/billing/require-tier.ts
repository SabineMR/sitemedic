/**
 * Server-side tier gating helper for API routes.
 *
 * Checks that the current user's org has access to a specific feature
 * based on their subscription tier. Throws 'TIER_INSUFFICIENT' if the
 * org's tier does not include the requested feature.
 *
 * @example
 * ```ts
 * // In an API route handler
 * export async function GET() {
 *   try {
 *     const tier = await requireTier('advanced_analytics');
 *     // tier is guaranteed to include the feature
 *     return Response.json({ data });
 *   } catch (error) {
 *     if (error instanceof Error && error.message === 'TIER_INSUFFICIENT') {
 *       return Response.json({ error: 'Upgrade required' }, { status: 403 });
 *     }
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * }
 * ```
 */

import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { hasFeature } from './feature-gates';
import type { FeatureKey, SubscriptionTier } from './feature-gates';

/**
 * Require that the current user's organization has access to a feature.
 *
 * 1. Resolves the org ID from the authenticated session
 * 2. Looks up the org's subscription_tier (defaults to 'starter' if NULL)
 * 3. Checks hasFeature() — throws 'TIER_INSUFFICIENT' if denied
 * 4. Returns the tier on success
 *
 * @param feature - The feature key to gate on
 * @returns The org's current subscription tier (guaranteed to include the feature)
 * @throws {Error} 'TIER_INSUFFICIENT' if the org's tier lacks the feature
 * @throws {Error} From requireOrgId() if user is not authenticated or has no org
 */
export async function requireTier(feature: FeatureKey): Promise<SubscriptionTier> {
  const orgId = await requireOrgId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', orgId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization tier: ${error.message}`);
  }

  const tier: SubscriptionTier = (data?.subscription_tier as SubscriptionTier) ?? 'starter';

  if (!hasFeature(tier, feature)) {
    throw new Error('TIER_INSUFFICIENT');
  }

  return tier;
}
