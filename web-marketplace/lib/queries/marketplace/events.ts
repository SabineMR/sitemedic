/**
 * React Query hooks for marketplace event discovery
 *
 * Phase 33: Event Posting & Discovery — Plan 03
 *
 * Uses the API routes from Plan 01:
 *   GET /api/marketplace/events (list with filters)
 *   GET /api/marketplace/events/:id (single event)
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { MarketplaceEventWithDetails } from '@/lib/marketplace/event-types';

export interface EventFilterParams {
  status?: string;
  event_type?: string;
  role?: string;
  lat?: number;
  lng?: number;
  radius_miles?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  posted_by?: string;
}

interface EventsResponse {
  events: MarketplaceEventWithDetails[];
  total: number;
  page: number;
  limit: number;
}

interface EventResponse {
  event: MarketplaceEventWithDetails;
}

/**
 * Fetch paginated events list with filters
 */
export function useMarketplaceEvents(filters: EventFilterParams) {
  return useQuery<EventsResponse>({
    queryKey: ['marketplace-events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const res = await fetch(`/api/marketplace/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
  });
}

/**
 * Fetch a single event by ID with all details
 */
export function useMarketplaceEvent(eventId: string | undefined) {
  return useQuery<EventResponse>({
    queryKey: ['marketplace-event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json();
    },
    enabled: !!eventId,
  });
}
