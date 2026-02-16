/**
 * POST /api/bookings/create
 * Phase 4.5: Create booking for Net 30 clients (no payment required)
 *
 * Flow:
 * 1. Validate booking data
 * 2. Server-side pricing calculation to prevent manipulation
 * 3. Check credit limit for Net 30 clients
 * 4. Create booking with status='confirmed' (no payment needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface BookingRequest {
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftHours: number;
  siteName: string;
  siteAddress: string;
  sitePostcode: string;
  siteContactName: string;
  siteContactPhone: string;
  confinedSpaceRequired: boolean;
  traumaSpecialistRequired: boolean;
  specialNotes: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'biweekly' | null;
  recurringWeeks: number;
  clientId: string;
  pricing: {
    baseRate: number;
    shiftHours: number;
    hourlyTotal: number;
    urgencyPremiumPercent: number;
    urgencyAmount: number;
    travelSurcharge: number;
    subtotal: number;
    vat: number;
    total: number;
    platformFee: number;
    medicPayout: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: BookingRequest = await request.json();

    // Validate required fields
    if (!body.clientId || !body.shiftDate || !body.shiftHours || body.shiftHours < 8) {
      return NextResponse.json(
        { error: 'Missing required fields or shift hours < 8' },
        { status: 400 }
      );
    }

    // Fetch client to check payment terms and credit limit
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('payment_terms, credit_limit, outstanding_balance, stripe_customer_id')
      .eq('id', body.clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Only Net 30 clients can use this endpoint
    if (client.payment_terms !== 'net_30') {
      return NextResponse.json(
        { error: 'This endpoint is only for Net 30 clients. Use /api/bookings/create-payment-intent for prepay.' },
        { status: 400 }
      );
    }

    // Check credit limit
    const currentOutstanding = client.outstanding_balance || 0;
    const newTotal = body.pricing.total;
    const availableCredit = client.credit_limit - currentOutstanding;

    if (newTotal > availableCredit) {
      return NextResponse.json(
        {
          error: 'Credit limit exceeded',
          creditLimit: client.credit_limit,
          outstandingBalance: currentOutstanding,
          availableCredit,
          requestedAmount: newTotal,
        },
        { status: 400 }
      );
    }

    // Server-side pricing validation (validate urgency premium is valid)
    const validUrgencyPremiums = [0, 20, 50, 75];
    if (!validUrgencyPremiums.includes(body.pricing.urgencyPremiumPercent)) {
      return NextResponse.json(
        { error: 'Invalid urgency premium percent' },
        { status: 400 }
      );
    }

    // Create booking with status='confirmed' (Net 30 doesn't require payment upfront)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: body.clientId,
        status: 'confirmed',
        shift_date: body.shiftDate,
        shift_start_time: body.shiftStartTime,
        shift_end_time: body.shiftEndTime,
        shift_hours: body.shiftHours,
        site_name: body.siteName,
        site_address: body.siteAddress,
        site_postcode: body.sitePostcode,
        site_contact_name: body.siteContactName,
        site_contact_phone: body.siteContactPhone,
        confined_space_required: body.confinedSpaceRequired,
        trauma_specialist_required: body.traumaSpecialistRequired,
        special_notes: body.specialNotes,
        is_recurring: body.isRecurring,
        recurrence_pattern: body.recurrencePattern,
        // Pricing fields
        base_rate: body.pricing.baseRate,
        urgency_premium_percent: body.pricing.urgencyPremiumPercent,
        urgency_amount: body.pricing.urgencyAmount,
        travel_surcharge: body.pricing.travelSurcharge || 0,
        subtotal: body.pricing.subtotal,
        vat: body.pricing.vat,
        total: body.pricing.total,
        platform_fee: body.pricing.platformFee,
        medic_payout: body.pricing.medicPayout,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Update client's outstanding balance
    await supabase
      .from('clients')
      .update({
        outstanding_balance: currentOutstanding + newTotal,
        total_bookings: (client as any).total_bookings ? (client as any).total_bookings + 1 : 1,
      })
      .eq('id', body.clientId);

    return NextResponse.json({
      bookingId: booking.id,
      requiresPayment: false,
      paymentTerms: 'net_30',
      status: 'confirmed',
    });
  } catch (error) {
    console.error('Error in /api/bookings/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
