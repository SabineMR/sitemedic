/**
 * POST /api/marketplace/stripe-connect
 * Phase 32: Marketplace Company Stripe Connect Onboarding
 *
 * Proxies to the stripe-connect Edge Function with the
 * 'create_company_express_account' action. Fetches company details
 * from the database so the client only needs to send { companyId }.
 *
 * Flow:
 *   1. Authenticate user
 *   2. Fetch marketplace_companies row (company details + admin ownership)
 *   3. Invoke stripe-connect Edge Function
 *   4. Return { account_id, onboarding_url }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface StripeConnectBody {
  companyId: string;
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
    let body: StripeConnectBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { companyId } = body;

    if (!companyId?.trim()) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // 3. Fetch company details and verify admin ownership
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id, company_name, company_email, company_reg_number')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    if (company.admin_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the company admin can initiate Stripe onboarding' },
        { status: 403 }
      );
    }

    // 4. Invoke the stripe-connect Edge Function
    const { data, error } = await supabase.functions.invoke('stripe-connect', {
      body: {
        action: 'create_company_express_account',
        company_id: companyId,
        company_name: company.company_name,
        company_email: company.company_email,
        company_reg_number: company.company_reg_number,
      },
    });

    if (error) {
      console.error('[Stripe Connect] Edge Function error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate Stripe onboarding' },
        { status: 500 }
      );
    }

    // 5. Return the onboarding URL
    return NextResponse.json({
      account_id: data.account_id,
      onboarding_url: data.onboarding_url,
    });
  } catch (error) {
    console.error('[Stripe Connect] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
