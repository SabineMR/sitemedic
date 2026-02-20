/**
 * GET/PUT /api/marketplace/payments/method
 * Phase 35: Award Flow & Payment — Plan 03
 *
 * GET: List saved payment methods for the authenticated marketplace client
 * PUT: Update the default payment method (attach new card, update bookings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

// =============================================================================
// GET: List saved payment methods + upcoming remainder charges
// =============================================================================

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch saved payment methods
  const { data: methods, error: methodsError } = await supabase
    .from('client_payment_methods')
    .select('id, stripe_customer_id, stripe_payment_method_id, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false });

  if (methodsError) {
    console.error('[Payment Method API] Error fetching methods:', methodsError);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }

  // Enrich with card details from Stripe
  const enrichedMethods = await Promise.all(
    (methods || []).map(async (method) => {
      try {
        const pm = await stripe.paymentMethods.retrieve(method.stripe_payment_method_id);
        return {
          id: method.id,
          stripe_payment_method_id: method.stripe_payment_method_id,
          is_default: method.is_default,
          card_brand: pm.card?.brand || 'unknown',
          card_last_four: pm.card?.last4 || '****',
          card_expiry_month: pm.card?.exp_month || 0,
          card_expiry_year: pm.card?.exp_year || 0,
          created_at: method.created_at,
        };
      } catch {
        return {
          id: method.id,
          stripe_payment_method_id: method.stripe_payment_method_id,
          is_default: method.is_default,
          card_brand: 'unknown',
          card_last_four: '****',
          card_expiry_month: 0,
          card_expiry_year: 0,
          created_at: method.created_at,
        };
      }
    })
  );

  // Fetch upcoming remainder charges
  const { data: upcomingCharges } = await supabase
    .from('bookings')
    .select('id, site_name, remainder_amount, remainder_due_at, shift_date, marketplace_event_id')
    .eq('source', 'marketplace')
    .is('remainder_paid_at', null)
    .not('remainder_due_at', 'is', null)
    .in(
      'stripe_customer_id',
      (methods || []).map((m) => m.stripe_customer_id)
    )
    .order('remainder_due_at', { ascending: true });

  return NextResponse.json({
    methods: enrichedMethods,
    upcomingCharges: upcomingCharges || [],
  });
}

// =============================================================================
// PUT: Update default payment method
// =============================================================================

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { paymentMethodId } = body;

  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 });
  }

  // Get existing customer ID
  const { data: existingMethod } = await supabase
    .from('client_payment_methods')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  if (!existingMethod?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
  }

  const customerId = existingMethod.stripe_customer_id;

  try {
    // Attach new payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default for future off-session charges
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Mark old defaults as non-default
    await supabase
      .from('client_payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true);

    // Upsert new payment method
    await supabase.from('client_payment_methods').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        is_default: true,
      },
      { onConflict: 'stripe_payment_method_id' }
    );

    // Update all unpaid marketplace bookings to use new payment method
    await supabase
      .from('bookings')
      .update({ stripe_payment_method_id: paymentMethodId })
      .eq('source', 'marketplace')
      .eq('stripe_customer_id', customerId)
      .is('remainder_paid_at', null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payment Method API] Error updating payment method:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payment method' },
      { status: 500 }
    );
  }
}
