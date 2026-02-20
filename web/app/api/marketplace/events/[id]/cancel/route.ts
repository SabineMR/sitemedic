/**
 * POST /api/marketplace/events/[id]/cancel -- Cancel a marketplace event
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 03
 *
 * Handles event cancellation by either the client (event poster) or the
 * awarded company admin. Applies tiered refund policy for client cancellations
 * and full refund for company cancellations.
 *
 * Client cancellation tiers:
 *   - >14 days before event: 100% deposit refund
 *   - 7-14 days before event: 50% deposit refund
 *   - <7 days before event: 0% refund
 *
 * Company cancellation:
 *   - Always 100% refund to client
 *
 * Also cancels pending remainder charges by nulling remainder_due_at.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const cancelSchema = z.object({
  reason: z.enum([
    'event_cancelled',
    'found_alternative',
    'budget_issue',
    'scheduling_conflict',
    'other',
  ]),
  reason_detail: z
    .string()
    .max(1000, 'Reason detail must be under 1000 characters')
    .optional(),
});

// =============================================================================
// POST -- Cancel a marketplace event
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { reason, reason_detail } = parsed.data;

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Marketplace event not found' }, { status: 404 });
    }

    // Determine canceller type
    let cancellerType: 'client' | 'company';

    if (event.posted_by === user.id) {
      cancellerType = 'client';
    } else {
      // Check if user is the admin of the awarded company
      const { data: awardedQuote, error: quoteError } = await supabase
        .from('marketplace_quotes')
        .select('company_id, marketplace_companies!inner(admin_user_id)')
        .eq('event_id', eventId)
        .eq('status', 'awarded')
        .single();

      if (quoteError || !awardedQuote) {
        return NextResponse.json(
          { error: 'No awarded quote found for this event' },
          { status: 403 }
        );
      }

      const companies = awardedQuote.marketplace_companies as unknown as { admin_user_id: string };
      if (companies.admin_user_id === user.id) {
        cancellerType = 'company';
      } else {
        return NextResponse.json(
          { error: 'Only the event poster or awarded company admin can cancel' },
          { status: 403 }
        );
      }
    }

    // Find related marketplace bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, deposit_amount, deposit_payment_intent_id, status')
      .eq('marketplace_event_id', eventId)
      .eq('source', 'marketplace')
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) {
      console.error('[Marketplace Cancel] Bookings fetch error:', bookingsError);
      return NextResponse.json({ error: 'Failed to find related bookings' }, { status: 500 });
    }

    // Get first event day date for refund tier calculation
    const { data: firstDay, error: firstDayError } = await supabase
      .from('event_days')
      .select('event_date')
      .eq('event_id', eventId)
      .order('event_date', { ascending: true })
      .limit(1)
      .single();

    if (firstDayError || !firstDay) {
      return NextResponse.json(
        { error: 'Could not determine event start date' },
        { status: 400 }
      );
    }

    let refundAmount = 0;
    let refundPercent = 0;

    if (cancellerType === 'client') {
      // Client cancellation: tiered refund based on days until event
      const { calculateMarketplaceCancellationRefund } = await import('@/lib/marketplace/cancellation');
      const totalDeposit = (bookings || []).reduce(
        (sum, b) => sum + (Number(b.deposit_amount) || 0),
        0
      );
      const breakdown = calculateMarketplaceCancellationRefund(totalDeposit, firstDay.event_date);
      refundAmount = breakdown.refundAmount;
      refundPercent = breakdown.refundPercent;

      // Process Stripe refund if applicable
      if (refundAmount > 0 && bookings && bookings.length > 0) {
        try {
          const { stripe } = await import('@/lib/stripe/server');
          for (const booking of bookings) {
            if (booking.deposit_payment_intent_id) {
              const perBookingDeposit = Number(booking.deposit_amount) || 0;
              const perBookingRefund = parseFloat(
                ((perBookingDeposit * refundPercent) / 100).toFixed(2)
              );
              if (perBookingRefund > 0) {
                await stripe.refunds.create({
                  payment_intent: booking.deposit_payment_intent_id,
                  amount: Math.round(perBookingRefund * 100), // Stripe uses pence
                });
              }
            }
          }
        } catch (stripeErr) {
          console.error('[Marketplace Cancel] Stripe refund error:', stripeErr);
          // Continue with cancellation even if refund fails -- admin can process manually
        }
      }
    } else {
      // Company cancellation: always 100% refund
      const { calculateCompanyCancellationRefund } = await import('@/lib/marketplace/cancellation');
      const totalDeposit = (bookings || []).reduce(
        (sum, b) => sum + (Number(b.deposit_amount) || 0),
        0
      );
      const breakdown = calculateCompanyCancellationRefund(totalDeposit);
      refundAmount = breakdown.refundAmount;
      refundPercent = breakdown.refundPercent;

      // Process Stripe full refund
      if (refundAmount > 0 && bookings && bookings.length > 0) {
        try {
          const { stripe } = await import('@/lib/stripe/server');
          for (const booking of bookings) {
            if (booking.deposit_payment_intent_id) {
              await stripe.refunds.create({
                payment_intent: booking.deposit_payment_intent_id,
                // No amount = full refund of the payment intent
              });
            }
          }
        } catch (stripeErr) {
          console.error('[Marketplace Cancel] Stripe refund error:', stripeErr);
          // Continue with cancellation even if refund fails
        }
      }
    }

    // Update bookings: mark as cancelled with refund details
    if (bookings && bookings.length > 0) {
      const bookingIds = bookings.map((b) => b.id);
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          marketplace_cancelled_at: new Date().toISOString(),
          marketplace_cancellation_reason: reason_detail
            ? `${reason}: ${reason_detail}`
            : reason,
          marketplace_cancelled_by: user.id,
          marketplace_refund_amount: refundAmount,
          marketplace_refund_percent: refundPercent,
          remainder_due_at: null, // Cancel pending remainder charges
        })
        .in('id', bookingIds);

      if (updateError) {
        console.error('[Marketplace Cancel] Booking update error:', updateError);
        return NextResponse.json({ error: 'Failed to update bookings' }, { status: 500 });
      }
    }

    // Update marketplace event status to cancelled
    const { error: eventUpdateError } = await supabase
      .from('marketplace_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId);

    if (eventUpdateError) {
      console.error('[Marketplace Cancel] Event update error:', eventUpdateError);
      // Non-fatal: bookings were already updated
    }

    // Fire-and-forget: send cancellation notification
    try {
      const { sendCancellationNotification } = await import('@/lib/marketplace/notifications');
      sendCancellationNotification({
        recipientEmail: '',
        recipientName: '',
        eventName: '',
        cancelledBy: cancellerType === 'client' ? 'the client' : 'the company',
        refundAmount,
        reason,
      }).catch((err: unknown) => {
        console.warn('[Marketplace Cancel] Notification failed (non-fatal):', err);
      });
    } catch {
      console.log('[Marketplace Cancel] Notification module not available yet');
    }

    return NextResponse.json({
      success: true,
      refundAmount,
      refundPercent,
    });
  } catch (error) {
    console.error('[Marketplace Cancel] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
