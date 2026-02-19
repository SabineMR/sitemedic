/**
 * GET /api/marketplace/quotes/list
 * Phase 34: Quote Submission & Comparison
 *
 * Endpoint for listing quotes on an event with optional filtering and sorting.
 * Only returns non-draft quotes (submitted, revised).
 * Supports sorting by: best_value, price_low, price_high, rating, recent.
 * Supports filtering by: qualification level, price range, minimum rating.
 *
 * Query params:
 *   - eventId: UUID (required)
 *   - sortBy: 'best_value' | 'price_low' | 'price_high' | 'rating' | 'recent'
 *   - filterQualification: staffing role to filter by
 *   - filterPriceMin, filterPriceMax: price range filter
 *   - filterMinRating: minimum company rating (0-5)
 *   - page: 1-indexed page number
 *   - limit: results per page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // =========================================================================
    // 1. Parse query parameters
    // =========================================================================

    const searchParams = request.nextUrl.searchParams;

    const eventId = searchParams.get('eventId');
    const sortBy = searchParams.get('sortBy') || 'best_value';
    const filterQualification = searchParams.get('filterQualification');
    const filterPriceMin = searchParams.get('filterPriceMin')
      ? parseFloat(searchParams.get('filterPriceMin')!)
      : undefined;
    const filterPriceMax = searchParams.get('filterPriceMax')
      ? parseFloat(searchParams.get('filterPriceMax')!)
      : undefined;
    const filterMinRating = searchParams.get('filterMinRating')
      ? parseFloat(searchParams.get('filterMinRating')!)
      : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'eventId query param is required' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 2. Fetch quotes for event (non-draft only)
    // =========================================================================

    const supabase = createClient();

    let query = supabase
      .from('marketplace_quotes')
      .select('*')
      .eq('event_id', eventId)
      .neq('status', 'draft');

    // Apply price filter
    if (filterPriceMin !== undefined) {
      query = query.gte('total_price', filterPriceMin);
    }
    if (filterPriceMax !== undefined) {
      query = query.lte('total_price', filterPriceMax);
    }

    // Apply sorting (client-side best_value sort will happen below)
    if (sortBy === 'price_low') {
      query = query.order('total_price', { ascending: true });
    } else if (sortBy === 'price_high') {
      query = query.order('total_price', { ascending: false });
    } else if (sortBy === 'recent') {
      query = query.order('submitted_at', { ascending: false });
    } else {
      // best_value and rating sorts need company data
      query = query.order('submitted_at', { ascending: false });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: quotes, error: quotesError, count } = await query;

    if (quotesError) {
      console.error('Quotes fetch error:', quotesError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch quotes' },
        { status: 500 }
      );
    }

    // =========================================================================
    // 3. Fetch company details for each quote
    // =========================================================================

    const companyIds = [...new Set(quotes.map((q: any) => q.company_id))];

    const { data: companies, error: companiesError } = await supabase
      .from('marketplace_companies')
      .select('id, company_name, verification_status')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Companies fetch error:', companiesError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch company data' },
        { status: 500 }
      );
    }

    // Build company map
    const companyMap = new Map(companies.map((c: any) => [c.id, c]));

    // =========================================================================
    // 4. Enrich quotes with company data
    // =========================================================================

    const enrichedQuotes = quotes.map((quote: any) => {
      const company = companyMap.get(quote.company_id) || {};
      return {
        ...quote,
        company_name: company.company_name || 'Unknown Company',
        company_rating: 0, // Placeholder — Phase 36 adds ratings
        company_review_count: 0, // Placeholder
        company_verification_status: company.verification_status,
      };
    });

    // =========================================================================
    // 5. Apply qualification filter (on staffing_plan)
    // =========================================================================

    let filtered = enrichedQuotes;

    if (filterQualification) {
      filtered = enrichedQuotes.filter((quote: any) => {
        const plan = quote.staffing_plan;
        if (plan.type === 'named_medics') {
          return plan.named_medics.some((m: any) => m.qualification === filterQualification);
        } else {
          return plan.headcount_plans.some((h: any) => h.role === filterQualification);
        }
      });
    }

    // Apply rating filter
    if (filterMinRating !== undefined) {
      filtered = filtered.filter((q: any) => q.company_rating >= filterMinRating);
    }

    // =========================================================================
    // 6. Apply best_value sort (client-side, as it needs both price and rating)
    // =========================================================================

    if (sortBy === 'best_value') {
      filtered = filtered.sort((a: any, b: any) => {
        // Simple price sort for now (Phase 35 adds rating-based best_value)
        return a.total_price - b.total_price;
      });
    } else if (sortBy === 'rating') {
      filtered = filtered.sort((a: any, b: any) => b.company_rating - a.company_rating);
    }

    // =========================================================================
    // 7. Return response
    // =========================================================================

    return NextResponse.json(
      {
        success: true,
        quotes: filtered,
        total: count || filtered.length,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/marketplace/quotes/list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
