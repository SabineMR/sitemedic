/**
 * Quote List View (Ranked Comparison)
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Top-level component for the client's quote browsing page.
 * Fetches quotes for an event, applies best-value ranking (client-side),
 * and renders the SortFilterBar + QuoteRankRow list.
 *
 * Supports:
 *   - 5 sort modes (best value, price low/high, rating, recent)
 *   - Filters: qualification, price range, minimum rating
 *   - Loading skeleton (5 placeholder rows)
 *   - Empty state
 */

'use client';

import { useMemo, useState } from 'react';
import { useQuoteList, type QuoteListFilterParams } from '@/lib/queries/marketplace/quotes';
import { rankQuotesByBestValue, type RankableQuote } from '@/lib/marketplace/quote-scoring';
import type { MarketplaceQuoteWithCompany } from '@/lib/marketplace/quote-types';
import type { EventStatus } from '@/lib/marketplace/event-types';
import SortFilterBar, { type SortMode, type QuoteFilters } from './SortFilterBar';
import QuoteRankRow from './QuoteRankRow';
import AwardConfirmationModal from '@/components/marketplace/award/AwardConfirmationModal';
import AwardedEventDetails from '@/components/marketplace/award/AwardedEventDetails';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSearch } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface QuoteListViewProps {
  eventId: string;
  eventStatus: EventStatus;
  eventType?: string;
  isDepositPaid: boolean;
  isEventPoster: boolean;
  currentUserId: string;
}

// =============================================================================
// Component
// =============================================================================

export default function QuoteListView({
  eventId,
  eventStatus,
  eventType = 'other',
  isDepositPaid,
  isEventPoster,
  currentUserId,
}: QuoteListViewProps) {
  const [sortMode, setSortMode] = useState<SortMode>('best_value');
  const [filters, setFilters] = useState<QuoteFilters>({
    qualification: '',
    priceMin: '',
    priceMax: '',
    minRating: '',
  });
  const [awardQuoteId, setAwardQuoteId] = useState<string | null>(null);
  const [awardModalOpen, setAwardModalOpen] = useState(false);

  // Build filter params for API call
  const filterParams: QuoteListFilterParams = useMemo(
    () => ({
      eventId,
      sortBy: sortMode,
      filterQualification: filters.qualification && filters.qualification !== 'any'
        ? filters.qualification
        : undefined,
      filterPriceMin: filters.priceMin ? parseFloat(filters.priceMin) : undefined,
      filterPriceMax: filters.priceMax ? parseFloat(filters.priceMax) : undefined,
      filterMinRating: filters.minRating && filters.minRating !== 'any-rating'
        ? parseFloat(filters.minRating)
        : undefined,
    }),
    [eventId, sortMode, filters]
  );

  const { data, isLoading, error } = useQuoteList(filterParams);

  // Apply client-side best-value ranking when sort mode is 'best_value'
  const rankedQuotes = useMemo(() => {
    if (!data?.quotes || data.quotes.length === 0) return [];

    if (sortMode === 'best_value') {
      // Build RankableQuote array for the scoring algorithm
      const rankable: (MarketplaceQuoteWithCompany & RankableQuote)[] = data.quotes.map((q) => ({
        ...q,
        total_price: q.total_price,
        company_rating: q.company_rating,
        company_review_count: q.company_review_count,
        submitted_at: q.submitted_at,
      }));

      const ranked = rankQuotesByBestValue(rankable);
      return ranked;
    }

    // For other sort modes, use server-side order with default scores
    return data.quotes.map((q, idx) => ({
      quote: q as MarketplaceQuoteWithCompany & RankableQuote,
      bestValueScore: 0, // Not relevant for non-best-value sorts
      rank: idx + 1,
    }));
  }, [data, sortMode]);

  // =========================================================================
  // Loading State
  // =========================================================================

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Error State
  // =========================================================================

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center">
        <p className="text-sm text-red-700">Failed to load quotes. Please try again.</p>
      </div>
    );
  }

  // =========================================================================
  // Empty State
  // =========================================================================

  if (!data || data.quotes.length === 0) {
    return (
      <div className="space-y-4">
        <SortFilterBar
          sortMode={sortMode}
          filters={filters}
          onSortChange={setSortMode}
          onFilterChange={setFilters}
        />
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <FileSearch className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No quotes received yet</h3>
          <p className="text-sm text-gray-500">
            Quotes from medical companies will appear here once they respond to your event.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Award handler
  // =========================================================================

  const handleAward = (quoteId: string) => {
    setAwardQuoteId(quoteId);
    setAwardModalOpen(true);
  };

  // =========================================================================
  // Render — Awarded state
  // =========================================================================

  if (eventStatus === 'awarded') {
    return (
      <div className="space-y-6">
        <AwardedEventDetails eventId={eventId} />

        {/* Still show quotes for reference */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">All Quotes</h3>
          <div className="space-y-3 opacity-75">
            {rankedQuotes.map((ranked) => (
              <QuoteRankRow
                key={ranked.quote.id}
                quote={ranked.quote}
                rank={ranked.rank}
                bestValueScore={ranked.bestValueScore}
                eventStatus={eventStatus}
                isDepositPaid={isDepositPaid}
                isAuthor={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render — Normal state
  // =========================================================================

  const selectedQuote = awardQuoteId
    ? rankedQuotes.find((r) => r.quote.id === awardQuoteId)?.quote
    : null;

  return (
    <div className="space-y-4">
      <SortFilterBar
        sortMode={sortMode}
        filters={filters}
        onSortChange={setSortMode}
        onFilterChange={setFilters}
      />

      {/* Quote count */}
      <p className="text-sm text-gray-500">
        {data.total} quote{data.total !== 1 ? 's' : ''} received
      </p>

      {/* Ranked list */}
      <div className="space-y-3">
        {rankedQuotes.map((ranked) => (
          <QuoteRankRow
            key={ranked.quote.id}
            quote={ranked.quote}
            rank={ranked.rank}
            bestValueScore={ranked.bestValueScore}
            eventStatus={eventStatus}
            isDepositPaid={isDepositPaid}
            isAuthor={false}
            onAward={isEventPoster ? handleAward : undefined}
          />
        ))}
      </div>

      {/* Award Confirmation Modal */}
      {selectedQuote && (
        <AwardConfirmationModal
          open={awardModalOpen}
          onOpenChange={setAwardModalOpen}
          eventId={eventId}
          quoteId={selectedQuote.id}
          companyName={selectedQuote.company_name}
          totalPrice={selectedQuote.total_price}
          eventType={eventType}
        />
      )}
    </div>
  );
}
