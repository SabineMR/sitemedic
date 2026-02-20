/**
 * Marketplace Rating TypeScript Types
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 *
 * Types for marketplace bidirectional ratings with blind window
 * and moderation support.
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

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Marketplace rating row (extends job_ratings with Phase 36 columns) */
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
}

/** Aggregate rating data for a company */
export interface CompanyRatingAggregates {
  average_rating: number;
  review_count: number;
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
