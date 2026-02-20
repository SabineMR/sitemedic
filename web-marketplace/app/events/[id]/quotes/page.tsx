/**
 * Client-Facing Quotes Page
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Route: /marketplace/events/[eventId]/quotes
 *
 * The event poster's view of all received quotes for their event.
 * Loads event details for header context, verifies the current user
 * is the event poster, then renders the QuoteListView component.
 *
 * Breadcrumb: Browse Events / Event Name / Quotes
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMarketplaceEvent } from '@/lib/queries/marketplace/events';
import QuoteListView from '@/components/marketplace/quote-comparison/QuoteListView';
import { EVENT_STATUS_LABELS } from '@/lib/marketplace/event-types';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function EventQuotesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data, isLoading, error } = useMarketplaceEvent(eventId);
  const event = data?.event;

  // Get current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
      setUserLoading(false);
    });
  }, []);

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading || userLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-5 w-64 mb-4" />
        <Skeleton className="h-8 w-96 mb-2" />
        <Skeleton className="h-5 w-48 mb-8" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Error / Not found
  // =========================================================================

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Event not found or could not be loaded.</p>
          <Link
            href="/events"
            className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
          >
            Back to Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Access control: only event poster can see quotes
  // =========================================================================

  const isEventPoster = currentUserId === event.posted_by;

  if (!isEventPoster) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Access Denied</p>
            <p className="text-sm text-amber-700 mt-1">
              Only the event poster can view received quotes.
            </p>
            <Link
              href={`/events/${eventId}`}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              Back to Event Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link href="/events" className="text-blue-600 hover:text-blue-800">
          Browse Events
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link
          href={`/events/${eventId}`}
          className="text-blue-600 hover:text-blue-800"
        >
          {event.event_name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Quotes</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Quotes for {event.event_name}
        </h1>
        <p className="text-sm text-gray-500">
          Status: {EVENT_STATUS_LABELS[event.status]} | {event.quote_count} quote
          {event.quote_count !== 1 ? 's' : ''} received
        </p>
      </div>

      {/* Quote List */}
      <QuoteListView
        eventId={eventId}
        eventStatus={event.status}
        eventType={event.event_type}
        isDepositPaid={false} /* Updated after award via AwardedEventDetails */
        isEventPoster={true}
        currentUserId={currentUserId || ''}
      />
    </div>
  );
}
