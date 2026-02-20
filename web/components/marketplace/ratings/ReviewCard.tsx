'use client';

/**
 * ReviewCard Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 * Enhanced: Phase 36 Extension — Features 4, 5, 6, 8
 *
 * Displays a single marketplace review with:
 * - Star rating + reviewer info
 * - Multi-dimension mini stars (Feature 4)
 * - Verified Booking badge (Feature 5)
 * - Repeat Client badge (Feature 8)
 * - Company reply section (Feature 6)
 * - Report button for flagging
 */

import { useState } from 'react';
import {
  Star,
  Flag,
  Loader2,
  AlertTriangle,
  BadgeCheck,
  Repeat2,
  MessageSquareReply,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  RATING_DIMENSION_LABELS,
  type MarketplaceRating,
  type RatingDimension,
} from '@/lib/marketplace/rating-types';

// =============================================================================
// Types
// =============================================================================

interface ReviewCardProps {
  review: MarketplaceRating;
  currentUserId?: string;
  /** Whether current user is the company admin (for reply button) */
  isCompanyAdmin?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ReviewCard({ review, currentUserId, isCompanyAdmin = false }: ReviewCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Reply state (Feature 6)
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState(review.reply?.reply_text || '');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [currentReply, setCurrentReply] = useState(review.reply || null);

  // Removed reviews show a placeholder
  if (review.moderation_status === 'removed') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm italic">This review has been removed by a moderator.</p>
        </div>
      </div>
    );
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return;

    setReporting(true);
    setReportError(null);

    try {
      const res = await fetch(`/api/marketplace/ratings/${review.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setReportError(data.error || 'Failed to report review');
        return;
      }

      setReported(true);
      setShowReportModal(false);
    } catch {
      setReportError('Failed to report review. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  // Feature 6: Handle reply submit
  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    setReplyError(null);

    try {
      const method = currentReply ? 'PUT' : 'POST';
      const res = await fetch(`/api/marketplace/ratings/${review.id}/reply`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setReplyError(data.error || 'Failed to submit reply');
        return;
      }

      const data = await res.json();
      setCurrentReply(data.reply);
      setShowReplyForm(false);
    } catch {
      setReplyError('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Format reviewer name
  const reviewerName = review.rater_name || 'Anonymous';

  // Relative time formatting
  const createdDate = new Date(review.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let timeAgo: string;
  if (diffDays === 0) {
    timeAgo = 'Today';
  } else if (diffDays === 1) {
    timeAgo = 'Yesterday';
  } else if (diffDays < 30) {
    timeAgo = `${diffDays} days ago`;
  } else {
    timeAgo = createdDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const isOwnReview = currentUserId === review.rater_user_id;

  // Feature 4: Collect non-null dimension ratings
  const dimensionKeys: RatingDimension[] = [
    'rating_response_time',
    'rating_professionalism',
    'rating_equipment',
    'rating_communication',
    'rating_value',
  ];
  const activeDimensions = dimensionKeys.filter(
    (key) => review[key] != null && typeof review[key] === 'number'
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header: Stars + Reviewer info + Badges */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Star display */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                review.rater_type === 'client'
                  ? 'text-blue-600 border-blue-200'
                  : 'text-purple-600 border-purple-200'
              }`}
            >
              {review.rater_type === 'client' ? 'Client' : 'Company'}
            </Badge>

            {/* Feature 5: Verified Booking badge */}
            {review.booking_id && (
              <Badge
                variant="outline"
                className="text-[10px] text-green-600 border-green-200 bg-green-50"
              >
                <BadgeCheck className="h-3 w-3 mr-0.5" />
                Verified Booking
              </Badge>
            )}

            {/* Feature 8: Repeat Client badge */}
            {review.booking_count && review.booking_count > 1 && (
              <Badge
                variant="outline"
                className="text-[10px] text-indigo-600 border-indigo-200 bg-indigo-50"
              >
                <Repeat2 className="h-3 w-3 mr-0.5" />
                Booked {review.booking_count} times
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{reviewerName}</span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
        </div>

        {/* Report button (not shown for own reviews) */}
        {!isOwnReview && !reported && (
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="text-gray-300 hover:text-red-400 transition-colors p-1"
            title="Report this review"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
        {reported && (
          <span className="text-xs text-gray-400">Reported</span>
        )}
      </div>

      {/* Feature 4: Dimension ratings (small inline stars) */}
      {activeDimensions.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {activeDimensions.map((key) => {
            const value = review[key] as number;
            return (
              <div key={key} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">
                  {RATING_DIMENSION_LABELS[key]}:
                </span>
                <div className="flex items-center gap-px">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-2.5 w-2.5 ${
                        star <= value
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review text */}
      {review.review && (
        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
          {review.review}
        </p>
      )}

      {/* Flagged indicator */}
      {review.moderation_status === 'flagged' && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Under review
        </div>
      )}

      {/* Feature 6: Company Reply */}
      {currentReply && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-gray-200">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquareReply className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Company Response</span>
            <span className="text-[10px] text-gray-400">
              {new Date(currentReply.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentReply.reply_text}</p>
          {isCompanyAdmin && (
            <button
              type="button"
              onClick={() => {
                setReplyText(currentReply.reply_text);
                setShowReplyForm(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Edit reply
            </button>
          )}
        </div>
      )}

      {/* Feature 6: Reply button for company admin (no existing reply) */}
      {isCompanyAdmin && !currentReply && !showReplyForm && (
        <button
          type="button"
          onClick={() => setShowReplyForm(true)}
          className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700"
        >
          <MessageSquareReply className="h-3 w-3" />
          Reply to review
        </button>
      )}

      {/* Feature 6: Reply form */}
      {showReplyForm && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-blue-200">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Write your response..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-400">{replyText.length}/1000</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReplyForm(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplySubmit}
                disabled={submittingReply || !replyText.trim()}
                className="inline-flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 disabled:opacity-50"
              >
                {submittingReply ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {currentReply ? 'Update' : 'Reply'}
              </button>
            </div>
          </div>
          {replyError && (
            <p className="text-xs text-red-600 mt-1">{replyError}</p>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Review</h3>
            <p className="text-sm text-gray-600 mb-4">
              Why are you reporting this review? Our team will review your report.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Describe why this review is inappropriate..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {reportError && (
              <p className="text-sm text-red-600 mt-2">{reportError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={reporting || !reportReason.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reporting...
                  </>
                ) : (
                  'Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
