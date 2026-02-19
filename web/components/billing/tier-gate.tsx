'use client';

import type { ReactNode } from 'react';
import { hasFeature } from '@/lib/billing/feature-gates';
import type { FeatureKey, SubscriptionTier } from '@/lib/billing/feature-gates';
import { UpgradePrompt } from './upgrade-prompt';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TierGateProps {
  /** The feature being gated. */
  feature: FeatureKey;
  /** The org's current subscription tier (NULL = legacy, defaults to starter). */
  tier: SubscriptionTier | null;
  /** Content to render when the org has access. */
  children: ReactNode;
  /** Optional custom message for the upgrade prompt. */
  upgradeMessage?: string;
}

/**
 * Client-side tier gate wrapper.
 *
 * Renders children when the org's tier includes the requested feature.
 * Otherwise renders an UpgradePrompt directing the user to upgrade.
 *
 * @example
 * ```tsx
 * <TierGate feature="white_label" tier={org.subscription_tier}>
 *   <WhiteLabelSettings />
 * </TierGate>
 * ```
 */
export function TierGate({ feature, tier, children, upgradeMessage }: TierGateProps) {
  if (hasFeature(tier, feature)) {
    return <>{children}</>;
  }

  return <UpgradePrompt feature={feature} currentTier={tier} message={upgradeMessage} />;
}
