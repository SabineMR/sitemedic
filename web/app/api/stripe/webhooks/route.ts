/**
 * POST /api/stripe/webhooks
 * Phase 4.5: Stripe webhook handler for payment events
 *
 * Handles:
 * - payment_intent.succeeded: Update booking from 'pending' to 'confirmed'
 * - payment_intent.payment_failed: Update booking to 'cancelled'
 *
 * CRITICAL: Verify signature BEFORE parsing event
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // CRITICAL: Verify webhook signature BEFORE parsing
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;
        const clientId = paymentIntent.metadata.client_id;

        if (!bookingId) {
          console.error('payment_intent.succeeded missing booking_id in metadata');
          return NextResponse.json({ received: true });
        }

        console.log(`✅ Payment succeeded for booking ${bookingId}`);

        // Update booking status from 'pending' to 'confirmed'
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Error updating booking status:', updateError);
        }

        // Update client total_bookings count
        if (clientId) {
          const { data: client } = await supabase
            .from('clients')
            .select('total_bookings')
            .eq('id', clientId)
            .single();

          if (client) {
            await supabase
              .from('clients')
              .update({
                total_bookings: (client.total_bookings || 0) + 1,
              })
              .eq('id', clientId);
          }
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;

        if (!bookingId) {
          console.error('payment_intent.payment_failed missing booking_id in metadata');
          return NextResponse.json({ received: true });
        }

        console.log(`❌ Payment failed for booking ${bookingId}`);

        // Update booking status to 'cancelled'
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Payment failed',
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Error updating booking status:', updateError);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }
}
