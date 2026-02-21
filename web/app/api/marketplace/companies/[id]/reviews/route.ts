/**
 * GET /api/marketplace/companies/[id]/reviews
 * Phase 36: Ratings, Messaging & Disputes — Plan 01
 * Enhanced: Phase 36 Extension — Features 4, 5, 6, 8
 *
 * Fetch paginated client reviews for a marketplace company.
 * Used by the CompanyRatingsSummary component on company profile pages.
 *
 * Enhancements:
 *   - Feature 4: Multi-dimension ratings + dimension averages
 *   - Feature 5: Verified Booking badge (booking_id included)
 *   - Feature 6: Company replies (LEFT JOIN review_replies)
 *   - Feature 8: Repeat client indicator (booking_count)
 *
 * Query params:
 *   - page: 1-indexed (default 1)
 *   - limit: results per page (default 10, max 50)
 *
 * Returns: { ratings, distribution, dimensionAverages, total, currentUserId }
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

    // Fetch awarded event IDs for this company
    const { data: awardedQuotes } = await supabase
      .from('marketplace_quotes')
      .select('event_id')
      .eq('company_id', companyId)
      .eq('status', 'awarded');

    const awardedEventIds = (awardedQuotes || []).map((q: { event_id: string }) => q.event_id);

    if (awardedEventIds.length === 0) {
      return NextResponse.json({
        ratings: [],
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        dimensionAverages: null,
        total: 0,
        currentUserId: user?.id || null,
      });
    }

    // Fetch client reviews for awarded events with dimension columns + booking_id
    const { data: reviews, error: reviewsError } = await supabase
      .from('job_ratings')
      .select(`
        id,
        job_id,
        booking_id,
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
        updated_at,
        rating_response_time,
        rating_professionalism,
        rating_equipment,
        rating_communication,
        rating_value
      `)
      .eq('rater_type', 'client')
      .in('moderation_status', ['published', 'flagged'])
      .in('job_id', awardedEventIds)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('[Company Reviews] Fetch error:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Filter to past blind window
    const now = new Date();
    const filteredReviews = (reviews || []).filter((r: any) => {
      if (r.blind_window_expires_at && new Date(r.blind_window_expires_at) > now) {
        return false;
      }
      return true;
    });

    // Feature 6: Fetch replies for visible reviews
    const visibleRatingIds = filteredReviews.map((r: any) => r.id);
    let repliesMap: Record<string, any> = {};

    if (visibleRatingIds.length > 0) {
      const { data: replies } = await supabase
        .from('review_replies')
        .select('id, rating_id, company_id, reply_by, reply_text, created_at, updated_at')
        .in('rating_id', visibleRatingIds);

      if (replies) {
        for (const reply of replies) {
          repliesMap[reply.rating_id] = reply;
        }
      }
    }

    // Fetch reviewer names from medics table (Bug 3 fix)
    const reviewerIds = [...new Set(filteredReviews.map((r: any) => r.rater_user_id))];
    let nameMap: Record<string, string> = {};

    if (reviewerIds.length > 0) {
      const { data: medics } = await supabase
        .from('medics')
        .select('user_id, first_name, last_name')
        .in('user_id', reviewerIds);

      if (medics) {
        for (const m of medics) {
          const name = `${m.first_name || ''} ${(m.last_name || '').charAt(0)}`.trim();
          if (name) nameMap[m.user_id] = name.endsWith('.') ? name : `${name}.`;
        }
      }
    }

    // Feature 8: Compute booking_count per reviewer (repeat client indicator)
    let bookingCountMap: Record<string, number> = {};

    if (reviewerIds.length > 0) {
      // Count awarded events per reviewer for this company
      for (const reviewerId of reviewerIds) {
        const { count } = await supabase
          .from('marketplace_events')
          .select('id', { count: 'exact', head: true })
          .eq('posted_by', reviewerId)
          .in('id', awardedEventIds);
        bookingCountMap[reviewerId] = count || 0;
      }
    }

    // Assemble enriched reviews with replies, booking count, and rater name
    const enrichedReviews = filteredReviews.map((r: any) => ({
      ...r,
      rater_name: nameMap[r.rater_user_id] || null,
      reply: repliesMap[r.id] || null,
      booking_count: bookingCountMap[r.rater_user_id] || 0,
    }));

    // Paginate
    const paginatedReviews = enrichedReviews.slice(offset, offset + limit);

    // Compute star distribution across ALL visible reviews (not just current page)
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of filteredReviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    // Feature 4: Compute dimension averages across all visible reviews
    const dimensionKeys = [
      'rating_response_time',
      'rating_professionalism',
      'rating_equipment',
      'rating_communication',
      'rating_value',
    ] as const;

    const dimensionAverages: Record<string, number | null> = {};
    for (const key of dimensionKeys) {
      const values = filteredReviews
        .map((r: any) => r[key])
        .filter((v: any) => v != null && typeof v === 'number');
      dimensionAverages[key] = values.length > 0
        ? Math.round((values.reduce((s: number, v: number) => s + v, 0) / values.length) * 100) / 100
        : null;
    }

    return NextResponse.json({
      ratings: paginatedReviews,
      distribution,
      dimensionAverages,
      total: filteredReviews.length,
      currentUserId: user?.id || null,
    });
  } catch (error) {
    console.error('[Company Reviews] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
