/**
 * POST /api/marketplace/quotes/[id]/award
 * Phase 35: Award Flow & Payment — Plan 01
 *
 * Awards a marketplace quote, creating a Stripe PaymentIntent with
 * setup_future_usage: 'off_session' to charge the deposit and save the
 * client's card for the later remainder charge.
 *
 * Flow:
 * 1. Authenticate user and validate request
 * 2. Verify quote status (submitted/revised) and event ownership
 * 3. Check EXCLUSION constraints for named medics
 * 4. Create or retrieve Stripe Customer
 * 5. Create Stripe PaymentIntent with setup_future_usage
 * 6. Return clientSecret for frontend to confirm payment
 *
 * Error codes:
 * - 401: Not authenticated
 * - 403: Not the event poster
 * - 404: Quote or event not found
 * - 400: Invalid status, validation errors
 * - 409: EXCLUSION constraint conflict for named medics
 * - 500: Internal error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { awardRequestSchema } from '@/lib/marketplace/award-schemas';
import {
  calculateAwardAmounts,
  getDepositPercentForEventType,
} from '@/lib/marketplace/award-calculations';
import type { AwardApiResponse } from '@/lib/marketplace/award-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse and validate request body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK -- defaults will be used
    }

    // Add quoteId from URL params to body for validation
    const parseResult = awardRequestSchema.safeParse({
      ...body,
      quoteId,
      eventId: body.eventId,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { eventId, depositPercent: requestedDepositPercent } = parseResult.data;

    // 1. Fetch the quote — verify it exists and is in a valid status
    const { data: quote, error: quoteError } = await supabase
      .from('marketplace_quotes')
      .select('id, event_id, company_id, total_price, status, staffing_plan')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only submitted or revised quotes can be awarded
    if (quote.status !== 'submitted' && quote.status !== 'revised') {
      return NextResponse.json(
        { error: `Cannot award a quote with status '${quote.status}'. Only submitted or revised quotes can be awarded.` },
        { status: 400 }
      );
    }

    // Verify quote belongs to this event
    if (quote.event_id !== eventId) {
      return NextResponse.json(
        { error: 'Quote does not belong to the specified event' },
        { status: 400 }
      );
    }

    // 2. Fetch event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status, event_type, event_name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.posted_by !== user.id) {
      return NextResponse.json(
        { error: 'Not authorised to award this event' },
        { status: 403 }
      );
    }

    // Verify event is still open
    if (event.status !== 'open') {
      return NextResponse.json(
        { error: `Event is '${event.status}', not open. Cannot award quotes on a non-open event.` },
        { status: 400 }
      );
    }

    // 3. Check EXCLUSION constraints for named medics
    const staffingPlan = quote.staffing_plan as { type: string; named_medics?: Array<{ medic_id: string; name: string }> } | null;

    if (staffingPlan?.type === 'named_medics' && staffingPlan.named_medics?.length) {
      // Fetch event days to check time ranges
      const { data: eventDays } = await supabase
        .from('event_days')
        .select('event_date, start_time, end_time')
        .eq('event_id', eventId)
        .order('event_date', { ascending: true });

      if (eventDays && eventDays.length > 0) {
        const medicIds = staffingPlan.named_medics.map((m) => m.medic_id);

        // Check for overlapping commitments for each event day
        for (const day of eventDays) {
          const startTs = `${day.event_date}T${day.start_time}`;
          const endTs = `${day.event_date}T${day.end_time}`;

          const { data: conflicts } = await supabase
            .from('medic_commitments')
            .select('medic_id')
            .in('medic_id', medicIds)
            .lt('start_time', endTs)
            .gt('end_time', startTs);

          if (conflicts && conflicts.length > 0) {
            // Fetch company name for the error message
            const { data: company } = await supabase
              .from('marketplace_companies')
              .select('company_name')
              .eq('id', quote.company_id)
              .single();

            const companyName = company?.company_name || 'the company';
            return NextResponse.json(
              {
                error: `One or more named staff members are unavailable for the requested dates. Please contact ${companyName} to discuss alternatives.`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // 4. Calculate deposit percentage and amounts
    const depositPercent = requestedDepositPercent ?? getDepositPercentForEventType(event.event_type);
    const breakdown = calculateAwardAmounts(quote.total_price, depositPercent);

    // 5. Create or retrieve Stripe Customer
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    // Fetch user profile for customer creation
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, phone')
      .eq('id', user.id)
      .single();

    const clientEmail = profile?.email || user.email || '';
    const clientName = profile?.full_name || 'Client';

    if (hasStripe) {
      const { stripe } = await import('@/lib/stripe/server');

      // Check client_payment_methods for existing Stripe customer
      let customerId: string | null = null;

      const { data: existingMethod } = await supabase
        .from('client_payment_methods')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (existingMethod?.stripe_customer_id) {
        customerId = existingMethod.stripe_customer_id;
      }

      // If no customer found, create one
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: clientEmail,
          name: clientName,
          metadata: {
            user_id: user.id,
            source: 'marketplace',
          },
        });
        customerId = customer.id;
      }

      // 6. Create Stripe PaymentIntent with setup_future_usage
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(breakdown.depositAmount * 100), // GBP to pence
          currency: 'gbp',
          customer: customerId,
          setup_future_usage: 'off_session', // CRITICAL: saves card for remainder
          automatic_payment_methods: {
            enabled: true,
          },
          description: `Marketplace deposit for event: ${event.event_name}`,
          metadata: {
            event_id: eventId,
            quote_id: quoteId,
            company_id: quote.company_id,
            payment_type: 'deposit',
            deposit_percent: depositPercent.toString(),
            client_email: clientEmail,
            client_name: clientName,
            total_price: quote.total_price.toString(),
          },
          receipt_email: clientEmail,
        },
        {
          idempotencyKey: `pi_deposit_${quoteId}_${Date.now()}`,
        }
      );

      const response: AwardApiResponse = {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        customerId,
        depositAmount: breakdown.depositAmount,
        remainderAmount: breakdown.remainderAmount,
        depositPercent,
        totalPrice: quote.total_price,
      };

      return NextResponse.json(response);
    }

    // Development mock: no STRIPE_SECRET_KEY
    const mockCustomerId = `cus_mock_${user.id.slice(0, 8)}`;
    const mockClientSecret = `pi_mock_${quoteId}_secret_${Date.now()}`;
    const mockPaymentIntentId = `pi_mock_${quoteId}`;

    const response: AwardApiResponse = {
      clientSecret: mockClientSecret,
      paymentIntentId: mockPaymentIntentId,
      customerId: mockCustomerId,
      depositAmount: breakdown.depositAmount,
      remainderAmount: breakdown.remainderAmount,
      depositPercent,
      totalPrice: quote.total_price,
      mock: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Award API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
