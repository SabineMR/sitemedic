/**
 * Payment Capture API Route
 * Phase 6.5: Capture authorized payment and update booking status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

interface CapturePaymentRequest {
  paymentIntentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Validate user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: CapturePaymentRequest = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    // Fetch payment from database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Retrieve Payment Intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Handle different payment statuses
    switch (paymentIntent.status) {
      case 'succeeded':
        // Update payments table status to succeeded
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('id', payment.id);

        if (updatePaymentError) {
          console.error('Error updating payment status:', updatePaymentError);
          return NextResponse.json(
            { error: 'Failed to update payment status' },
            { status: 500 }
          );
        }

        // Update bookings table status to confirmed
        if (payment.booking_id) {
          const { error: updateBookingError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          if (updateBookingError) {
            console.error('Error updating booking status:', updateBookingError);
            return NextResponse.json(
              { error: 'Failed to update booking status' },
              { status: 500 }
            );
          }

        }

        // Log to audit trail
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'payment_succeeded',
          entity_type: 'payment',
          entity_id: payment.id,
          changes: {
            payment_intent_id: paymentIntentId,
            status: 'succeeded',
            booking_id: payment.booking_id,
          },
        });

        return NextResponse.json({
          success: true,
          status: 'succeeded',
        });

      case 'requires_capture':
        // Manually capture the payment
        const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId);

        // Update payments table
        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('id', payment.id);

        // Update booking status
        if (payment.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);
        }

        // Log to audit trail
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'payment_captured',
          entity_type: 'payment',
          entity_id: payment.id,
          changes: {
            payment_intent_id: paymentIntentId,
            status: 'captured',
          },
        });

        return NextResponse.json({
          success: true,
          status: capturedIntent.status,
        });

      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return NextResponse.json(
          { error: 'Payment incomplete - requires user action' },
          { status: 400 }
        );

      case 'canceled':
        // Update payment status
        await supabase
          .from('payments')
          .update({ status: 'failed', failure_reason: 'Payment canceled' })
          .eq('id', payment.id);

        return NextResponse.json(
          { error: 'Payment was canceled' },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: `Unexpected payment status: ${paymentIntent.status}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Payment capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
