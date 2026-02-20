/**
 * Marketplace Dispute & Cancellation TypeScript Types
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Types for dispute filing, resolution, and marketplace cancellations.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

export type DisputeCategory =
  | 'no_show'
  | 'late_cancellation'
  | 'quality_issue'
  | 'billing_dispute'
  | 'safety_concern';

export type DisputeStatus = 'open' | 'under_review' | 'resolved';

export type ResolutionType =
  | 'full_refund'
  | 'partial_refund'
  | 'dismissed'
  | 'suspend_party';

export type CancellationReason =
  | 'event_cancelled'
  | 'found_alternative'
  | 'budget_issue'
  | 'scheduling_conflict'
  | 'other';

// =============================================================================
// Database Row Interface
// =============================================================================

export interface MarketplaceDispute {
  id: string;
  event_id: string;
  booking_id: string | null;
  filed_by: string;
  filed_by_type: 'client' | 'company';
  category: DisputeCategory;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution_type: ResolutionType | null;
  resolution_percent: number | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  event_name?: string;
  filed_by_name?: string;
}

// =============================================================================
// API Request / Response Types
// =============================================================================

export interface FileDisputeRequest {
  category: DisputeCategory;
  description: string;
}

export interface ResolveDisputeRequest {
  resolution_type: ResolutionType;
  resolution_percent?: number;
  resolution_notes: string;
}

export interface MarketplaceCancelRequest {
  reason: CancellationReason;
  reason_detail?: string;
}

// =============================================================================
// Cancellation Breakdown
// =============================================================================

export interface CancellationBreakdown {
  depositPaid: number;
  daysUntilEvent: number;
  tier: string;
  refundPercent: number;
  refundAmount: number;
  retainedAmount: number;
}

// =============================================================================
// Human-Readable Label Maps
// =============================================================================

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  no_show: 'No-show',
  late_cancellation: 'Late Cancellation',
  quality_issue: 'Quality Issue',
  billing_dispute: 'Billing Dispute',
  safety_concern: 'Safety Concern',
};

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  event_cancelled: 'Event cancelled',
  found_alternative: 'Found alternative provider',
  budget_issue: 'Budget issue',
  scheduling_conflict: 'Scheduling conflict',
  other: 'Other',
};

export const RESOLUTION_TYPE_LABELS: Record<ResolutionType, string> = {
  full_refund: 'Full refund to client',
  partial_refund: 'Partial refund',
  dismissed: 'Dismissed (company keeps payment)',
  suspend_party: 'Suspend party',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
};
