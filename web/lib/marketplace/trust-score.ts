/**
 * Trust Score Calculation Utility
 * Phase 36 Extension: Feature 9 — Composite Trust Score
 *
 * Combines multiple signals into a single 0-100 metric:
 *   - Bayesian average rating (30%)
 *   - Review volume (15%)
 *   - Insurance verified (10%)
 *   - CQC/Platform verified (10%)
 *   - Cancellation rate inverse (15%)
 *   - Platform tenure (10%)
 *   - Quote response rate (10%)
 *
 * Used by the cron job (trust-score-refresh) for periodic recalculation
 * of all companies, independent of rating changes.
 */

// =============================================================================
// Types
// =============================================================================

export interface TrustScoreInputs {
  /** Bayesian-adjusted average rating (1-5 scale) */
  averageRating: number;
  /** Total published client review count */
  reviewCount: number;
  /** Insurance status: 'verified' | 'expired' | 'unverified' */
  insuranceStatus: string;
  /** Verification status: 'verified' | 'cqc_verified' | 'pending' | etc. */
  verificationStatus: string;
  /** Number of completed events */
  completedEvents: number;
  /** Number of cancelled events */
  cancelledEvents: number;
  /** ISO date string of when the company joined the platform */
  createdAt: string;
  /** Total quotes submitted by the company */
  totalQuotes: number;
  /** Total marketplace events available (for response rate denominator) */
  totalEventsAvailable: number;
}

// =============================================================================
// Weights
// =============================================================================

const WEIGHTS = {
  rating: 0.30,
  volume: 0.15,
  insurance: 0.10,
  verification: 0.10,
  cancellation: 0.15,
  tenure: 0.10,
  response: 0.10,
} as const;

/** Maximum review count for full volume score */
const MAX_REVIEW_COUNT = 50;

/** Maximum tenure in milliseconds (2 years) */
const MAX_TENURE_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

// =============================================================================
// Calculation
// =============================================================================

/**
 * Calculates the composite trust score (0-100) from multiple signals.
 *
 * @param inputs - Trust score signal inputs
 * @returns Integer trust score between 0 and 100
 */
export function calculateTrustScore(inputs: TrustScoreInputs): number {
  // Rating component: normalize 1-5 scale to 0-100
  const ratingComponent = inputs.averageRating > 0
    ? ((inputs.averageRating - 1) / 4) * 100
    : 0;

  // Volume component: capped at MAX_REVIEW_COUNT = 100%
  const volumeComponent = Math.min((inputs.reviewCount / MAX_REVIEW_COUNT) * 100, 100);

  // Insurance component: binary
  const insuranceComponent = inputs.insuranceStatus === 'verified' ? 100 : 0;

  // Verification component: binary
  const verificationComponent =
    inputs.verificationStatus === 'verified' || inputs.verificationStatus === 'cqc_verified'
      ? 100
      : 0;

  // Cancellation rate component: inverse of cancel rate
  const totalEvents = inputs.completedEvents + inputs.cancelledEvents;
  const cancellationComponent = totalEvents > 0
    ? (1 - inputs.cancelledEvents / totalEvents) * 100
    : 50; // Neutral for new companies

  // Tenure component: capped at 2 years
  const tenureMs = Date.now() - new Date(inputs.createdAt).getTime();
  const tenureComponent = Math.min((tenureMs / MAX_TENURE_MS) * 100, 100);

  // Response rate component: quotes / (10% of total events)
  const responseComponent = inputs.totalEventsAvailable > 0
    ? Math.min(
        (inputs.totalQuotes / Math.max(inputs.totalEventsAvailable * 0.1, 1)) * 100,
        100
      )
    : 50; // Neutral when no events exist

  // Weighted composite
  const score =
    ratingComponent * WEIGHTS.rating +
    volumeComponent * WEIGHTS.volume +
    insuranceComponent * WEIGHTS.insurance +
    verificationComponent * WEIGHTS.verification +
    cancellationComponent * WEIGHTS.cancellation +
    tenureComponent * WEIGHTS.tenure +
    responseComponent * WEIGHTS.response;

  // Clamp to 0-100 and round to integer
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Returns a human-readable label for a trust score.
 */
export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Building';
  return 'New';
}

/**
 * Returns Tailwind color classes for a trust score badge.
 */
export function getTrustScoreColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-800' };
  if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-800' };
  return { bg: 'bg-gray-100', text: 'text-gray-800' };
}
