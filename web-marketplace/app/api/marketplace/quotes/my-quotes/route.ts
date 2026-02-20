/**
 * GET /api/marketplace/quotes/my-quotes
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Endpoint for fetching all quotes submitted by a company.
 * JOINs marketplace_events to include event name, type, status, and deadline.
 * Supports filtering by quote status and pagination.
 *
 * Guards:
 * - Must be authenticated
 * - Returns quotes for the user's company (via admin_user_id lookup)
 * - Returns empty array if user has no company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
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
    // 2. Find user's company
    // =========================================================================

    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      // No company — return empty result (not an error)
      return NextResponse.json(
        {
          success: true,
          quotes: [],
          total: 0,
          page: 1,
          limit: 20,
        },
        { status: 200 }
      );
    }

    // =========================================================================
    // 3. Parse query parameters
    // =========================================================================

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // =========================================================================
    // 4. Build and execute query
    // =========================================================================

    let query = supabase
      .from('marketplace_quotes')
      .select(
        `
        *,
        marketplace_events!inner (
          id,
          event_name,
          event_type,
          status,
          quote_deadline,
          deadline_extended
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (statusFilter !== 'all') {
      const validStatuses = ['draft', 'submitted', 'revised', 'withdrawn'];
      if (validStatuses.includes(statusFilter)) {
        query = query.eq('status', statusFilter);
      }
    }

    const { data: quotes, error: quotesError, count } = await query;

    if (quotesError) {
      console.error('[My Quotes] Query error:', quotesError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch quotes' },
        { status: 500 }
      );
    }

    // =========================================================================
    // 5. Return results
    // =========================================================================

    return NextResponse.json(
      {
        success: true,
        quotes: quotes || [],
        total: count || 0,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/marketplace/quotes/my-quotes error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
