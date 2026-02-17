/**
 * Payment Intent Creation API Route
 * Phase 6.5: Create Stripe Payment Intent with 3D Secure for prepay bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

interface CreatePaymentIntentRequest {
  bookingId: string;
  amount: number;
  clientId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Parse request body
    const body: CreatePaymentIntentRequest = await request.json();
    const { bookingId, amount, clientId } = body;

    if (!bookingId || !amount || !clientId) {
      return NextResponse.json(
        { error: 'bookingId, amount, and clientId are required' },
        { status: 400 }
      );
    }

    // Fetch booking from database
    // CRITICAL: Filter by org_id to prevent cross-org payment creation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Validate booking belongs to client
    if (booking.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Booking does not belong to client' },
        { status: 403 }
      );
    }

    // Validate amount matches booking total
    if (Math.abs(booking.total - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Amount does not match booking total' },
        { status: 400 }
      );
    }

    // Validate booking status is pending
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `Booking status must be 'pending', current status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Fetch client from database
    // CRITICAL: Filter by org_id to prevent cross-org payment processing
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('org_id', orgId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has stripe_customer_id, create if not
    let stripeCustomerId = client.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.contact_email,
        name: client.company_name,
        metadata: {
          client_id: clientId,
        },
      });

      stripeCustomerId = customer.id;

      // Update clients table with stripe_customer_id
      // IMPORTANT: Filter by org_id for safety
      const { error: updateError } = await supabase
        .from('clients')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', clientId)
        .eq('org_id', orgId);

      if (updateError) {
        console.error('Error updating client with stripe_customer_id:', updateError);
        return NextResponse.json(
          { error: 'Failed to update client record' },
          { status: 500 }
        );
      }
    }

    // Create Payment Intent with 3D Secure support
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert GBP to pence
      currency: 'gbp',
      customer: stripeCustomerId,
      metadata: {
        booking_id: bookingId,
        client_id: clientId,
      },
      description: `Booking ${booking.site_name} on ${booking.shift_date}`,
      automatic_payment_methods: { enabled: true }, // Enables 3D Secure
      capture_method: 'automatic', // Auto-capture on confirmation
    });

    // Insert into payments table
    // CRITICAL: Set org_id to ensure payment belongs to current org
    const { error: paymentError } = await supabase.from('payments').insert({
      org_id: orgId,
      booking_id: bookingId,
      client_id: clientId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      platform_fee: booking.platform_fee,
      medic_payout: booking.medic_payout,
      status: 'pending',
    });

    if (paymentError) {
      console.error('Error inserting payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment Intent creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
