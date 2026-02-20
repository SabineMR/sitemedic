/**
 * charge-remainder-payment Edge Function
 * Phase 35: Award Flow & Payment — Plan 03
 *
 * Scheduled via pg_cron (daily at 8 AM UTC).
 * Queries marketplace bookings with due/overdue remainders and creates
 * off-session PaymentIntents to charge the saved card.
 *
 * Retry logic: 3 attempts over 7 days
 *   - Attempt 1: remainder_due_at (initial charge)
 *   - Attempt 2: 1 day after first failure
 *   - Attempt 3: 3 days after second failure
 *   - After 3 failures: skip (escalation handled by admin alert)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe } from '../_shared/stripe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_RETRY_ATTEMPTS = 3;

serve(async (req) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const startTime = Date.now();
    const now = new Date().toISOString();

    console.log('Marketplace Remainder Charge job started at', now);

    // Query initial charges: due and not yet attempted
    const { data: initialCharges, error: initialError } = await supabase
      .from('bookings')
      .select('id, marketplace_event_id, remainder_amount, stripe_customer_id, stripe_payment_method_id, remainder_failed_attempts')
      .eq('source', 'marketplace')
      .lte('remainder_due_at', now)
      .is('remainder_paid_at', null)
      .is('remainder_payment_intent_id', null)
      .eq('remainder_failed_attempts', 0);

    if (initialError) {
      console.error('Error fetching initial charges:', initialError);
      return new Response(JSON.stringify({ error: 'Query failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query retries: failed but under max attempts
    // Retry schedule: attempt 1 → +1 day, attempt 2 → +3 days, attempt 3 → +7 days
    const { data: retryCharges, error: retryError } = await supabase
      .from('bookings')
      .select('id, marketplace_event_id, remainder_amount, stripe_customer_id, stripe_payment_method_id, remainder_failed_attempts, remainder_last_failed_at')
      .eq('source', 'marketplace')
      .is('remainder_paid_at', null)
      .gt('remainder_failed_attempts', 0)
      .lt('remainder_failed_attempts', MAX_RETRY_ATTEMPTS);

    if (retryError) {
      console.error('Error fetching retry charges:', retryError);
    }

    // Filter retries by timing
    const retryIntervalDays = [1, 3, 7]; // Days after attempt 1, 2, 3
    const dueRetries = (retryCharges || []).filter((booking) => {
      if (!booking.remainder_last_failed_at) return false;
      const lastFailed = new Date(booking.remainder_last_failed_at);
      const attempt = booking.remainder_failed_attempts;
      const intervalDays = retryIntervalDays[attempt - 1] || 7;
      const retryAfter = new Date(lastFailed.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      return new Date() >= retryAfter;
    });

    const allDue = [...(initialCharges || []), ...dueRetries];

    if (allDue.length === 0) {
      console.log('No remainder charges due today');
      return new Response(
        JSON.stringify({ processed: 0, success: 0, failed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allDue.length} bookings with due remainders (${initialCharges?.length || 0} initial, ${dueRetries.length} retries)`);

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of allDue) {
      if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
        console.error(`Booking ${booking.id} missing Stripe customer or payment method`);
        failedCount++;
        errors.push({ bookingId: booking.id, error: 'Missing payment details' });
        continue;
      }

      const attempt = (booking.remainder_failed_attempts || 0) + 1;

      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: Math.round(booking.remainder_amount * 100),
            currency: 'gbp',
            customer: booking.stripe_customer_id,
            payment_method: booking.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            description: `Marketplace remainder for booking ${booking.id}`,
            metadata: {
              booking_id: booking.id,
              event_id: booking.marketplace_event_id || '',
              payment_type: 'remainder',
              attempt: attempt.toString(),
            },
          },
          {
            idempotencyKey: `pi_remainder_${booking.id}_attempt_${attempt}`,
          }
        );

        console.log(`Remainder charge created for booking ${booking.id}: ${paymentIntent.id}`);

        await supabase
          .from('bookings')
          .update({ remainder_payment_intent_id: paymentIntent.id })
          .eq('id', booking.id);

        successCount++;
      } catch (error) {
        console.error(`Failed to charge remainder for booking ${booking.id}:`, error);
        failedCount++;
        errors.push({
          bookingId: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await supabase
          .from('bookings')
          .update({
            remainder_failed_attempts: attempt,
            remainder_last_failed_at: new Date().toISOString(),
          })
          .eq('id', booking.id);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `Remainder charge job completed in ${elapsed}ms: ${successCount} success, ${failedCount} failed`
    );

    return new Response(
      JSON.stringify({ processed: allDue.length, success: successCount, failed: failedCount, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
