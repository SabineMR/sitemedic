'use client';

/**
 * MarketplaceRatingForm Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 * Enhanced: Phase 36 Extension — Feature 4 (Multi-Dimension Ratings)
 *
 * Rating form for marketplace events with blind window awareness.
 * Client raters see optional dimension rating inputs.
 */

import { useState, useCallback } from 'react';
import { Star, Loader2, CheckCircle2, Clock, Info } from 'lucide-react';
import {
  RATING_DIMENSION_LABELS,
  type RatingDimension,
} from '@/lib/marketplace/rating-types';

// =============================================================================
// Types
// =============================================================================

interface ExistingRating {
  rating: number;
  review: string | null;
  rating_response_time?: number | null;
  rating_professionalism?: number | null;
  rating_equipment?: number | null;
  rating_communication?: number | null;
  rating_value?: number | null;
}

interface MarketplaceRatingFormProps {
  eventId: string;
  existingRating?: ExistingRating;
  onRatingSubmitted?: () => void;
  raterType: 'client' | 'company';
  canRate: boolean;
  blindWindowActive: boolean;
  blindWindowExpiresAt: string | null;
}

// =============================================================================
// Star Rating Input (reused pattern from RatingForm)
// =============================================================================

function StarRatingInput({
  value,
  onChange,
  disabled,
  size = 'lg',
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';

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
              className={`${starSize} transition-colors ${
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
// Main Component
// =============================================================================

export function MarketplaceRatingForm({
  eventId,
  existingRating,
  onRatingSubmitted,
  raterType,
  canRate,
  blindWindowActive,
  blindWindowExpiresAt,
}: MarketplaceRatingFormProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Feature 4: Dimension ratings state (client raters only)
  const dimensionKeys: RatingDimension[] = [
    'rating_response_time',
    'rating_professionalism',
    'rating_equipment',
    'rating_communication',
    'rating_value',
  ];

  const [dimensions, setDimensions] = useState<Record<RatingDimension, number>>({
    rating_response_time: existingRating?.rating_response_time || 0,
    rating_professionalism: existingRating?.rating_professionalism || 0,
    rating_equipment: existingRating?.rating_equipment || 0,
    rating_communication: existingRating?.rating_communication || 0,
    rating_value: existingRating?.rating_value || 0,
  });

  const isEditing = !!existingRating;

  const handleDimensionChange = (key: RatingDimension, value: number) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
  };

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
        // Build payload
        const payload: Record<string, unknown> = {
          rating,
          review: review.trim() || null,
        };

        // Include dimension ratings for client raters (only non-zero values)
        if (raterType === 'client') {
          for (const key of dimensionKeys) {
            if (dimensions[key] > 0) {
              payload[key] = dimensions[key];
            }
          }
        }

        const res = await fetch(`/api/marketplace/events/${eventId}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to submit rating');
          return;
        }

        setSubmitted(true);
        onRatingSubmitted?.();
      } catch (err) {
        console.error('[MarketplaceRatingForm] Submit error:', err);
        setError('Failed to submit rating. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [eventId, rating, review, dimensions, raterType, dimensionKeys, onRatingSubmitted]
  );

  // Rating window closed
  if (!canRate && !existingRating) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <p className="text-sm text-gray-600">
          The rating window for this event has closed.
        </p>
      </div>
    );
  }

  // Success state after submitting
  if (submitted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              {isEditing ? 'Rating updated successfully!' : 'Rating submitted successfully!'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        {blindWindowActive && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Your rating will be visible after both parties have rated
              {blindWindowExpiresAt && (
                <> or after {new Date(blindWindowExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
              )}
              .
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Blind window info */}
      {blindWindowActive && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Your rating will be visible after both parties have rated
            {blindWindowExpiresAt && (
              <> or after {new Date(blindWindowExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
            .
          </p>
        </div>
      )}

      {/* Overall Star Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing
            ? 'Update your rating'
            : raterType === 'client'
              ? 'Rate this company'
              : 'Rate this client'}
        </label>
        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={submitting}
        />
      </div>

      {/* Feature 4: Dimension Ratings (client raters only) */}
      {raterType === 'client' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Rate specific aspects (optional):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dimensionKeys.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2 rounded-md bg-gray-50">
                <span className="text-xs text-gray-600">
                  {RATING_DIMENSION_LABELS[key]}
                </span>
                <StarRatingInput
                  value={dimensions[key]}
                  onChange={(val) => handleDimensionChange(key, val)}
                  disabled={submitting}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Textarea */}
      <div>
        <label htmlFor="marketplace-review" className="block text-sm font-medium text-gray-700 mb-1">
          Review (optional)
        </label>
        <textarea
          id="marketplace-review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={submitting}
          maxLength={2000}
          rows={3}
          placeholder={
            raterType === 'client'
              ? 'Share your experience working with this company...'
              : 'Share your experience working with this client...'
          }
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
