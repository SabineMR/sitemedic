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
import {
  sendAwardNotification,
  sendRejectionNotification,
  sendClientDepositConfirmation,
  sendRemainderFailedNotification,
} from '@/lib/marketplace/notifications';
import { createNotification, createBulkNotifications } from '@/lib/marketplace/create-notification';
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

          // --- Send email notifications (non-blocking) ---

          // Fetch client (event poster) details
          const { data: clientUser } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', mktEvent.posted_by)
            .single();

          // Fetch winning company details
          const { data: winningCompany } = await supabase
            .from('marketplace_companies')
            .select('company_name, admin_user_id')
            .eq('id', quote.company_id)
            .single();

          let winningCompanyEmail: string | null = null;
          if (winningCompany?.admin_user_id) {
            const { data: companyAdmin } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', winningCompany.admin_user_id)
              .single();
            winningCompanyEmail = companyAdmin?.email || null;
          }

          // Calculate remainder due date for email
          const sortedDaysForEmail = [...(eventDays || [])].sort((a, b) =>
            b.event_date.localeCompare(a.event_date)
          );
          const lastDayForEmail = sortedDaysForEmail[0];
          const eventEndForEmail = lastDayForEmail
            ? new Date(`${lastDayForEmail.event_date}T${lastDayForEmail.end_time}`)
            : new Date();
          const remainderDueDate = new Date(eventEndForEmail.getTime() + 14 * 24 * 60 * 60 * 1000);

          // Send award notification to winning company
          if (winningCompanyEmail && winningCompany && clientUser) {
            try {
              await sendAwardNotification({
                companyEmail: winningCompanyEmail,
                companyName: winningCompany.company_name,
                eventName: mktEvent.event_name,
                eventId,
                totalPrice: quote.total_price,
                clientName: `${clientUser.first_name || ''} ${clientUser.last_name || ''}`.trim() || 'Client',
                clientEmail: clientUser.email,
                clientPhone: null,
                eventAddress: mktEvent.location_address,
                eventDates: (eventDays || []).map((d) => d.event_date),
              });
            } catch (emailErr) {
              console.error('[Webhook] Award notification email failed:', emailErr);
            }
          }

          // Send rejection notifications to losing companies
          if (losingQuoteIds.length > 0) {
            const { data: losingQuotes } = await supabase
              .from('marketplace_quotes')
              .select('company_id, total_price')
              .in('id', losingQuoteIds);

            if (losingQuotes) {
              const companyIds = [...new Set(losingQuotes.map((q) => q.company_id))];
              const { data: losingCompanies } = await supabase
                .from('marketplace_companies')
                .select('id, company_name, admin_user_id')
                .in('id', companyIds);

              for (const company of losingCompanies || []) {
                try {
                  if (!company.admin_user_id) continue;
                  const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', company.admin_user_id)
                    .single();
                  if (!adminProfile?.email) continue;

                  const companyQuote = losingQuotes.find((q) => q.company_id === company.id);
                  await sendRejectionNotification({
                    companyEmail: adminProfile.email,
                    companyName: company.company_name,
                    eventName: mktEvent.event_name,
                    totalPrice: companyQuote?.total_price || 0,
                  });
                } catch (emailErr) {
                  console.error('[Webhook] Rejection notification failed for company:', company.id, emailErr);
                }
              }
            }
          }

          // Send deposit confirmation to client
          if (clientUser?.email) {
            try {
              await sendClientDepositConfirmation({
                clientEmail: clientUser.email,
                clientName: `${clientUser.first_name || ''} ${clientUser.last_name || ''}`.trim() || 'Client',
                eventName: mktEvent.event_name,
                depositAmount,
                depositPercent,
                remainderAmount,
                remainderDueDate: remainderDueDate.toISOString(),
                companyName: winningCompany?.company_name || 'Your selected provider',
                paymentIntentId: paymentIntent.id,
              });
            } catch (emailErr) {
              console.error('[Webhook] Deposit confirmation email failed:', emailErr);
            }
          }

          // --- Dashboard notifications (fire-and-forget) ---

          // quote_awarded → winning company admin
          if (winningCompany?.admin_user_id) {
            try {
              await createNotification({
                userId: winningCompany.admin_user_id,
                type: 'quote_awarded',
                title: 'Quote awarded',
                body: `Your quote for "${mktEvent.event_name}" has been awarded. Deposit confirmed.`,
                link: `/marketplace/events/${eventId}`,
                metadata: { event_id: eventId, quote_id: quoteId, deposit_amount: depositAmount },
              });
            } catch (notifErr) {
              console.error('[Webhook] quote_awarded notification failed:', notifErr);
            }
          }

          // payment_received → both winning company admin and event poster (client)
          const paymentReceivedNotifs = [];
          if (winningCompany?.admin_user_id) {
            paymentReceivedNotifs.push({
              userId: winningCompany.admin_user_id,
              type: 'payment_received' as const,
              title: 'Deposit received',
              body: `Deposit of £${depositAmount.toFixed(2)} received for "${mktEvent.event_name}"`,
              link: `/marketplace/events/${eventId}`,
              metadata: { event_id: eventId, quote_id: quoteId, deposit_amount: depositAmount },
            });
          }
          if (mktEvent.posted_by) {
            paymentReceivedNotifs.push({
              userId: mktEvent.posted_by,
              type: 'payment_received' as const,
              title: 'Deposit confirmed',
              body: `Your deposit of £${depositAmount.toFixed(2)} for "${mktEvent.event_name}" was processed successfully`,
              link: `/marketplace/events/${eventId}`,
              metadata: { event_id: eventId, quote_id: quoteId, deposit_amount: depositAmount },
            });
          }
          if (paymentReceivedNotifs.length > 0) {
            try {
              await createBulkNotifications(paymentReceivedNotifs);
            } catch (notifErr) {
              console.error('[Webhook] payment_received notifications failed:', notifErr);
            }
          }

          // quote_rejected → all losing company admins
          if (losingQuoteIds.length > 0) {
            try {
              const { data: losingQuoteCompanies } = await supabase
                .from('marketplace_quotes')
                .select('company_id')
                .in('id', losingQuoteIds);

              if (losingQuoteCompanies && losingQuoteCompanies.length > 0) {
                const losingCompanyIds = [...new Set(losingQuoteCompanies.map((q) => q.company_id))];
                const { data: losingCos } = await supabase
                  .from('marketplace_companies')
                  .select('admin_user_id')
                  .in('id', losingCompanyIds);

                const rejectedNotifs = (losingCos || [])
                  .filter((c) => c.admin_user_id)
                  .map((c) => ({
                    userId: c.admin_user_id as string,
                    type: 'quote_rejected' as const,
                    title: 'Quote not selected',
                    body: `Your quote for "${mktEvent.event_name}" was not selected`,
                    link: `/marketplace/events`,
                    metadata: { event_id: eventId },
                  }));

                if (rejectedNotifs.length > 0) {
                  await createBulkNotifications(rejectedNotifs);
                }
              }
            } catch (notifErr) {
              console.error('[Webhook] quote_rejected notifications failed:', notifErr);
            }
          }

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

            const newAttemptCount = (failedBooking?.remainder_failed_attempts || 0) + 1;

            await supabase
              .from('bookings')
              .update({
                remainder_failed_attempts: newAttemptCount,
                remainder_last_failed_at: new Date().toISOString(),
              })
              .eq('id', failedBookingId);

            // Send failure notification email to client
            try {
              const { data: failedBookingDetails } = await supabase
                .from('bookings')
                .select('site_name, remainder_amount, marketplace_event_id, stripe_customer_id')
                .eq('id', failedBookingId)
                .single();

              if (failedBookingDetails?.stripe_customer_id) {
                const { data: clientPm } = await supabase
                  .from('client_payment_methods')
                  .select('user_id')
                  .eq('stripe_customer_id', failedBookingDetails.stripe_customer_id)
                  .limit(1)
                  .single();

                if (clientPm?.user_id) {
                  const { data: clientProfile } = await supabase
                    .from('profiles')
                    .select('email, first_name, last_name')
                    .eq('id', clientPm.user_id)
                    .single();

                  if (clientProfile?.email) {
                    await sendRemainderFailedNotification({
                      clientEmail: clientProfile.email,
                      clientName: `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Client',
                      eventName: failedBookingDetails.site_name || 'Your event',
                      remainderAmount: failedBookingDetails.remainder_amount || 0,
                      attempt: newAttemptCount,
                      maxAttempts: 3,
                    });
                  }

                  // payment_failed dashboard notification → client
                  if (clientPm?.user_id) {
                    try {
                      await createNotification({
                        userId: clientPm.user_id,
                        type: 'payment_failed',
                        title: 'Remainder payment failed',
                        body: `We were unable to charge your card for "${failedBookingDetails?.site_name || 'your event'}". Please update your payment method.`,
                        link: '/marketplace/payments',
                        metadata: {
                          booking_id: failedBookingId,
                          remainder_amount: failedBookingDetails?.remainder_amount,
                          attempt: newAttemptCount,
                        },
                      });
                    } catch (notifErr) {
                      console.error('[Webhook] payment_failed notification failed:', notifErr);
                    }
                  }
                }
              }
            } catch (emailErr) {
              console.error('[Webhook] Remainder failed notification email error:', emailErr);
            }
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
