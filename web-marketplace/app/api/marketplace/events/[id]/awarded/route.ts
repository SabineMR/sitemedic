/**
 * GET /api/marketplace/events/[id]/awarded
 * Phase 35: Award Flow & Payment — Plan 04
 *
 * Returns awarded event details with client contact information.
 * Contact details ONLY revealed if BOTH:
 * 1. Event status is 'awarded'
 * 2. Deposit has been paid (booking with deposit_payment_intent_id exists)
 *
 * Access: winning company admin or event poster only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('marketplace_events')
    .select('id, event_name, event_type, location_address, location_postcode, event_description, posted_by, status')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Fetch event days
  const { data: eventDays } = await supabase
    .from('event_days')
    .select('event_date, start_time, end_time')
    .eq('event_id', eventId)
    .order('event_date', { ascending: true });

  // Fetch awarded quote
  const { data: awardedQuote } = await supabase
    .from('marketplace_quotes')
    .select('id, company_id, total_price, awarded_at, staffing_plan')
    .eq('event_id', eventId)
    .eq('status', 'awarded')
    .single();

  if (!awardedQuote) {
    return NextResponse.json({ error: 'No awarded quote found' }, { status: 404 });
  }

  // Access control: only winning company admin or event poster
  const { data: winningCompany } = await supabase
    .from('marketplace_companies')
    .select('id, company_name, admin_user_id')
    .eq('id', awardedQuote.company_id)
    .single();

  const isWinningCompany = winningCompany?.admin_user_id === user.id;
  const isEventPoster = event.posted_by === user.id;

  if (!isWinningCompany && !isEventPoster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check deposit paid (contact gating rule)
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, deposit_amount, deposit_percent, remainder_amount, remainder_due_at, deposit_payment_intent_id')
    .eq('marketplace_event_id', eventId)
    .eq('source', 'marketplace')
    .not('deposit_payment_intent_id', 'is', null)
    .limit(1)
    .single();

  const isAwarded = event.status === 'awarded';
  const isDepositPaid = !!booking?.deposit_payment_intent_id;
  const contactRevealed = isAwarded && isDepositPaid;

  // Build response
  let clientContact: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  } | null = null;

  if (contactRevealed && isWinningCompany) {
    // Fetch client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', event.posted_by)
      .single();

    if (clientProfile) {
      clientContact = {
        name: `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Client',
        email: clientProfile.email,
        phone: clientProfile.phone || null,
        address: event.location_address || event.location_postcode || null,
      };
    }
  }

  return NextResponse.json({
    event: {
      id: event.id,
      event_name: event.event_name,
      event_type: event.event_type,
      location_address: contactRevealed ? event.location_address : null,
      location_postcode: event.location_postcode,
      event_description: event.event_description,
      status: event.status,
      days: eventDays || [],
    },
    award: {
      awarded_at: awardedQuote.awarded_at,
      total_price: awardedQuote.total_price,
      deposit_amount: booking?.deposit_amount || null,
      deposit_percent: booking?.deposit_percent || null,
      remainder_amount: booking?.remainder_amount || null,
      remainder_due_at: booking?.remainder_due_at || null,
    },
    client: clientContact,
    company: winningCompany
      ? {
          name: winningCompany.company_name,
        }
      : null,
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
        }
      : null,
    contactRevealed,
    viewerRole: isWinningCompany ? 'company' : 'client',
  });
}
