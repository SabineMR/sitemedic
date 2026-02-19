/**
 * Booking Confirmation API Route
 * POST /api/bookings/confirm
 *
 * Confirms a booking after checking contract signing requirements.
 * Auto-triggers upfront payment capture if applicable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canConfirmBooking, getPaymentMilestones } from '@/lib/contracts/payment-enforcement';
import { stripe } from '@/lib/stripe/server';
import type { Contract } from '@/lib/contracts/types';
import { requireOrgId } from '@/lib/organizations/org-resolver';

// ============================================================================
// Request Body Interface
// ============================================================================

interface ConfirmBookingRequest {
  bookingId: string;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Parse request body
    const body: ConfirmBookingRequest = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required field: bookingId' },
        { status: 400 }
      );
    }

    // Fetch booking
    // IMPORTANT: Filter by org_id to prevent cross-org access
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

    // Check if booking is already confirmed
    if (booking.status === 'confirmed') {
      return NextResponse.json(
        {
          success: true,
          message: 'Booking already confirmed',
          booking,
        },
        { status: 200 }
      );
    }

    // Check if contract exists for this booking
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(
        `
        *,
        client:clients!inner (
          id,
          name,
          email,
          stripe_customer_id
        )
      `
      )
      .eq('booking_id', bookingId)
      .eq('org_id', orgId)
      .neq('status', 'terminated')
      .maybeSingle();

    if (contractError) {
      console.error('Error fetching contract:', contractError);
      return NextResponse.json(
        { error: 'Failed to check contract status' },
        { status: 500 }
      );
    }

    // Apply booking confirmation gate
    const { canConfirm, reason } = canConfirmBooking(
      booking,
      contract as Contract | null
    );

    if (!canConfirm) {
      return NextResponse.json(
        { error: reason || 'Cannot confirm booking' },
        { status: 400 }
      );
    }

    // Confirm the booking
    const now = new Date().toISOString();
    // IMPORTANT: Filter by org_id for safety
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: now,
      })
      .eq('id', bookingId)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm booking' },
        { status: 500 }
      );
    }

    // Auto-trigger upfront payment capture if contract exists and upfront payment is due
    let upfrontCaptured = false;
    let stripePaymentIntentId: string | null = null;

    if (contract && contract.upfront_amount > 0 && !contract.upfront_paid_at) {
      const milestones = getPaymentMilestones(contract as Contract);
      const upfrontMilestone = milestones.find((m) => m.id === 'upfront');

      if (upfrontMilestone && upfrontMilestone.status === 'due') {
        try {
          const amountPence = Math.round(contract.upfront_amount * 100);

          // Check if authorization hold exists
          if (contract.stripe_payment_intent_id) {
            // Capture from authorization hold
            const paymentIntent = await stripe.paymentIntents.capture(
              contract.stripe_payment_intent_id,
              {
                amount_to_capture: amountPence,
              }
            );

            stripePaymentIntentId = paymentIntent.id;
          } else {
            // Create and charge new Payment Intent
            if (contract.client.stripe_customer_id) {
              const paymentIntent = await stripe.paymentIntents.create({
                amount: amountPence,
                currency: 'gbp',
                customer: contract.client.stripe_customer_id,
                confirm: true,
                automatic_payment_methods: {
                  enabled: true,
                  allow_redirects: 'never',
                },
                metadata: {
                  contract_id: contract.id,
                  milestone_id: 'upfront',
                  booking_id: bookingId,
                },
                description: `Upfront Payment - Booking ${bookingId}`,
              });

              stripePaymentIntentId = paymentIntent.id;
            }
          }

          // Update contract with upfront payment
          const paymentUpdate: Record<string, any> = {
            upfront_paid_at: now,
            status: 'completed', // Move from signed to completed
          };

          if (!contract.stripe_payment_intent_id && stripePaymentIntentId) {
            paymentUpdate.stripe_payment_intent_id = stripePaymentIntentId;
          }

          // IMPORTANT: Filter by org_id for safety
          await supabase
            .from('contracts')
            .update(paymentUpdate)
            .eq('id', contract.id)
            .eq('org_id', orgId);

          // Log contract event
          await supabase.from('contract_events').insert({
            org_id: orgId,
            contract_id: contract.id,
            event_type: 'payment_captured',
            event_data: {
              milestone_id: 'upfront',
              amount: contract.upfront_amount,
              amount_pence: amountPence,
              stripe_payment_intent_id: stripePaymentIntentId,
              auto_triggered: true,
              triggered_by: 'booking_confirmation',
            },
            actor_id: null, // System-triggered action; no user in scope
            actor_ip: request.headers.get('x-forwarded-for') || 'unknown',
          });

          upfrontCaptured = true;
        } catch (paymentError: unknown) {
          console.error('Error capturing upfront payment:', paymentError);
          // Don't fail booking confirmation if payment capture fails
          // Admin can manually capture payment later
        }
      }
    }

    // Fetch updated booking for response
    // IMPORTANT: Filter by org_id for consistency
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        booking: updatedBooking || booking,
        contractStatus: contract?.status || null,
        upfrontPaymentCaptured: upfrontCaptured,
        stripePaymentIntentId: stripePaymentIntentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/bookings/confirm:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
