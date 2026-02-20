/**
 * Best-Value Quote Ranking Algorithm
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Calculates a composite score combining price (60%) and rating (40%)
 * to rank quotes by overall value. Both dimensions are normalised to
 * 0-100 before blending so that different scales don't skew results.
 *
 * Usage:
 *   import { rankQuotesByBestValue } from '@/lib/marketplace/quote-scoring';
 *   const ranked = rankQuotesByBestValue(quotes);
 *
 * Edge cases handled:
 *   - Single quote: returns score 100
 *   - All quotes same price: priceScore = 50
 *   - Tiebreaker: submitted_at DESC, then company_rating DESC
 */

// =============================================================================
// Types
// =============================================================================

/** Minimum shape required for scoring a quote */
export interface ScorableQuote {
  total_price: number;
  company_rating: number; // 0-5 star rating
  company_review_count: number;
}

/** A quote with all fields needed for ranking (including tiebreaker fields) */
export interface RankableQuote extends ScorableQuote {
  id: string;
  submitted_at: string | null;
}

/** A ranked quote with the computed bestValueScore attached */
export interface RankedQuote<T extends RankableQuote = RankableQuote> {
  quote: T;
  bestValueScore: number;
  rank: number;
}

// =============================================================================
// Core Algorithm
// =============================================================================

/**
 * Calculate best-value score for a single quote relative to all quotes.
 *
 * Formula:
 *   1. priceScore = (maxPrice - quotePrice) / (maxPrice - minPrice) * 100
 *      Lower price -> higher score. If all prices equal, priceScore = 50.
 *   2. ratingScore = (company_rating / 5) * 100
 *   3. bestValueScore = (priceScore * 0.6) + (ratingScore * 0.4)
 *
 * @param quote  The quote to score
 * @param allQuotes  All quotes in the comparison set (for price range)
 * @returns Integer score 0-100 (higher = better value)
 */
export function calculateBestValueScore(
  quote: ScorableQuote,
  allQuotes: Array<{ total_price: number }>
): number {
  // Edge case: single quote always scores 100
  if (allQuotes.length <= 1) {
    return 100;
  }

  // Find price range across all quotes
  const prices = allQuotes.map((q) => q.total_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Normalise price to 0-100 (lower price = higher score)
  let priceScore: number;
  if (priceRange === 0) {
    // All quotes are the same price — neutral score
    priceScore = 50;
  } else {
    priceScore = ((maxPrice - quote.total_price) / priceRange) * 100;
  }

  // Convert 5-star rating to 0-100
  const ratingScore = (quote.company_rating / 5) * 100;

  // Blend: 60% price, 40% rating
  const bestValueScore = priceScore * 0.6 + ratingScore * 0.4;

  return Math.round(bestValueScore);
}

// =============================================================================
// Ranking
// =============================================================================

/**
 * Rank an array of quotes by best-value score (descending).
 *
 * Tiebreakers (when scores are equal):
 *   1. submitted_at DESC (most recent first)
 *   2. company_rating DESC (higher-rated first)
 *
 * @param quotes  Array of quotes to rank
 * @returns Sorted array of RankedQuote objects with score and rank attached
 */
export function rankQuotesByBestValue<T extends RankableQuote>(
  quotes: T[]
): RankedQuote<T>[] {
  if (quotes.length === 0) return [];

  // Calculate scores for all quotes
  const scored = quotes.map((quote) => ({
    quote,
    bestValueScore: calculateBestValueScore(quote, quotes),
    rank: 0, // Populated after sort
  }));

  // Sort: score DESC, then submitted_at DESC, then rating DESC
  scored.sort((a, b) => {
    // Primary: best value score (higher is better)
    if (b.bestValueScore !== a.bestValueScore) {
      return b.bestValueScore - a.bestValueScore;
    }

    // Tiebreaker 1: submitted_at DESC (most recent first)
    const aTime = a.quote.submitted_at
      ? new Date(a.quote.submitted_at).getTime()
      : 0;
    const bTime = b.quote.submitted_at
      ? new Date(b.quote.submitted_at).getTime()
      : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }

    // Tiebreaker 2: company_rating DESC
    return b.quote.company_rating - a.quote.company_rating;
  });

  // Assign ranks (1-indexed)
  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scored;
}
