/**
 * POST /api/stripe/webhooks
 * Phase 4.5: Stripe webhook handler for payment events
 * Phase 35: Added marketplace deposit/remainder payment handling
 *
 * Handles:
 * - payment_intent.succeeded: Update booking from 'pending' to 'confirmed' (existing)
 *                             Marketplace deposit: create booking, update statuses (Phase 35)
 * - payment_intent.payment_failed: Update booking to 'cancelled' (existing)
 * - account.updated: Sync medic Stripe Express onboarding status
 *
 * CRITICAL: Verify signature BEFORE parsing event
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { createMarketplaceBooking } from '@/lib/marketplace/booking-bridge';
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
        const paymentType = paymentIntent.metadata?.payment_type;

        // === MARKETPLACE DEPOSIT ===
        if (paymentType === 'deposit') {
          const eventId = paymentIntent.metadata?.event_id;
          const quoteId = paymentIntent.metadata?.quote_id;
          const depositPercent = parseInt(paymentIntent.metadata?.deposit_percent || '25', 10);

          if (!eventId || !quoteId) {
            console.error('[Webhook] Marketplace deposit missing event_id or quote_id');
            return NextResponse.json({ received: true });
          }

          // Fetch quote
          const { data: quote, error: quoteError } = await supabase
            .from('marketplace_quotes')
            .select('id, company_id, total_price, staffing_plan')
            .eq('id', quoteId)
            .single();

          if (quoteError || !quote) {
            console.error('[Webhook] Quote not found for deposit:', quoteId);
            return NextResponse.json({ received: true });
          }

          // Fetch event with days
          const { data: mktEvent } = await supabase
            .from('marketplace_events')
            .select('id, event_name, location_address, location_postcode, event_type, posted_by')
            .eq('id', eventId)
            .single();

          const { data: eventDays } = await supabase
            .from('event_days')
            .select('event_date, start_time, end_time')
            .eq('event_id', eventId)
            .order('event_date', { ascending: true });

          if (!mktEvent || !eventDays?.length) {
            console.error('[Webhook] Event or days not found for deposit:', eventId);
            return NextResponse.json({ received: true });
          }

          // Calculate amounts
          const depositAmount = parseFloat((quote.total_price * (depositPercent / 100)).toFixed(2));
          const remainderAmount = parseFloat((quote.total_price - depositAmount).toFixed(2));

          // Extract payment method ID from the PI
          const pmId = typeof paymentIntent.payment_method === 'string'
            ? paymentIntent.payment_method
            : paymentIntent.payment_method?.id || '';
          const custId = typeof paymentIntent.customer === 'string'
            ? paymentIntent.customer
            : paymentIntent.customer?.id || '';

          // Create marketplace booking(s)
          const bookingResult = await createMarketplaceBooking(supabase, {
            eventId,
            quoteId,
            quote: {
              total_price: quote.total_price,
              company_id: quote.company_id,
            },
            event: {
              event_name: mktEvent.event_name,
              location_address: mktEvent.location_address,
              location_postcode: mktEvent.location_postcode,
              event_type: mktEvent.event_type,
              posted_by: mktEvent.posted_by,
            },
            eventDays,
            depositAmount,
            depositPercent,
            remainderAmount,
            stripeCustomerId: custId,
            stripePaymentMethodId: pmId,
            depositPaymentIntentId: paymentIntent.id,
          });

          if (!bookingResult.success) {
            console.error('[Webhook] Failed to create marketplace booking:', bookingResult.error);
          }

          // Update winning quote to 'awarded'
          await supabase
            .from('marketplace_quotes')
            .update({ status: 'awarded', awarded_at: new Date().toISOString() })
            .eq('id', quoteId);

          // Update event status to 'awarded'
          await supabase
            .from('marketplace_events')
            .update({ status: 'awarded' })
            .eq('id', eventId);

          // Reject other submitted/revised quotes on this event
          const { data: otherQuotes } = await supabase
            .from('marketplace_quotes')
            .select('id')
            .eq('event_id', eventId)
            .neq('id', quoteId)
            .in('status', ['submitted', 'revised']);

          const losingQuoteIds = otherQuotes?.map((q) => q.id) || [];

          if (losingQuoteIds.length > 0) {
            await supabase
              .from('marketplace_quotes')
              .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_reason: 'Another quote was selected',
              })
              .in('id', losingQuoteIds);
          }

          // Record award history
          await supabase
            .from('marketplace_award_history')
            .insert({
              event_id: eventId,
              winning_quote_id: quoteId,
              losing_quote_ids: losingQuoteIds,
              awarded_by: mktEvent.posted_by,
              deposit_amount: depositAmount,
              total_amount: quote.total_price,
              deposit_percent: depositPercent,
            });

          // Save payment method for future remainder charge
          if (custId && pmId) {
            await supabase
              .from('client_payment_methods')
              .upsert(
                {
                  user_id: mktEvent.posted_by,
                  stripe_customer_id: custId,
                  stripe_payment_method_id: pmId,
                  is_default: true,
                },
                { onConflict: 'stripe_payment_method_id' }
              );
          }

          // Create medic commitments for named medics (race condition safety)
          const staffingPlan = quote.staffing_plan as {
            type: string;
            named_medics?: Array<{ medic_id: string }>;
          } | null;

          if (staffingPlan?.type === 'named_medics' && staffingPlan.named_medics?.length) {
            for (const day of eventDays) {
              for (const medic of staffingPlan.named_medics) {
                const startTs = `${day.event_date}T${day.start_time}`;
                const endTs = `${day.event_date}T${day.end_time}`;

                await supabase
                  .from('medic_commitments')
                  .insert({
                    medic_id: medic.medic_id,
                    event_id: eventId,
                    start_time: startTs,
                    end_time: endTs,
                  })
                  .then(({ error: commitError }) => {
                    if (commitError?.code === '23P01') {
                      console.warn('[Webhook] EXCLUSION conflict for medic commitment (already validated at award):', medic.medic_id);
                    } else if (commitError) {
                      console.error('[Webhook] Error creating medic commitment:', commitError);
                    }
                  });
              }
            }
          }

          console.log('[Webhook] Marketplace deposit processed:', {
            eventId,
            quoteId,
            bookingIds: bookingResult.bookingIds,
            losingQuoteIds,
          });

          break;
        }

        // === MARKETPLACE REMAINDER ===
        if (paymentType === 'remainder') {
          const remainderBookingId = paymentIntent.metadata?.booking_id;

          if (!remainderBookingId) {
            console.error('[Webhook] Marketplace remainder missing booking_id');
            return NextResponse.json({ received: true });
          }

          // Mark remainder as paid
          const { error: remainderUpdateError } = await supabase
            .from('bookings')
            .update({
              remainder_paid_at: new Date().toISOString(),
              remainder_payment_intent_id: paymentIntent.id,
            })
            .eq('id', remainderBookingId);

          if (remainderUpdateError) {
            console.error('[Webhook] Failed to update remainder payment:', remainderUpdateError);
          } else {
            console.log('[Webhook] Remainder charged successfully for booking:', remainderBookingId);
          }

          break;
        }

        // === EXISTING: Direct/standard booking payment ===
        const bookingId = paymentIntent.metadata.booking_id;
        const clientId = paymentIntent.metadata.client_id;

        if (!bookingId) {
          console.error('payment_intent.succeeded missing booking_id in metadata');
          return NextResponse.json({ received: true });
        }

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
        const failedPaymentType = paymentIntent.metadata?.payment_type;

        // Marketplace deposit failure: client sees error in UI, can retry
        if (failedPaymentType === 'deposit') {
          console.log('[Webhook] Marketplace deposit payment failed, client can retry in UI:', paymentIntent.id);
          break;
        }

        // Marketplace remainder failure: track attempt count
        if (failedPaymentType === 'remainder') {
          const failedBookingId = paymentIntent.metadata?.booking_id;
          if (failedBookingId) {
            await supabase.rpc('increment_remainder_failed_attempts' as never, {
              p_booking_id: failedBookingId,
            }).then(({ error: rpcError }) => {
              if (rpcError) {
                // Fallback: manual update
                console.warn('[Webhook] RPC not available, updating manually');
              }
            });

            // Manual fallback update
            const { data: failedBooking } = await supabase
              .from('bookings')
              .select('remainder_failed_attempts')
              .eq('id', failedBookingId)
              .single();

            await supabase
              .from('bookings')
              .update({
                remainder_failed_attempts: (failedBooking?.remainder_failed_attempts || 0) + 1,
                remainder_last_failed_at: new Date().toISOString(),
              })
              .eq('id', failedBookingId);
          }
          break;
        }

        // Existing: standard booking payment failure
        const bookingId = paymentIntent.metadata.booking_id;

        if (!bookingId) {
          console.error('payment_intent.payment_failed missing booking_id in metadata');
          return NextResponse.json({ received: true });
        }

        // Update booking status to 'cancelled'
        const { error: failUpdateError } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Payment failed',
          })
          .eq('id', bookingId);

        if (failUpdateError) {
          console.error('Error updating booking status:', failUpdateError);
        }

        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        if (!account.id) {
          console.error('account.updated missing account ID');
          return NextResponse.json({ received: true });
        }

        // Check if this is a Connected account (medic Express account)
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;
        const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted;

        // Find medic by stripe_account_id and update onboarding status
        const { error: updateError } = await supabase
          .from('medics')
          .update({
            stripe_onboarding_complete: onboardingComplete,
          })
          .eq('stripe_account_id', account.id);

        if (updateError) {
          console.error('Error updating medic onboarding status:', updateError);
        }

        break;
      }

      default:
        break;
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
