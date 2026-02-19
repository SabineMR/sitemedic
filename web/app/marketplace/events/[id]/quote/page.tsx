/**
 * Quote Submission Page
 * Route: /marketplace/events/[eventId]/quote
 * Phase 34: Quote Submission & Comparison
 *
 * Allows a verified company to submit a detailed quote on an open event.
 * Loads event details to display context and verify the event is open.
 * Shows the multi-section quote submission form.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuoteSubmissionForm from '@/components/marketplace/quote-submission/QuoteSubmissionForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface QuotePageProps {
  params: { id: string };
}

export default async function QuotePage({ params }: QuotePageProps) {
  const eventId = params.id;
  const supabase = createClient();

  // =========================================================================
  // Fetch event details
  // =========================================================================

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
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Event not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // =========================================================================
  // Verify event is open
  // =========================================================================

  if (event.status !== 'open') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This event is not open for quotes. Status: {event.status}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // =========================================================================
  // Verify deadline has not passed
  // =========================================================================

  if (new Date(event.quote_deadline) < new Date()) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The quote deadline for this event has passed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // =========================================================================
  // Calculate event duration from event_days
  // =========================================================================

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

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="py-8 px-4">
      {/* Event Context */}
      <div className="max-w-2xl mx-auto mb-8">
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
      />
    </div>
  );
}
