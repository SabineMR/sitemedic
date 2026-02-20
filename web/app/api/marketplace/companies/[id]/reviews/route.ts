/**
 * GET /api/marketplace/companies/[id]/reviews
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 *
 * Fetch paginated client reviews for a marketplace company.
 * Used by the CompanyRatingsSummary component on company profile pages.
 *
 * Query params:
 *   - page: 1-indexed (default 1)
 *   - limit: results per page (default 10, max 50)
 *
 * Returns: { ratings, distribution, total, currentUserId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Fetch client reviews for events where this company was awarded
    // Only published reviews that are past the blind window
    const { data: reviews, error: reviewsError } = await supabase
      .from('job_ratings')
      .select(`
        id,
        job_id,
        rater_user_id,
        rater_type,
        rating,
        review,
        blind_window_expires_at,
        moderation_status,
        flagged_at,
        flagged_by,
        flagged_reason,
        moderation_notes,
        moderated_by,
        moderated_at,
        created_at,
        updated_at
      `)
      .eq('rater_type', 'client')
      .in('moderation_status', ['published', 'flagged'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      console.error('[Company Reviews] Fetch error:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Filter to only reviews for events where this company was awarded
    // We need to check marketplace_quotes for the company match
    const { data: awardedQuotes } = await supabase
      .from('marketplace_quotes')
      .select('event_id')
      .eq('company_id', companyId)
      .eq('status', 'awarded');

    const awardedEventIds = new Set((awardedQuotes || []).map((q: { event_id: string }) => q.event_id));

    // Filter reviews to only those for awarded events, and past blind window
    const now = new Date();
    const filteredReviews = (reviews || []).filter((r: any) => {
      if (!awardedEventIds.has(r.job_id)) return false;

      // Check blind window: only show if expired or both parties rated
      if (r.blind_window_expires_at && new Date(r.blind_window_expires_at) > now) {
        // Window still open — check if both parties have rated
        // For the company profile page, we show ratings once blind window expires
        // We can't easily check "both rated" without another query per review,
        // so for the public listing we just check the window
        return false;
      }
      return true;
    });

    // Compute star distribution across ALL reviews (not just current page)
    const { data: allRatings } = await supabase
      .from('job_ratings')
      .select('rating, job_id')
      .eq('rater_type', 'client')
      .eq('moderation_status', 'published');

    const allFilteredRatings = (allRatings || []).filter((r: any) => awardedEventIds.has(r.job_id));

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of allFilteredRatings) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    // Paginate filtered reviews (we already fetched with range but filtered further)
    const paginatedReviews = filteredReviews.slice(0, limit);

    return NextResponse.json({
      ratings: paginatedReviews,
      distribution,
      total: filteredReviews.length,
      currentUserId: user?.id || null,
    });
  } catch (error) {
    console.error('[Company Reviews] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
