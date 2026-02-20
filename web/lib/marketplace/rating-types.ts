/**
 * Marketplace Rating TypeScript Types
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 * Enhanced: Phase 36 Extension — 10 Features + 2 Decimal Precision
 *
 * Types for marketplace bidirectional ratings with blind window,
 * moderation support, multi-dimension ratings, company replies,
 * and trust scoring.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Moderation workflow statuses for ratings/reviews */
export type ModerationStatus = 'published' | 'flagged' | 'removed';

/**
 * Computed visibility state for a rating during the blind window:
 * - 'visible': Both rated or window expired — rating is shown
 * - 'blind': Other party hasn't rated and window still open — hidden
 * - 'pending': Current user hasn't rated yet
 */
export type RatingVisibility = 'visible' | 'blind' | 'pending';

/** The 5 rating dimension keys for client reviews */
export type RatingDimension =
  | 'rating_response_time'
  | 'rating_professionalism'
  | 'rating_equipment'
  | 'rating_communication'
  | 'rating_value';

/** Human-readable labels for each dimension */
export const RATING_DIMENSION_LABELS: Record<RatingDimension, string> = {
  rating_response_time: 'Response Time',
  rating_professionalism: 'Professionalism',
  rating_equipment: 'Equipment & Preparedness',
  rating_communication: 'Communication',
  rating_value: 'Value for Money',
};

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Marketplace rating row (extends job_ratings with Phase 36 + Enhanced columns) */
export interface MarketplaceRating {
  id: string;
  job_id: string;
  booking_id: string | null;
  rater_user_id: string;
  rater_type: 'company' | 'client';
  rating: number;
  review: string | null;
  blind_window_expires_at: string | null;
  moderation_status: ModerationStatus;
  flagged_at: string | null;
  flagged_by: string | null;
  flagged_reason: string | null;
  moderation_notes: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (not in table)
  rater_name?: string;

  // Multi-dimension ratings (Feature 4) — optional, client raters only
  rating_response_time?: number | null;
  rating_professionalism?: number | null;
  rating_equipment?: number | null;
  rating_communication?: number | null;
  rating_value?: number | null;

  // Computed fields (Feature 8: repeat client indicator)
  booking_count?: number;

  // Company reply (Feature 6) — joined from review_replies
  reply?: ReviewReply;
}

/** Aggregate rating data for a company */
export interface CompanyRatingAggregates {
  average_rating: number;
  raw_average_rating: number;
  review_count: number;
  trust_score: number;
}

/** Company reply to a review (Feature 6) */
export interface ReviewReply {
  id: string;
  rating_id: string;
  company_id: string;
  reply_by: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
}

/** Dimension averages for a company (Feature 4) */
export interface DimensionAverages {
  rating_response_time: number | null;
  rating_professionalism: number | null;
  rating_equipment: number | null;
  rating_communication: number | null;
  rating_value: number | null;
}

// =============================================================================
// API Request / Response Types
// =============================================================================

/** Request to report (flag) a review */
export interface RatingReportRequest {
  rating_id: string;
  reason: string;
}

/** Response from the marketplace ratings API */
export interface MarketplaceRatingsResponse {
  ratings: MarketplaceRating[];
  averageRating: number;
  count: number;
  canRate: boolean;
  blindWindowActive: boolean;
  blindWindowExpiresAt: string | null;
  viewerRating: MarketplaceRating | null;
}
