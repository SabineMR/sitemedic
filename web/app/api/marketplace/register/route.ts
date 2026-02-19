/**
 * POST /api/marketplace/register
 * Phase 32: Marketplace Company Registration
 *
 * Creates a marketplace_companies row from the registration wizard data.
 * Handles two flows:
 *   1. Existing SiteMedic org: links marketplace_companies.org_id to existing org
 *   2. New user: creates a new organizations row first, then links
 *
 * Uses service-role client because the user may not have an org_id yet
 * (RLS would block the insert).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface RegisterBody {
  companyName: string;
  companyRegNumber?: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress?: string;
  companyPostcode?: string;
  coverageAreas?: string[];
  companyDescription?: string;
  cqcProviderId: string;
  cqcVerified: boolean;
  cqcProviderName: string;
  cqcRegistrationStatus: string;
  existingOrgId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
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
    let body: RegisterBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const {
      companyName,
      companyRegNumber,
      companyEmail,
      companyPhone,
      companyAddress,
      companyPostcode,
      coverageAreas,
      companyDescription,
      cqcProviderId,
      cqcVerified,
      cqcProviderName,
      cqcRegistrationStatus,
      existingOrgId,
    } = body;

    // Validate required fields
    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    if (!companyEmail?.trim()) {
      return NextResponse.json(
        { error: 'Company email is required' },
        { status: 400 }
      );
    }

    if (!cqcProviderId?.trim()) {
      return NextResponse.json(
        { error: 'CQC Provider ID is required' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // 3. Check if user already has a marketplace_companies entry
    const { data: existingCompany } = await serviceClient
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'You already have a marketplace company registered' },
        { status: 409 }
      );
    }

    // 4. Determine org_id
    let orgId: string;

    if (existingOrgId) {
      // Verify user belongs to that org
      const userOrgId = user.app_metadata?.org_id;
      if (userOrgId !== existingOrgId) {
        return NextResponse.json(
          { error: 'You do not belong to the specified organisation' },
          { status: 403 }
        );
      }
      orgId = existingOrgId;
    } else {
      // Create a new organization for this marketplace company
      const { data: newOrg, error: orgError } = await serviceClient
        .from('organizations')
        .insert({
          name: companyName.trim(),
          contact_email: companyEmail.trim(),
          contact_phone: companyPhone?.trim() || null,
          address: companyAddress?.trim() || null,
          postcode: companyPostcode?.trim() || null,
          created_by: user.id,
          status: 'active',
          onboarding_completed: true, // Marketplace orgs don't go through SiteMedic onboarding
        })
        .select('id')
        .single();

      if (orgError || !newOrg) {
        console.error('[Register] Failed to create organization:', orgError);
        return NextResponse.json(
          { error: 'Failed to create organisation' },
          { status: 500 }
        );
      }

      orgId = newOrg.id;

      // Create org_membership
      await serviceClient.from('org_memberships').insert({
        org_id: orgId,
        user_id: user.id,
        role: 'org_admin',
      });

      // Update user app_metadata with org_id
      await serviceClient.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...user.app_metadata,
          org_id: orgId,
          role: user.app_metadata?.role || 'org_admin',
        },
      });
    }

    // 5. Create marketplace_companies row
    const { data: company, error: companyError } = await serviceClient
      .from('marketplace_companies')
      .insert({
        org_id: orgId,
        admin_user_id: user.id,
        company_name: companyName.trim(),
        company_reg_number: companyRegNumber?.trim() || null,
        company_email: companyEmail.trim(),
        company_phone: companyPhone?.trim() || null,
        company_address: companyAddress?.trim() || null,
        company_postcode: companyPostcode?.trim() || null,
        coverage_areas: coverageAreas || null,
        company_description: companyDescription?.trim() || null,
        cqc_provider_id: cqcProviderId.trim(),
        cqc_registration_status: cqcRegistrationStatus || 'Unknown',
        cqc_auto_verified: cqcVerified,
        verification_status: cqcVerified ? 'cqc_verified' : 'pending',
        can_browse_events: true,
        can_submit_quotes: false, // Until admin manually verifies
      })
      .select('id')
      .single();

    if (companyError || !company) {
      console.error('[Register] Failed to create marketplace company:', companyError);
      return NextResponse.json(
        { error: 'Failed to create marketplace company' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
    });
  } catch (error) {
    console.error('[Register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
