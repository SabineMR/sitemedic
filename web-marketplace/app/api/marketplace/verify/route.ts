/**
 * POST /api/marketplace/verify
 * Phase 32-03: Admin Verification Actions
 *
 * Handles admin verification actions for marketplace company registrations:
 * - approve: Approve company registration (sets verified + can_submit_quotes)
 * - reject: Reject company registration (with reason)
 * - request_info: Request additional information (with notes)
 * - cqc_recheck: Re-verify CQC status for a company
 *
 * Access: platform_admin role only
 * Pattern follows: web/app/api/platform/organizations/activate/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  approveCompany,
  rejectCompany,
  requestMoreInfo,
} from '@/lib/marketplace/admin-actions';
import { verifyCQCProvider } from '@/lib/marketplace/cqc-client';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Service-role client for CQC re-check updates
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
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check - must be platform admin
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
        { error: 'Forbidden - platform admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    let body: { companyId?: string; action?: string; notes?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { companyId, action, notes } = body;

    // 3. Validate input
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'reject', 'request_info', 'cqc_recheck'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Notes required for reject and request_info
    if ((action === 'reject' || action === 'request_info') && !notes?.trim()) {
      return NextResponse.json(
        { error: 'notes are required for reject and request_info actions' },
        { status: 400 }
      );
    }

    // 4. Handle CQC re-check separately
    if (action === 'cqc_recheck') {
      return handleCqcRecheck(companyId);
    }

    // 5. Execute admin action
    let result: { success: boolean; error?: string };

    switch (action) {
      case 'approve':
        result = await approveCompany(companyId, user.id);
        break;
      case 'reject':
        result = await rejectCompany(companyId, user.id, notes!.trim());
        break;
      case 'request_info':
        result = await requestMoreInfo(companyId, user.id, notes!.trim());
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// CQC Re-check Handler
// ---------------------------------------------------------------------------

async function handleCqcRecheck(companyId: string): Promise<NextResponse> {
  try {
    const serviceClient = getServiceClient();

    // Fetch the company's CQC provider ID
    const { data: company, error: fetchError } = await serviceClient
      .from('marketplace_companies')
      .select('cqc_provider_id')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Call CQC API
    const result = await verifyCQCProvider(company.cqc_provider_id);

    // Update the company with fresh CQC data
    const updateData: Record<string, unknown> = {
      cqc_last_checked_at: new Date().toISOString(),
    };

    if (result.valid && result.provider) {
      updateData.cqc_registration_status = result.provider.registrationStatus;
      updateData.cqc_auto_verified = result.provider.registrationStatus === 'Registered';
    } else if (result.provider) {
      updateData.cqc_registration_status = result.provider.registrationStatus;
      updateData.cqc_auto_verified = false;
    }

    const { error: updateError } = await serviceClient
      .from('marketplace_companies')
      .update(updateData)
      .eq('id', companyId);

    if (updateError) {
      console.error('Failed to update CQC status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update CQC status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cqcStatus: result.provider?.registrationStatus || 'Unknown',
      autoVerified: result.valid,
    });
  } catch (error) {
    console.error('CQC re-check error:', error);
    return NextResponse.json(
      { error: 'CQC re-check failed' },
      { status: 500 }
    );
  }
}
