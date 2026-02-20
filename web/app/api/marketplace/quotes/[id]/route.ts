/**
 * GET /api/marketplace/quotes/[id]
 * Phase 34: Quote Submission & Comparison
 *
 * Endpoint for fetching a single quote with full company details.
 * RLS ensures only:
 *   - The quote's company owner can see it
 *   - The event poster can see it (if not a draft)
 *   - Platform admin can see it
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    // =========================================================================
    // 1. Authenticate user
    // =========================================================================

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // =========================================================================
    // 2. Fetch quote (RLS enforces visibility)
    // =========================================================================

    const { data: quote, error: quoteError } = await supabase
      .from('marketplace_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { success: false, message: 'Quote not found' },
        { status: 404 }
      );
    }

    // =========================================================================
    // 3. Fetch company details
    // =========================================================================

    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select(
        `
        id,
        company_name,
        company_website,
        company_phone,
        company_email,
        company_address,
        insurance_provider,
        insurance_policy_number,
        insurance_expiry,
        certifications,
        verification_status
      `
      )
      .eq('id', quote.company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }

    // =========================================================================
    // 4. Return quote with company details
    // =========================================================================

    return NextResponse.json(
      {
        success: true,
        quote: {
          ...quote,
          company_name: company.company_name,
          company_rating: 0, // Placeholder — Phase 36 adds ratings
          company_review_count: 0, // Placeholder
          company_verification_status: company.verification_status,
        },
        company: {
          ...company,
          rating: 0, // Placeholder
          review_count: 0, // Placeholder
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/marketplace/quotes/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
