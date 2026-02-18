/**
 * Feature Gates — Sole source of truth for tier-based feature gating.
 *
 * Every downstream phase (27, 28, 29, 30, 31) that checks tier access
 * imports from this module. The type system enforces that only valid
 * tiers and feature keys are used at compile time.
 *
 * SubscriptionTier values match the CHECK constraint in migration 133:
 *   'starter' | 'growth' | 'enterprise'
 */

/** Ordered list of subscription tiers (lowest to highest). */
export const TIERS = ['starter', 'growth', 'enterprise'] as const;

/** Subscription tier — matches organizations.subscription_tier CHECK constraint. */
export type SubscriptionTier = (typeof TIERS)[number];

/** All gatable feature keys across the platform. */
export const FEATURES = [
  // Core (all tiers)
  'dashboard',
  'treatment_logs',
  'worker_registry',
  'weekly_reports',
  'compliance',
  'basic_analytics',
  // Growth+
  'white_label',
  'subdomain',
  'advanced_analytics',
  // Enterprise
  'custom_domain',
  'api_access',
  'priority_support',
] as const;

/** Feature key — one of the gatable features in the platform. */
export type FeatureKey = (typeof FEATURES)[number];

// ---------------------------------------------------------------------------
// Feature sets per tier (each tier is a superset of the one below it)
// ---------------------------------------------------------------------------

const STARTER_FEATURES: readonly FeatureKey[] = [
  'dashboard',
  'treatment_logs',
  'worker_registry',
  'weekly_reports',
  'compliance',
  'basic_analytics',
];

const GROWTH_FEATURES: readonly FeatureKey[] = [
  ...STARTER_FEATURES,
  'white_label',
  'subdomain',
  'advanced_analytics',
];

const ENTERPRISE_FEATURES: readonly FeatureKey[] = [
  ...GROWTH_FEATURES,
  'custom_domain',
  'api_access',
  'priority_support',
];

/**
 * The sole source of truth for which features each tier includes.
 *
 * - Starter: 6 core features
 * - Growth: Starter + 3 (white_label, subdomain, advanced_analytics)
 * - Enterprise: Growth + 3 (custom_domain, api_access, priority_support)
 */
export const FEATURE_GATES: Record<SubscriptionTier, ReadonlySet<FeatureKey>> = {
  starter: new Set(STARTER_FEATURES),
  growth: new Set(GROWTH_FEATURES),
  enterprise: new Set(ENTERPRISE_FEATURES),
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Check if a subscription tier has access to a specific feature.
 *
 * This is the SOLE source of truth for tier gating — never inline tier
 * checks in component code.
 *
 * @param tier - The org's subscription_tier (NULL = legacy org, defaults to starter)
 * @param feature - The feature key to check
 * @returns true if the tier includes the feature
 */
export function hasFeature(tier: SubscriptionTier | null, feature: FeatureKey): boolean {
  const effectiveTier = tier ?? 'starter';
  return FEATURE_GATES[effectiveTier].has(feature);
}

/**
 * Get the full set of features available for a tier.
 *
 * @param tier - The subscription tier
 * @returns ReadonlySet of feature keys
 */
export function getTierFeatures(tier: SubscriptionTier): ReadonlySet<FeatureKey> {
  return FEATURE_GATES[tier];
}

/** Numeric ordering for tier comparison. */
const TIER_ORDER: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  enterprise: 2,
};

/**
 * Check if a tier is at least a given minimum tier level.
 * Useful for "Growth or above" gates.
 *
 * @param currentTier - The org's subscription_tier (NULL defaults to starter)
 * @param minimumTier - The minimum required tier
 * @returns true if currentTier >= minimumTier
 */
export function isAtLeastTier(
  currentTier: SubscriptionTier | null,
  minimumTier: SubscriptionTier
): boolean {
  const current = TIER_ORDER[currentTier ?? 'starter'];
  const minimum = TIER_ORDER[minimumTier];
  return current >= minimum;
}

// ---------------------------------------------------------------------------
// Development-only superset invariant check
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'production') {
  const starter = FEATURE_GATES.starter;
  const growth = FEATURE_GATES.growth;
  const enterprise = FEATURE_GATES.enterprise;

  // Starter must be a subset of Growth
  for (const feature of starter) {
    if (!growth.has(feature)) {
      throw new Error(`Superset invariant violated: starter has '${feature}' but growth does not`);
    }
  }

  // Growth must be a subset of Enterprise
  for (const feature of growth) {
    if (!enterprise.has(feature)) {
      throw new Error(`Superset invariant violated: growth has '${feature}' but enterprise does not`);
    }
  }

  // FEATURES array must contain exactly the union of all features
  const allFeatures = new Set<FeatureKey>();
  for (const tier of TIERS) {
    for (const feature of FEATURE_GATES[tier]) {
      allFeatures.add(feature);
    }
  }
  const featuresSet = new Set(FEATURES);
  if (allFeatures.size !== featuresSet.size) {
    throw new Error(
      `FEATURES array (${featuresSet.size}) does not match union of FEATURE_GATES (${allFeatures.size})`
    );
  }
  for (const feature of allFeatures) {
    if (!featuresSet.has(feature)) {
      throw new Error(`Feature '${feature}' is in FEATURE_GATES but not in FEATURES array`);
    }
  }
}
