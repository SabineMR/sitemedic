/**
 * POST /api/platform/organizations/activate
 * Phase 29: Platform admin activates a pending org after reviewing signup.
 *
 * This is the "human in the loop" step. Platform admin (Sabine) reviews each
 * new signup before the org goes live. On activation:
 *   1. Validates platform_admin role
 *   2. Assigns slug for Growth/Enterprise tiers (subdomain)
 *   3. Sets onboarding_completed = true
 *   4. Sends welcome email to the org admin
 *
 * After activation, the middleware gate (29-03) stops redirecting to /onboarding
 * and allows the org admin into /admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email/send-welcome';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Service-role Supabase client (same pattern as billing/checkout/route.ts)
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
// Slug validation: lowercase alphanumeric + hyphens, 3-30 chars
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// ---------------------------------------------------------------------------
// Tier display name mapping
// ---------------------------------------------------------------------------

const TIER_DISPLAY_NAME: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check — must be platform admin
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

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Forbidden — platform admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    let body: { orgId?: string; slug?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { orgId, slug } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      );
    }

    // 3. Service-role client for admin operations
    const serviceClient = getServiceClient();

    // 4. Fetch the org
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, name, contact_email, subscription_tier, subscription_status, onboarding_completed, created_by')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // 5. Validate — must not already be activated
    if (org.onboarding_completed === true) {
      return NextResponse.json(
        { error: 'Organization is already activated' },
        { status: 400 }
      );
    }

    // 6. Slug assignment for Growth/Enterprise
    const tier = org.subscription_tier as string | null;
    const needsSlug = tier === 'growth' || tier === 'enterprise';

    if (needsSlug) {
      if (!slug) {
        return NextResponse.json(
          { error: 'Slug is required for Growth/Enterprise orgs' },
          { status: 400 }
        );
      }

      // Validate slug format
      if (!SLUG_REGEX.test(slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format. Must be 3-30 chars, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen.' },
          { status: 400 }
        );
      }

      // Check slug uniqueness
      const { data: existingSlug } = await serviceClient
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Slug is already taken. Please choose a different subdomain.' },
          { status: 409 }
        );
      }

      // Update org with slug + activate
      const { error: updateError } = await serviceClient
        .from('organizations')
        .update({ slug, onboarding_completed: true })
        .eq('id', orgId);

      if (updateError) {
        console.error('Failed to activate org with slug:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate organization' },
          { status: 500 }
        );
      }
    } else {
      // Starter tier — no slug assignment, just activate
      const { error: updateError } = await serviceClient
        .from('organizations')
        .update({ onboarding_completed: true })
        .eq('id', orgId);

      if (updateError) {
        console.error('Failed to activate org:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate organization' },
          { status: 500 }
        );
      }
    }

    // 7. Get org admin info for welcome email
    let orgAdminEmail = '';
    let orgAdminName = 'there';

    if (org.created_by) {
      // Get user's email from auth
      const { data: userData } = await serviceClient.auth.admin.getUserById(org.created_by);
      if (userData?.user?.email) {
        orgAdminEmail = userData.user.email;
      }

      // Get profile name
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('full_name')
        .eq('id', org.created_by)
        .single();

      if (profile?.full_name) {
        orgAdminName = profile.full_name;
      }
    }

    // 8. Get branding for company name
    const { data: branding } = await serviceClient
      .from('org_branding')
      .select('company_name')
      .eq('org_id', orgId)
      .single();

    // 9. Send welcome email (fire-and-forget — sendWelcomeEmail handles errors internally)
    const tierDisplayName = TIER_DISPLAY_NAME[tier || 'starter'] || 'Starter';

    if (orgAdminEmail) {
      await sendWelcomeEmail({
        orgId,
        orgAdminEmail,
        orgAdminName,
        slug: needsSlug ? slug : undefined,
        planName: tierDisplayName,
      });
    } else {
      console.warn(`No email found for org admin (created_by: ${org.created_by}) — welcome email skipped`);
    }

    // 10. Return success
    return NextResponse.json({
      success: true,
      slug: slug || null,
      companyName: branding?.company_name || org.name,
      welcomeEmailSent: !!orgAdminEmail,
    });
  } catch (error) {
    console.error('Activation route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
