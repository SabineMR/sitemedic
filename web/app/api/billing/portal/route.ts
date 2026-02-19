/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so org admins can manage
 * their subscription, payment methods, and invoices directly in Stripe.
 *
 * Phase 30-03: Subscription management via Stripe Customer Portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const supabase = await createClient();

    // Fetch the org's Stripe customer ID
    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (error || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 400 }
      );
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account linked. Your organisation may have been set up before Stripe billing was enabled. Please contact support to link your billing account.' },
        { status: 400 }
      );
    }

    // Determine return URL — back to the settings page after portal session
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:30500';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/admin/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
