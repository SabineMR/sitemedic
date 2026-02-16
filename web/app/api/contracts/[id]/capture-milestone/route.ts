/**
 * Milestone Payment Capture API Route
 * POST /api/contracts/[id]/capture-milestone
 *
 * Captures a payment for a specific milestone (upfront, completion, or net30).
 * Uses Stripe to capture payment and updates contract payment tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { getPaymentMilestones, isFullyPaid } from '@/lib/contracts/payment-enforcement';
import type { Contract } from '@/lib/contracts/types';

// ============================================================================
// Request Body Interface
// ============================================================================

interface CaptureMilestoneRequest {
  milestoneId: 'upfront' | 'completion' | 'net30';
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await context.params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: CaptureMilestoneRequest = await request.json();
    const { milestoneId } = body;

    if (!milestoneId || !['upfront', 'completion', 'net30'].includes(milestoneId)) {
      return NextResponse.json(
        { error: 'Invalid milestoneId. Must be: upfront, completion, or net30' },
        { status: 400 }
      );
    }

    // Fetch contract with client data
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
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Validate milestone exists and is due/overdue
    const milestones = getPaymentMilestones(contract as Contract);
    const milestone = milestones.find((m) => m.id === milestoneId);

    if (!milestone) {
      return NextResponse.json(
        { error: `Milestone ${milestoneId} does not exist for this contract` },
        { status: 400 }
      );
    }

    if (milestone.status === 'paid') {
      return NextResponse.json(
        { error: `Milestone ${milestoneId} has already been paid` },
        { status: 400 }
      );
    }

    if (milestone.status === 'pending') {
      return NextResponse.json(
        { error: `Milestone ${milestoneId} is not yet due` },
        { status: 400 }
      );
    }

    // Determine payment amount (convert to pence for Stripe)
    const amountPence = Math.round(milestone.amount * 100);

    // Prepare payment update object
    const now = new Date().toISOString();
    const paymentUpdate: Record<string, any> = {};
    let stripePaymentIntentId: string | null = null;

    // Payment processing logic
    if (contract.stripe_payment_intent_id) {
      // Authorization hold exists - capture partial amount
      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          contract.stripe_payment_intent_id,
          {
            amount_to_capture: amountPence,
          }
        );

        stripePaymentIntentId = paymentIntent.id;

        // Update paid_at timestamp
        paymentUpdate[`${milestoneId}_paid_at`] = now;
      } catch (stripeError: any) {
        console.error('Stripe capture error:', stripeError);
        return NextResponse.json(
          { error: `Payment capture failed: ${stripeError.message}` },
          { status: 500 }
        );
      }
    } else {
      // No authorization hold - create new Payment Intent and charge immediately
      if (!contract.client.stripe_customer_id) {
        return NextResponse.json(
          { error: 'Client has no Stripe customer ID' },
          { status: 400 }
        );
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountPence,
          currency: 'gbp',
          customer: contract.client.stripe_customer_id,
          confirm: true, // Immediately confirm and charge
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          metadata: {
            contract_id: contract.id,
            milestone_id: milestoneId,
            client_id: contract.client_id,
          },
          description: `${milestone.label} - Contract ${contract.id}`,
        });

        stripePaymentIntentId = paymentIntent.id;

        // Update paid_at timestamp and store payment intent ID
        paymentUpdate[`${milestoneId}_paid_at`] = now;

        // Store first payment intent ID if not set
        if (!contract.stripe_payment_intent_id) {
          paymentUpdate.stripe_payment_intent_id = paymentIntent.id;
        }
      } catch (stripeError: any) {
        console.error('Stripe payment intent creation error:', stripeError);
        return NextResponse.json(
          { error: `Payment failed: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // Update contract with payment timestamp
    const { error: updateError } = await supabase
      .from('contracts')
      .update(paymentUpdate)
      .eq('id', contract.id);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      return NextResponse.json(
        { error: 'Failed to update contract payment status' },
        { status: 500 }
      );
    }

    // Check if all milestones now paid - update status to fulfilled
    const updatedContract = { ...contract, ...paymentUpdate } as Contract;
    const fullyPaid = isFullyPaid(updatedContract);

    if (fullyPaid && contract.status === 'active') {
      await supabase
        .from('contracts')
        .update({
          status: 'fulfilled',
          fulfilled_at: now,
        })
        .eq('id', contract.id);
    }

    // Log contract event
    const { error: eventError } = await supabase.from('contract_events').insert({
      contract_id: contract.id,
      event_type: 'payment_captured',
      event_data: {
        milestone_id: milestoneId,
        amount: milestone.amount,
        amount_pence: amountPence,
        stripe_payment_intent_id: stripePaymentIntentId,
        fully_paid: fullyPaid,
      },
      actor_id: user.id,
      actor_ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    if (eventError) {
      console.error('Error logging contract event:', eventError);
      // Don't fail the request if event logging fails
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        milestone: {
          id: milestoneId,
          label: milestone.label,
          amount: milestone.amount,
          paidAt: now,
        },
        amountCaptured: milestone.amount,
        stripePaymentIntentId,
        fullyPaid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/contracts/[id]/capture-milestone:', error);
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
