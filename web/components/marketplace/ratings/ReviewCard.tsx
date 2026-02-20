'use client';

/**
 * ReviewCard Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 *
 * Displays a single marketplace review with star rating, reviewer info,
 * review text, and a report button for flagging inappropriate content.
 */

import { useState } from 'react';
import { Star, Flag, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MarketplaceRating } from '@/lib/marketplace/rating-types';

// =============================================================================
// Types
// =============================================================================

interface ReviewCardProps {
  review: MarketplaceRating;
  currentUserId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  // Format reviewer name: "First L."
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header: Stars + Reviewer info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
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
