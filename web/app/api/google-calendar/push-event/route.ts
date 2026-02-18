/**
 * Push Booking to Google Calendar
 *
 * Creates a Google Calendar event on a medic's primary calendar
 * when a booking is confirmed/assigned to them via the schedule board.
 *
 * Body: { bookingId: string, medicId: string }
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, createCalendarEvent } from '@/lib/google-calendar/client';
import type { GoogleCalendarEvent } from '@/lib/google-calendar/types';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingId, medicId } = await request.json();

  if (!bookingId || !medicId) {
    return NextResponse.json({ error: 'bookingId and medicId required' }, { status: 400 });
  }

  // Check if medic has Google Calendar connected
  const accessToken = await getValidAccessToken(medicId);
  if (!accessToken) {
    // Not connected — silently skip (not an error)
    return NextResponse.json({ pushed: false, reason: 'not_connected' });
  }

  // Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, site_name, site_address, shift_date, shift_start_time, shift_end_time,
      booking_reference, special_requirements,
      client:clients(company_name)
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Build Google Calendar event
  const clientData = booking.client as unknown as { company_name: string } | null;
  const clientName = clientData?.company_name || 'Unknown Client';
  const event: GoogleCalendarEvent = {
    summary: `SiteMedic: ${booking.site_name}`,
    location: booking.site_address || undefined,
    description: [
      `Booking Reference: ${booking.booking_reference || booking.id}`,
      `Client: ${clientName}`,
      booking.special_requirements ? `Special Requirements: ${booking.special_requirements}` : null,
      '',
      'Managed by SiteMedic',
    ]
      .filter(Boolean)
      .join('\n'),
    start: {
      dateTime: `${booking.shift_date}T${booking.shift_start_time}:00`,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: `${booking.shift_date}T${booking.shift_end_time}:00`,
      timeZone: 'Europe/London',
    },
  };

  const eventId = await createCalendarEvent(accessToken, event);

  if (eventId) {
    // Store the Google Calendar event ID on the booking for future updates/deletion
    await supabase
      .from('bookings')
      .update({ google_calendar_event_id: eventId })
      .eq('id', bookingId);

    return NextResponse.json({ pushed: true, eventId });
  }

  return NextResponse.json({ pushed: false, reason: 'api_error' });
}
