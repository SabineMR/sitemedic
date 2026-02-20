/**
 * Dashboard Quote Submission Page
 * Route: /dashboard/marketplace/[id]/quote
 *
 * Same validation as the public quote page but renders inside the dashboard layout
 * and redirects back to the dashboard event detail page after submission.
 */

import { createClient } from '@/lib/supabase/server';
import QuoteSubmissionForm from '@/components/marketplace/quote-submission/QuoteSubmissionForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardQuotePage({ params }: QuotePageProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('marketplace_events')
    .select(
      `
      id,
      event_name,
      event_type,
      status,
      quote_deadline,
      event_days(start_time, end_time)
    `
    )
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return (
      <div className="max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Event not found</AlertDescription>
        </Alert>
        <Link href="/dashboard/marketplace" className="text-sm text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  // Verify event is open
  if (event.status !== 'open') {
    return (
      <div className="max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This event is not open for quotes. Status: {event.status}
          </AlertDescription>
        </Alert>
        <Link href={`/dashboard/marketplace/${eventId}`} className="text-sm text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Event
        </Link>
      </div>
    );
  }

  // Verify deadline has not passed
  if (new Date(event.quote_deadline) < new Date()) {
    return (
      <div className="max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The quote deadline for this event has passed.
          </AlertDescription>
        </Alert>
        <Link href={`/dashboard/marketplace/${eventId}`} className="text-sm text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Event
        </Link>
      </div>
    );
  }

  // Calculate event duration from event_days
  let eventDurationHours = 8; // Default fallback

  if (event.event_days && event.event_days.length > 0) {
    eventDurationHours = 0;
    for (const day of event.event_days) {
      const [startHour, startMin] = day.start_time.split(':').map(Number);
      const [endHour, endMin] = day.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const durationMinutes = endMinutes - startMinutes;
      eventDurationHours += durationMinutes / 60;
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/dashboard/marketplace" className="text-blue-600 hover:text-blue-800">
          Marketplace
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/dashboard/marketplace/${eventId}`} className="text-blue-600 hover:text-blue-800">
          {event.event_name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Submit Quote</span>
      </nav>

      {/* Event Context */}
      <div className="max-w-2xl mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-1">{event.event_name}</h3>
          <p className="text-sm text-blue-800">
            Deadline: {new Date(event.quote_deadline).toLocaleDateString()} at{' '}
            {new Date(event.quote_deadline).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Quote Form */}
      <QuoteSubmissionForm
        eventId={eventId}
        eventDurationHours={eventDurationHours}
        redirectPath={`/dashboard/marketplace/${eventId}`}
      />
    </div>
  );
}
