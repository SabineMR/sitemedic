/**
 * Stripe Webhooks Edge Function
 * Phase 1.5: Process Stripe webhook events for Connect, payments, transfers
 *
 * Handles:
 * - account.updated: Track Express account onboarding completion
 * - payment_intent.succeeded: Update payment and booking status
 * - payment_intent.payment_failed: Record payment failure
 * - transfer.created: Track medic payouts
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../_shared/stripe.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req: Request) => {
  try {
    // Step 1: Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Webhook received: ${event.type}`);

    // Step 3: Route by event type
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      case 'transfer.created':
        await handleTransferCreated(event);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Event: account.updated
 * Track Express account onboarding completion
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  console.log(`🏦 Account updated: ${account.id}`);
  console.log(`   charges_enabled: ${account.charges_enabled}`);
  console.log(`   payouts_enabled: ${account.payouts_enabled}`);
  console.log(`   details_submitted: ${account.details_submitted}`);

  // If both charges and payouts are enabled, onboarding is complete
  if (account.charges_enabled && account.payouts_enabled) {
    const { error } = await supabase
      .from('medics')
      .update({ stripe_onboarding_complete: true })
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating medic onboarding status:', error);
    } else {
      console.log(`✅ Medic onboarding complete for account ${account.id}`);
    }
  } else {
    console.log(`⏳ Onboarding not yet complete for account ${account.id}`);
  }
}

/**
 * Event: payment_intent.succeeded
 * Update payment and booking status
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { booking_id, client_id } = paymentIntent.metadata;

  console.log(`💰 Payment succeeded: ${paymentIntent.id}`);
  console.log(`   Amount: £${(paymentIntent.amount / 100).toFixed(2)}`);
  console.log(`   Booking: ${booking_id}`);

  // Step 1: Update payments table
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge as string,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (paymentError) {
    console.error('Error updating payment status:', paymentError);
  } else {
    console.log(`✅ Payment record updated: ${paymentIntent.id}`);
  }

  // Step 2: Update booking status (if currently 'pending')
  if (booking_id) {
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking_id)
      .eq('status', 'pending'); // Only update if still pending

    if (bookingError) {
      console.error('Error updating booking status:', bookingError);
    } else {
      console.log(`✅ Booking confirmed: ${booking_id}`);
    }
  }
}

/**
 * Event: payment_intent.payment_failed
 * Record payment failure
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { booking_id } = paymentIntent.metadata;

  const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';

  console.log(`❌ Payment failed: ${paymentIntent.id}`);
  console.log(`   Reason: ${failureMessage}`);
  console.log(`   Booking: ${booking_id}`);

  // Update payments table with failure reason
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
      failure_code: paymentIntent.last_payment_error?.code || null,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Error updating payment failure:', error);
  } else {
    console.log(`⚠️  Payment failure recorded: ${paymentIntent.id}`);
  }
}

/**
 * Event: transfer.created
 * Track medic payout
 */
async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  const { timesheet_id, medic_id } = transfer.metadata;

  console.log(`💸 Transfer created: ${transfer.id}`);
  console.log(`   Amount: £${(transfer.amount / 100).toFixed(2)}`);
  console.log(`   Medic: ${medic_id}`);
  console.log(`   Timesheet: ${timesheet_id}`);

  if (timesheet_id) {
    // Update timesheets table with transfer ID
    const { error } = await supabase
      .from('timesheets')
      .update({ stripe_transfer_id: transfer.id })
      .eq('id', timesheet_id);

    if (error) {
      console.error('Error updating timesheet with transfer ID:', error);
    } else {
      console.log(`✅ Timesheet updated with transfer: ${timesheet_id}`);
    }
  }
}
