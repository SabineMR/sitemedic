/**
 * GET /api/billing/checkout-status
 * Phase 29: Subscription status polling endpoint for post-payment redirect.
 *
 * After Stripe Checkout completes, the user is redirected back to the
 * onboarding page BEFORE the billing webhook fires. The client polls this
 * endpoint until subscriptionStatus transitions from null to 'active',
 * indicating the webhook has processed successfully.
 *
 * Returns:
 *   - subscriptionStatus: 'active' | 'past_due' | 'cancelled' | null
 *   - subscriptionTier: 'starter' | 'growth' | 'enterprise' | null
 *   - stripeCustomerId: string | null
 *   - onboardingCompleted: boolean
 *   - isPending: boolean (true if onboarding not yet completed)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Service-role Supabase client (same pattern as billing-webhooks/route.ts)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get org_id from user app_metadata
    const orgId = user.app_metadata?.org_id;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organisation found for this user' },
        { status: 404 }
      );
    }

    // 3. Fetch org subscription state via service-role client
    const serviceClient = getServiceClient();

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select(
        'subscription_status, subscription_tier, stripe_customer_id, onboarding_completed'
      )
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      console.error('Failed to fetch org subscription state:', orgError);
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    // 4. Return status
    return NextResponse.json({
      subscriptionStatus: org.subscription_status,
      subscriptionTier: org.subscription_tier,
      stripeCustomerId: org.stripe_customer_id,
      onboardingCompleted: org.onboarding_completed ?? false,
      isPending: !org.onboarding_completed,
    });
  } catch (error) {
    console.error('Checkout status route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
