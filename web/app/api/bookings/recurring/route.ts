/**
 * Recurring Bookings API
 * Phase 4.5: Create recurring booking instances
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addDays, parseISO } from 'date-fns';

interface RecurringRequest {
  parentBookingId: string;
  recurrencePattern: 'weekly' | 'biweekly';
  weeks: number;
}

export async function POST(request: Request) {
  try {
    const { parentBookingId, recurrencePattern, weeks }: RecurringRequest = await request.json();

    if (!parentBookingId || !recurrencePattern || !weeks) {
      return NextResponse.json(
        { error: 'parentBookingId, recurrencePattern, and weeks are required' },
        { status: 400 }
      );
    }

    // Maximum 52 recurring instances (1 year cap)
    const maxWeeks = 52;
    const actualWeeks = Math.min(weeks, maxWeeks);

    const supabase = await createClient();

    // Fetch parent booking
    const { data: parentBooking, error: parentError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', parentBookingId)
      .single();

    if (parentError || !parentBooking) {
      console.error('❌ Failed to fetch parent booking:', parentError);
      return NextResponse.json(
        { error: 'Parent booking not found' },
        { status: 404 }
      );
    }

    // Determine child status based on client's payment terms
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('payment_terms')
      .eq('id', parentBooking.client_id)
      .single();

    const clientPaymentTerms = clientRecord?.payment_terms || 'prepay';

    // Calculate date increment (7 for weekly, 14 for biweekly)
    const dayIncrement = recurrencePattern === 'weekly' ? 7 : 14;

    // Create child booking records
    const childBookings: any[] = [];
    const parentShiftDate = parseISO(parentBooking.shift_date);

    for (let i = 1; i <= actualWeeks; i++) {
      const childShiftDate = addDays(parentShiftDate, dayIncrement * i);
      const childShiftDateString = childShiftDate.toISOString().split('T')[0];

      // Net 30 clients: auto-confirm (invoiced later). Prepay: pending payment.
      const childStatus = clientPaymentTerms === 'net_30' ? 'confirmed' : 'pending';

      const childBooking = {
        // Inherit parent booking details
        org_id: parentBooking.org_id,
        client_id: parentBooking.client_id,
        medic_id: parentBooking.medic_id,
        shift_date: childShiftDateString,
        shift_start_time: parentBooking.shift_start_time,
        shift_end_time: parentBooking.shift_end_time,
        shift_hours: parentBooking.shift_hours,
        site_name: parentBooking.site_name,
        site_address: parentBooking.site_address,
        site_postcode: parentBooking.site_postcode,
        site_contact_name: parentBooking.site_contact_name,
        site_contact_phone: parentBooking.site_contact_phone,
        confined_space_required: parentBooking.confined_space_required,
        trauma_specialist_required: parentBooking.trauma_specialist_required,
        special_notes: parentBooking.special_notes,
        base_rate: parentBooking.base_rate,
        urgency_premium_percent: parentBooking.urgency_premium_percent,
        urgency_amount: parentBooking.urgency_amount,
        travel_surcharge: parentBooking.travel_surcharge,
        subtotal: parentBooking.subtotal,
        vat: parentBooking.vat,
        total: parentBooking.total,
        platform_fee: parentBooking.platform_fee,
        medic_payout: parentBooking.medic_payout,

        // Recurring metadata
        is_recurring: true,
        recurrence_pattern: recurrencePattern,
        parent_booking_id: parentBookingId,

        // Status
        status: childStatus,
      };

      childBookings.push(childBooking);
    }

    // Insert all child bookings in batch
    const { data: insertedBookings, error: insertError } = await supabase
      .from('bookings')
      .insert(childBookings)
      .select('id, shift_date');

    if (insertError) {
      console.error('❌ Failed to create recurring bookings:', insertError);
      return NextResponse.json(
        { error: 'Failed to create recurring bookings' },
        { status: 500 }
      );
    }

    // Set recurring_until on the parent booking to the last child's shift date
    if (childBookings.length > 0) {
      const lastChildDate = childBookings[childBookings.length - 1].shift_date;
      await supabase
        .from('bookings')
        .update({ recurring_until: lastChildDate })
        .eq('id', parentBookingId);
    }

    return NextResponse.json({
      bookings: insertedBookings || [],
      count: insertedBookings?.length || 0,
    });

  } catch (error) {
    console.error('❌ Recurring bookings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
