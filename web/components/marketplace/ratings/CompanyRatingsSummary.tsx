'use client';

/**
 * CompanyRatingsSummary Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 *
 * Google Reviews-style display for company profiles:
 * - Large aggregate star rating with count
 * - Rating distribution bar chart (5 bars, one per star level)
 * - Scrollable paginated list of individual ReviewCard components
 */

import { useState, useEffect, useCallback } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { ReviewCard } from './ReviewCard';
import type { MarketplaceRating } from '@/lib/marketplace/rating-types';

// =============================================================================
// Types
// =============================================================================

interface CompanyRatingsSummaryProps {
  companyId: string;
  averageRating: number;
  reviewCount: number;
}

interface ReviewsData {
  ratings: MarketplaceRating[];
  distribution: Record<number, number>;
  total: number;
}

// =============================================================================
// Component
// =============================================================================

export function CompanyRatingsSummary({
  companyId,
  averageRating,
  reviewCount,
}: CompanyRatingsSummaryProps) {
  const [reviews, setReviews] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const perPage = 10;

  const fetchReviews = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/marketplace/companies/${companyId}/reviews?page=${pageNum}&limit=${perPage}`
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
        setCurrentUserId(data.currentUserId);
      }
    } catch (err) {
      console.error('[CompanyRatingsSummary] Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (reviewCount > 0) {
      fetchReviews(1);
    }
  }, [reviewCount, fetchReviews]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReviews(newPage);
  };

  const totalPages = Math.ceil(reviewCount / perPage);

  // Build distribution from fetched data or fallback to empty
  const distribution = reviews?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-6">
      {/* Aggregate Rating Display */}
      <div className="flex items-start gap-6">
        {/* Big number + stars */}
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">
            {averageRating > 0 ? averageRating.toFixed(1) : '--'}
          </p>
          <div className="flex items-center gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {reviewCount} review{reviewCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((starLevel) => {
            const count = distribution[starLevel] || 0;
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={starLevel} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3 text-right">{starLevel}</span>
                <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review list */}
      {reviewCount === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No reviews yet. Reviews will appear here once clients rate this company.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {reviews?.ratings.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
