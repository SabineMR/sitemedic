/**
 * POST /api/bookings/create-payment-intent
 * Phase 4.5: Create booking (status='pending') + Stripe Payment Intent for prepay clients
 *
 * CRITICAL SEQUENCE:
 * 1. Validate booking data
 * 2. Server-side pricing calculation
 * 3. Create booking with status='pending' (NOT 'confirmed')
 * 4. Fetch/create Stripe customer
 * 5. Create Stripe Payment Intent
 * 6. Return bookingId + clientSecret
 *
 * Webhook (payment_intent.succeeded) will update booking from 'pending' to 'confirmed'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

interface BookingRequest {
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftHours: number;
  siteName: string;
  siteAddress: string;
  sitePostcode: string;
  what3wordsAddress?: string; // Optional what3words address
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

    // Server-side pricing validation
    const validUrgencyPremiums = [0, 20, 50, 75];
    if (!validUrgencyPremiums.includes(body.pricing.urgencyPremiumPercent)) {
      return NextResponse.json(
        { error: 'Invalid urgency premium percent' },
        { status: 400 }
      );
    }

    // Validate shift hours matches pricing
    if (body.shiftHours !== body.pricing.shiftHours) {
      return NextResponse.json(
        { error: 'Shift hours mismatch in pricing' },
        { status: 400 }
      );
    }

    // STEP 1: Create booking with status='pending' (payment hasn't happened yet)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: body.clientId,
        status: 'pending', // CRITICAL: Not 'confirmed' until payment succeeds
        shift_date: body.shiftDate,
        shift_start_time: body.shiftStartTime,
        shift_end_time: body.shiftEndTime,
        shift_hours: body.shiftHours,
        site_name: body.siteName,
        site_address: body.siteAddress,
        site_postcode: body.sitePostcode,
        what3words_address: body.what3wordsAddress || null,
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

    // STEP 2: Fetch client to get/create Stripe customer
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('stripe_customer_id, contact_email, company_name')
      .eq('id', body.clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    let stripeCustomerId = client.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.contact_email,
        name: client.company_name,
        metadata: {
          client_id: body.clientId,
        },
      });

      stripeCustomerId = customer.id;

      // Update client with Stripe customer ID
      await supabase
        .from('clients')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', body.clientId);
    }

    // STEP 3: Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(body.pricing.total * 100), // GBP to pence
      currency: 'gbp',
      customer: stripeCustomerId,
      metadata: {
        booking_id: booking.id,
        client_id: body.clientId,
      },
      automatic_payment_methods: {
        enabled: true, // Enables 3D Secure automatically
      },
    });

    return NextResponse.json({
      bookingId: booking.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error in /api/bookings/create-payment-intent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
