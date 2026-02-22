'use client';

import { useState } from 'react';

export function MarketplaceRatingForm({
  eventId,
  existingRating,
  onRatingSubmitted,
  canRate,
}: {
  eventId: string;
  existingRating?: { rating: number; review: string | null };
  onRatingSubmitted?: () => void;
  raterType?: 'client' | 'company';
  canRate: boolean;
  blindWindowActive?: boolean;
  blindWindowExpiresAt?: string | null;
}) {
  const [rating, setRating] = useState(existingRating?.rating ?? 5);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-gray-600">Event: {eventId}</p>
      {!canRate ? (
        <p className="text-gray-500">Rating is currently unavailable.</p>
      ) : (
        <>
          <label className="block">
            <span className="text-xs text-gray-500">Rating</span>
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="mt-1 w-24 rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={() => onRatingSubmitted?.()}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Save Rating
          </button>
        </>
      )}
    </div>
  );
}
