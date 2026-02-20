/**
 * POST /api/direct-jobs/[id]/payment
 * Phase 34.1: Self-Procured Jobs -- Plan 04
 *
 * Creates a Stripe PaymentIntent for the deposit payment on a direct job.
 * The deposit amount is: agreed_price * (deposit_percent / 100).
 *
 * In development (no STRIPE_SECRET_KEY), returns a mock PaymentIntent
 * so the UI flow can be tested without Stripe credentials.
 *
 * Flow:
 * 1. Verify job ownership and status (must be confirmed or draft)
 * 2. Calculate deposit amount from agreed_price
 * 3. Create Stripe PaymentIntent (or mock in dev)
 * 4. Return clientSecret for Stripe Elements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PaymentRequestBody {
  deposit_percent?: number; // Defaults to 25%
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    let body: PaymentRequestBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK -- defaults will be used
    }

    const depositPercent = body.deposit_percent ?? 25;

    if (depositPercent < 0 || depositPercent > 100) {
      return NextResponse.json(
        { error: 'Deposit percent must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Fetch the direct job
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status, agreed_price, event_name')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Verify ownership
    if (job.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    // Validate status -- can only pay for confirmed or draft jobs
    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot create payment for a completed or cancelled job' },
        { status: 400 }
      );
    }

    // Validate agreed price exists
    if (!job.agreed_price || job.agreed_price <= 0) {
      return NextResponse.json(
        { error: 'Job must have an agreed price before payment' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const agreedPrice = parseFloat(job.agreed_price);
    const depositAmount = parseFloat((agreedPrice * (depositPercent / 100)).toFixed(2));
    const remainderAmount = parseFloat((agreedPrice - depositAmount).toFixed(2));

    // Check if Stripe is available
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    if (hasStripe) {
      // Real Stripe PaymentIntent creation
      const { stripe } = await import('@/lib/stripe/server');

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(depositAmount * 100), // GBP to pence
          currency: 'gbp',
          metadata: {
            direct_job_id: job.id,
            job_name: job.event_name,
            payment_type: 'deposit',
            deposit_percent: depositPercent.toString(),
            total_agreed_price: agreedPrice.toString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        },
        {
          idempotencyKey: `pi_direct_job_deposit_${job.id}`,
        }
      );

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amounts: {
          agreed_price: agreedPrice,
          deposit_percent: depositPercent,
          deposit_amount: depositAmount,
          remainder_amount: remainderAmount,
        },
      });
    }

    // Development mock: no Stripe key available
    const mockClientSecret = `pi_mock_${job.id}_secret_${Date.now()}`;
    return NextResponse.json({
      clientSecret: mockClientSecret,
      paymentIntentId: `pi_mock_${job.id}`,
      mock: true,
      amounts: {
        agreed_price: agreedPrice,
        deposit_percent: depositPercent,
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
      },
    });
  } catch (error) {
    console.error('[Direct Job Payment] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
