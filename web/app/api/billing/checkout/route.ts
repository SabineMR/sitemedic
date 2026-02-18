/**
 * POST /api/billing/checkout
 * Phase 29: Create Stripe Checkout Session with org provisioning.
 *
 * This is the foundation of the onboarding flow. It:
 *   1. Creates the organization (with onboarding_completed=false)
 *   2. Creates the org_branding row (MANDATORY — no auto-trigger exists)
 *   3. Creates org_membership (org_admin role)
 *   4. Updates user app_metadata with org_id
 *   5. Creates a Stripe Customer
 *   6. Creates a Stripe Checkout Session with metadata.org_id
 *
 * The billing webhook (Phase 25) expects metadata.org_id on the Checkout
 * Session to write subscription data back to the org after payment.
 *
 * CRITICAL: org must exist BEFORE Stripe Checkout so the webhook can
 * associate the subscription with the correct org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/server';
import type { SubscriptionTier } from '@/lib/billing/feature-gates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
// Tier-to-price mapping
// ---------------------------------------------------------------------------

const VALID_TIERS: SubscriptionTier[] = ['starter', 'growth', 'enterprise'];

function getTierPriceId(tier: SubscriptionTier): string | null {
  const envMap: Record<SubscriptionTier, string> = {
    starter: 'STRIPE_PRICE_STARTER',
    growth: 'STRIPE_PRICE_GROWTH',
    enterprise: 'STRIPE_PRICE_ENTERPRISE',
  };

  const envVar = envMap[tier];
  const priceIds = process.env[envVar];

  if (!priceIds) return null;

  // Env vars are comma-separated (multiple currencies) — take the FIRST (GBP monthly)
  const firstPriceId = priceIds.split(',')[0]?.trim();
  return firstPriceId || null;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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

    // 2. Parse and validate request body
    let body: {
      tier?: string;
      orgName?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      postcode?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { tier, orgName, contactEmail, contactPhone, address, postcode } = body;

    // Validate required fields
    if (!tier || !VALID_TIERS.includes(tier as SubscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: starter, growth, enterprise' },
        { status: 400 }
      );
    }

    if (!orgName?.trim()) {
      return NextResponse.json(
        { error: 'Organisation name is required' },
        { status: 400 }
      );
    }

    if (!contactEmail?.trim()) {
      return NextResponse.json(
        { error: 'Contact email is required' },
        { status: 400 }
      );
    }

    // 3. Map tier to Stripe Price ID
    const priceId = getTierPriceId(tier as SubscriptionTier);
    if (!priceId) {
      console.error(`Missing Stripe price env var for tier: ${tier}`);
      return NextResponse.json(
        { error: 'Billing configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const serviceClient = getServiceClient();

    // 4. Create organization with onboarding_completed=false
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name: orgName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone?.trim() || null,
        address: address?.trim() || null,
        postcode: postcode?.trim() || null,
        created_by: user.id,
        status: 'active',
        onboarding_completed: false,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('Failed to create organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organisation. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Create org_branding row (MANDATORY — no auto-trigger exists per Phase 24-05)
    const { error: brandingError } = await serviceClient
      .from('org_branding')
      .insert({
        org_id: org.id,
        company_name: orgName.trim(),
      });

    if (brandingError) {
      console.error('Failed to create org_branding:', brandingError);
      // Non-fatal — org exists, branding can be created later
      // But log prominently since downstream features depend on it
      console.warn(
        `WARNING: org_branding row missing for org ${org.id}. ` +
        'White-label features will not work until this is resolved.'
      );
    }

    // 6. Create org_membership with org_admin role
    const { error: membershipError } = await serviceClient
      .from('org_memberships')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'org_admin',
      });

    if (membershipError) {
      console.error('Failed to create org_membership:', membershipError);
      return NextResponse.json(
        { error: 'Failed to set up organisation membership. Please contact support.' },
        { status: 500 }
      );
    }

    // 7. Update user app_metadata with org_id and role
    const { error: metadataError } = await serviceClient.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          org_id: org.id,
          role: 'org_admin',
        },
      }
    );

    if (metadataError) {
      console.error('Failed to update user app_metadata:', metadataError);
      // Non-fatal for checkout flow — middleware will still work after next token refresh
    }

    // 8. Create Stripe Customer
    const customer = await stripe.customers.create({
      email: contactEmail.trim(),
      name: orgName.trim(),
      metadata: { org_id: org.id },
    });

    // 9. Create Checkout Session
    const origin =
      request.headers.get('origin') ||
      request.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:30500';

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { org_id: org.id }, // CRITICAL for billing webhook
      success_url: `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup?cancelled=true`,
    });

    // 10. Return session URL and org ID
    return NextResponse.json({
      url: session.url,
      orgId: org.id,
    });
  } catch (error) {
    console.error('Checkout route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
