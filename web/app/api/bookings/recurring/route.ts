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

    if (weeks > maxWeeks) {
      console.warn(`⚠️  Requested ${weeks} weeks, capped at ${maxWeeks}`);
    }

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
        { error: 'Parent booking not found', details: parentError?.message },
        { status: 404 }
      );
    }

    console.log(`🔄 Creating ${actualWeeks} recurring bookings (${recurrencePattern}) for parent ${parentBookingId}`);

    // Calculate date increment (7 for weekly, 14 for biweekly)
    const dayIncrement = recurrencePattern === 'weekly' ? 7 : 14;

    // Create child booking records
    const childBookings: any[] = [];
    const parentShiftDate = parseISO(parentBooking.shift_date);

    for (let i = 1; i <= actualWeeks; i++) {
      const childShiftDate = addDays(parentShiftDate, dayIncrement * i);
      const childShiftDateString = childShiftDate.toISOString().split('T')[0];

      // Determine status based on payment terms
      let childStatus = 'confirmed';
      if (parentBooking.payment_terms === 'full_prepay' || parentBooking.payment_terms === 'split_50_50') {
        // Prepay clients: Each child booking needs its own payment (Phase 6.5)
        // For now, create as pending_payment
        childStatus = 'pending_payment';
      }

      const childBooking = {
        // Inherit parent booking details
        client_id: parentBooking.client_id,
        medic_id: parentBooking.medic_id, // Same medic for all recurring bookings
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
        payment_terms: parentBooking.payment_terms,
        total_price: parentBooking.total_price,

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
        { error: 'Failed to create recurring bookings', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Created ${insertedBookings?.length || 0} recurring bookings`);

    return NextResponse.json({
      bookings: insertedBookings || [],
      count: insertedBookings?.length || 0,
    });

  } catch (error) {
    console.error('❌ Recurring bookings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
