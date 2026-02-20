/**
 * React Query Hooks for Marketplace Quotes
 * Phase 34: Quote Submission & Comparison
 *
 * Hooks for fetching and caching quote data:
 *   - useQuoteList: Fetch quotes for an event (with filtering/sorting)
 *   - useQuoteDetail: Fetch a single quote with company details
 *   - useMyQuotes: Fetch quotes a company has submitted
 *
 * Follows the same pattern as useMarketplaceEvents (Phase 33).
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { MarketplaceQuoteWithCompany } from '@/lib/marketplace/quote-types';

// =============================================================================
// Filter Parameters Interface
// =============================================================================

export interface QuoteListFilterParams {
  eventId: string;
  sortBy?: 'best_value' | 'price_low' | 'price_high' | 'rating' | 'recent';
  filterQualification?: string;
  filterPriceMin?: number;
  filterPriceMax?: number;
  filterMinRating?: number;
  page?: number;
  limit?: number;
}

// =============================================================================
// Response Interfaces
// =============================================================================

export interface QuotesListResponse {
  quotes: MarketplaceQuoteWithCompany[];
  total: number;
  page: number;
  limit: number;
}

export interface QuoteDetailResponse {
  quote: MarketplaceQuoteWithCompany;
  company: {
    id: string;
    company_name: string;
    company_website: string | null;
    company_phone: string | null;
    company_email: string | null;
    company_address: string | null;
    insurance_provider: string | null;
    insurance_policy_number: string | null;
    insurance_expiry: string | null;
    certifications: string[];
    verification_status: string;
    rating: number;
    review_count: number;
  };
}

// =============================================================================
// Hook: Fetch Quote List for Event
// =============================================================================

/**
 * Fetch quotes for an event with optional filtering and sorting
 * Used in quote comparison/browsing views
 *
 * @param filters - QuoteListFilterParams (eventId is required, others optional)
 * @returns useQuery hook with QuotesListResponse
 */
export function useQuoteList(filters: QuoteListFilterParams) {
  return useQuery<QuotesListResponse>({
    queryKey: ['marketplace-quotes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });

      const res = await fetch(`/api/marketplace/quotes/list?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch quotes');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime)
  });
}

// =============================================================================
// Hook: Fetch Single Quote Detail
// =============================================================================

/**
 * Fetch a single quote with full company profile and details
 * Used in quote detail/expansion views
 *
 * @param quoteId - UUID of the quote to fetch
 * @returns useQuery hook with QuoteDetailResponse
 */
export function useQuoteDetail(quoteId: string | undefined) {
  return useQuery<QuoteDetailResponse>({
    queryKey: ['marketplace-quote', quoteId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch quote');
      }
      return res.json();
    },
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

// =============================================================================
// Hook: Fetch Company's Own Quotes
// =============================================================================

/**
 * Fetch all quotes a company has submitted (drafts and submitted)
 * Used in company dashboard to view submission history
 *
 * @param companyId - UUID of the company
 * @returns useQuery hook with QuotesListResponse (all statuses)
 */
export function useMyQuotes(companyId: string | undefined) {
  return useQuery<QuotesListResponse>({
    queryKey: ['my-marketplace-quotes', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/quotes/my-quotes?companyId=${companyId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch your quotes');
      }
      return res.json();
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
  });
}
