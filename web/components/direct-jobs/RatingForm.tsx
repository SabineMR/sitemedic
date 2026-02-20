'use client';

/**
 * RatingForm Component
 * Phase 34.1: Self-Procured Jobs -- Plan 05
 *
 * Interactive 5-star rating form with optional review text.
 * Used for bidirectional job ratings (company rates client, client rates company).
 *
 * Features:
 *   - Clickable and hoverable star selector (1-5 stars using Lucide Star)
 *   - Optional review textarea (max 2000 chars)
 *   - Pre-fills when editing an existing rating
 *   - Loading, error, and success states
 *   - Submits to POST /api/direct-jobs/[id]/ratings
 */

import { useState, useCallback } from 'react';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ExistingRating {
  rating: number;
  review: string | null;
}

interface RatingFormProps {
  jobId: string;
  existingRating?: ExistingRating;
  onRatingSubmitted?: () => void;
}

// =============================================================================
// Star Rating Input
// =============================================================================

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600">
          {value} / 5
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Star Display (read-only)
// =============================================================================

export function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RatingForm({ jobId, existingRating, onRatingSubmitted }: RatingFormProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isEditing = !!existingRating;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (rating === 0) {
        setError('Please select a star rating');
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/direct-jobs/${jobId}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            review: review.trim() || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to submit rating');
          return;
        }

        setSubmitted(true);
        onRatingSubmitted?.();
      } catch (err) {
        console.error('[RatingForm] Submit error:', err);
        setError('Failed to submit rating. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [jobId, rating, review, onRatingSubmitted]
  );

  // Success state
  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">
            {isEditing ? 'Rating updated successfully!' : 'Rating submitted successfully!'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <StarDisplay rating={rating} size="sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing ? 'Update your rating' : 'Rate this job'}
        </label>
        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={submitting}
        />
      </div>

      {/* Review Textarea */}
      <div>
        <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-1">
          Review (optional)
        </label>
        <textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={submitting}
          maxLength={2000}
          rows={3}
          placeholder="Share your experience working with this client..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {review.length} / 2000
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          isEditing ? 'Update Rating' : 'Submit Rating'
        )}
      </button>
    </form>
  );
}
