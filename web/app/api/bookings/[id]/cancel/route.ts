/**
 * POST /api/bookings/[id]/cancel
 *
 * Client-facing booking cancellation endpoint.
 * Enforces the refund policy from the refund-policy page:
 *   - 7+ days before shift: 100% refund
 *   - 3-6 days before shift: 50% refund
 *   - <72 hours: no refund
 *
 * Updates booking status to 'cancelled' with cancellation metadata.
 * Initiates Stripe refund if a payment was made.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { differenceInDays } from 'date-fns';
import { sendBookingCancelledEmail } from '@/lib/email/send-booking-cancelled';

export const dynamic = 'force-dynamic';

interface CancelRequest {
  reason?: string;
}

function calculateRefundPercent(shiftDate: string): number {
  const daysUntil = differenceInDays(new Date(shiftDate), new Date());

  if (daysUntil >= 7) return 100;
  if (daysUntil >= 3) return 50;
  return 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const orgId = await requireOrgId();

    const body: CancelRequest = await request.json().catch(() => ({}));

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find client record for this user
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (!clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    // Fetch booking — verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, shift_date, total, client_id')
      .eq('id', bookingId)
      .eq('client_id', clientRecord.id)
      .eq('org_id', orgId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    // Only pending or confirmed bookings can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking with status "${booking.status}"` },
        { status: 400 }
      );
    }

    // Calculate refund
    const refundPercent = calculateRefundPercent(booking.shift_date);
    const refundAmount = parseFloat(((booking.total * refundPercent) / 100).toFixed(2));

    // Update booking to cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason || 'Cancelled by client',
        cancelled_by: user.id,
        refund_amount: refundAmount,
      })
      .eq('id', bookingId)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // If there was a Stripe payment, look up the payment intent for refund
    if (refundAmount > 0) {
      const { data: payment } = await supabase
        .from('payments')
        .select('stripe_payment_intent_id')
        .eq('booking_id', bookingId)
        .eq('status', 'succeeded')
        .single();

      if (payment?.stripe_payment_intent_id) {
        // Initiate Stripe refund (fire-and-forget — refund webhook will update records)
        try {
          const { stripe } = await import('@/lib/stripe/server');
          await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            amount: Math.round(refundAmount * 100), // GBP to pence
          });
        } catch (stripeErr) {
          // Log but don't fail the cancellation — admin can process refund manually
          console.error('Stripe refund failed (will need manual processing):', stripeErr);
        }
      }
    }

    // Fire-and-forget: send cancellation confirmation email to client
    sendBookingCancelledEmail({
      bookingId,
      refundPercent,
      refundAmount,
      reason: body.reason,
    }).catch((err) =>
      console.error('Failed to send cancellation email:', err)
    );

    return NextResponse.json({
      success: true,
      refundPercent,
      refundAmount,
    });
  } catch (error) {
    console.error('Error in /api/bookings/[id]/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
