/**
 * Contract Completion Payment API Route
 * POST /api/contracts/[id]/complete-payment
 *
 * Automatically triggered when booking status changes to 'completed'.
 * Captures completion payment if applicable and updates contract status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { getPaymentMilestones, isFullyPaid } from '@/lib/contracts/payment-enforcement';
import type { Contract } from '@/lib/contracts/types';

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

    // Verify authentication (can be admin or system call)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if completion payment is applicable
    if (contract.completion_amount <= 0) {
      return NextResponse.json(
        { error: 'No completion payment configured for this contract' },
        { status: 400 }
      );
    }

    // Check if already paid
    if (contract.completion_paid_at) {
      return NextResponse.json(
        {
          success: true,
          message: 'Completion payment already captured',
          alreadyPaid: true,
        },
        { status: 200 }
      );
    }

    // Get milestones to verify completion is due
    const milestones = getPaymentMilestones(contract as Contract);
    const completionMilestone = milestones.find((m) => m.id === 'completion');

    if (!completionMilestone) {
      return NextResponse.json(
        { error: 'Completion milestone not found' },
        { status: 400 }
      );
    }

    if (completionMilestone.status === 'pending') {
      return NextResponse.json(
        { error: 'Service not yet completed - payment not due' },
        { status: 400 }
      );
    }

    // Determine payment amount (convert to pence for Stripe)
    const amountPence = Math.round(contract.completion_amount * 100);
    const now = new Date().toISOString();
    let stripePaymentIntentId: string | null = null;

    // Payment processing logic
    if (contract.stripe_payment_intent_id) {
      // Authorization hold exists - capture completion amount
      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          contract.stripe_payment_intent_id,
          {
            amount_to_capture: amountPence,
          }
        );

        stripePaymentIntentId = paymentIntent.id;
      } catch (stripeError: unknown) {
        console.error('Stripe capture error:', stripeError);
        return NextResponse.json(
          { error: 'Payment capture failed' },
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
            milestone_id: 'completion',
            client_id: contract.client_id,
          },
          description: `Completion Payment - Contract ${contract.id}`,
        });

        stripePaymentIntentId = paymentIntent.id;
      } catch (stripeError: unknown) {
        console.error('Stripe payment intent creation error:', stripeError);
        return NextResponse.json(
          { error: 'Payment failed' },
          { status: 500 }
        );
      }
    }

    // Update contract with completion payment timestamp
    const paymentUpdate: Record<string, any> = {
      completion_paid_at: now,
      completed_at: now,
    };

    // Store payment intent ID if not already set
    if (!contract.stripe_payment_intent_id && stripePaymentIntentId) {
      paymentUpdate.stripe_payment_intent_id = stripePaymentIntentId;
    }

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

    if (fullyPaid) {
      await supabase
        .from('contracts')
        .update({
          status: 'fulfilled',
          fulfilled_at: now,
        })
        .eq('id', contract.id);
    } else {
      // Update to active if not already
      if (contract.status === 'signed' || contract.status === 'completed') {
        await supabase
          .from('contracts')
          .update({ status: 'active' })
          .eq('id', contract.id);
      }
    }

    // Log contract event
    const { error: eventError } = await supabase.from('contract_events').insert({
      contract_id: contract.id,
      event_type: 'payment_captured',
      event_data: {
        milestone_id: 'completion',
        amount: contract.completion_amount,
        amount_pence: amountPence,
        stripe_payment_intent_id: stripePaymentIntentId,
        fully_paid: fullyPaid,
        auto_triggered: true,
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
          id: 'completion',
          label: 'Completion Payment',
          amount: contract.completion_amount,
          paidAt: now,
        },
        amountCaptured: contract.completion_amount,
        stripePaymentIntentId,
        fullyPaid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/contracts/[id]/complete-payment:', error);
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
