'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import type { FeatureKey, SubscriptionTier } from '@/lib/billing/feature-gates';

// ---------------------------------------------------------------------------
// Display name mappings
// ---------------------------------------------------------------------------

/** Human-readable display names for all gatable features. */
export const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  dashboard: 'Dashboard',
  treatment_logs: 'Treatment Logs',
  worker_registry: 'Worker Registry',
  weekly_reports: 'Weekly Reports',
  compliance: 'Compliance',
  basic_analytics: 'Basic Analytics',
  white_label: 'White-Label Branding',
  subdomain: 'Custom Subdomain',
  advanced_analytics: 'Advanced Analytics',
  custom_domain: 'Custom Domain',
  api_access: 'API Access',
  priority_support: 'Priority Support',
};

/** Maps Growth+ and Enterprise-only features to their required tier. */
export const FEATURE_REQUIRED_TIER: Partial<Record<FeatureKey, SubscriptionTier>> = {
  // Growth+
  white_label: 'growth',
  subdomain: 'growth',
  advanced_analytics: 'growth',
  // Enterprise
  custom_domain: 'enterprise',
  api_access: 'enterprise',
  priority_support: 'enterprise',
};

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface UpgradePromptProps {
  feature: FeatureKey;
  currentTier: SubscriptionTier | null;
  message?: string;
}

/**
 * Contextual upgrade prompt shown when a user tries to access a feature
 * that requires a higher subscription tier.
 */
export function UpgradePrompt({ feature, currentTier, message }: UpgradePromptProps) {
  const featureName = FEATURE_DISPLAY_NAMES[feature];
  const requiredTier = FEATURE_REQUIRED_TIER[feature] ?? 'growth';
  const tierDisplayName = TIER_DISPLAY_NAMES[requiredTier];

  const description =
    message ??
    `Upgrade to the ${tierDisplayName} plan to unlock ${featureName} and more.`;

  return (
    <div className="rounded-2xl border border-blue-700/50 bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-blue-600/50">
        <Sparkles className="h-6 w-6 text-blue-400" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-white">
        {featureName} is a {tierDisplayName} Feature
      </h3>

      <p className="mx-auto mb-6 max-w-md text-sm text-gray-400">
        {description}
      </p>

      <a
        href="/admin/settings#billing"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
      >
        Upgrade to {tierDisplayName}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
