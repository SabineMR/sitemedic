/**
 * GET  /api/marketplace/events/[id]/ratings -- Retrieve ratings for a marketplace event
 * POST /api/marketplace/events/[id]/ratings -- Submit or update a rating
 *
 * Phase 36: Ratings, Messaging & Disputes
 *
 * Marketplace event ratings with blind window system:
 *   - Neither party sees the other's rating until both have submitted
 *     OR 14 days after the last event day (whichever comes first).
 *   - Requesting user always sees their own rating (viewerRating).
 *   - canRate is true when: user hasn't rated, event status is 'completed',
 *     AND NOW() <= blind_window_expires_at.
 *
 * Constraints:
 *   - Ratings only allowed on completed events
 *   - One rating per user per event (upsert via ON CONFLICT)
 *   - Rating must be 1-5 stars
 *   - Rater type determined from event poster (client) or awarded company admin (company)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const ratingSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  review: z.string().max(2000, 'Review must be under 2000 characters').optional().nullable(),
});

// =============================================================================
// GET -- Retrieve ratings for a marketplace event (with blind window logic)
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the event exists in marketplace_events
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Marketplace event not found' }, { status: 404 });
    }

    // Fetch all ratings for this event
    const { data: ratings, error: ratingsError } = await supabase
      .from('job_ratings')
      .select('id, rater_user_id, rater_type, rating, review, blind_window_expires_at, created_at, updated_at')
      .eq('job_id', eventId)
      .order('created_at', { ascending: true });

    if (ratingsError) {
      console.error('[Marketplace Ratings GET] Fetch error:', ratingsError);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    const ratingList = ratings || [];
    const now = new Date();

    // Determine blind window state from existing ratings
    const blindWindowExpiresAt = ratingList.length > 0
      ? ratingList[0].blind_window_expires_at
      : null;

    const blindWindowExpiry = blindWindowExpiresAt ? new Date(blindWindowExpiresAt) : null;

    // Check if both client and company have rated
    const hasClientRating = ratingList.some((r) => r.rater_type === 'client');
    const hasCompanyRating = ratingList.some((r) => r.rater_type === 'company');
    const bothPartiesRated = hasClientRating && hasCompanyRating;

    // Blind window is active when: NOT both rated AND window hasn't expired
    const blindWindowActive =
      !bothPartiesRated && blindWindowExpiry !== null && now <= blindWindowExpiry;

    // Extract the viewer's own rating (always visible regardless of blind window)
    const viewerRating = ratingList.find((r) => r.rater_user_id === user.id) || null;

    // Determine visible ratings based on blind window
    let visibleRatings;
    if (blindWindowActive) {
      // Only show the requesting user's own rating during blind window
      visibleRatings = viewerRating ? [viewerRating] : [];
    } else {
      // Both rated or window expired: all ratings visible
      visibleRatings = ratingList;
    }

    // Compute average from ALL ratings (not just visible) for consistency
    const averageRating =
      ratingList.length > 0
        ? Math.round(
            (ratingList.reduce((sum, r) => sum + r.rating, 0) / ratingList.length) * 10
          ) / 10
        : null;

    // canRate: user hasn't rated, event is completed, and blind window hasn't expired
    const userHasRated = viewerRating !== null;
    const canRate =
      !userHasRated &&
      event.status === 'completed' &&
      (blindWindowExpiry === null || now <= blindWindowExpiry);

    return NextResponse.json({
      ratings: visibleRatings,
      averageRating: blindWindowActive ? null : averageRating,
      count: blindWindowActive ? visibleRatings.length : ratingList.length,
      canRate,
      blindWindowActive,
      blindWindowExpiresAt: blindWindowExpiresAt || null,
      viewerRating,
    });
  } catch (error) {
    console.error('[Marketplace Ratings GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST -- Submit or update a rating (upsert) with blind window
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rating, review } = parsed.data;

    // Verify the event exists and is completed
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Marketplace event not found' }, { status: 404 });
    }

    if (event.status !== 'completed') {
      return NextResponse.json(
        { error: 'Ratings can only be submitted for completed events' },
        { status: 400 }
      );
    }

    // Compute blind_window_expires_at from the last event_day + 14 days
    const { data: lastDay, error: lastDayError } = await supabase
      .from('event_days')
      .select('date')
      .eq('event_id', eventId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (lastDayError || !lastDay) {
      return NextResponse.json(
        { error: 'Could not determine event completion date' },
        { status: 400 }
      );
    }

    const lastDayDate = new Date(lastDay.date);
    const blindWindowExpiresAt = new Date(lastDayDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Validate that blind window hasn't expired (can't rate after window closes)
    if (now > blindWindowExpiresAt) {
      return NextResponse.json(
        { error: 'Rating window has expired (14 days after event completion)' },
        { status: 400 }
      );
    }

    // Determine rater_type based on the user's role in this event
    let raterType: 'company' | 'client';

    if (event.posted_by === user.id) {
      // User posted the event -> they are the client
      raterType = 'client';
    } else {
      // Check if user is the admin of the company that was awarded the quote
      const { data: awardedQuote, error: quoteError } = await supabase
        .from('marketplace_quotes')
        .select('company_id, marketplace_companies!inner(admin_user_id)')
        .eq('event_id', eventId)
        .eq('status', 'awarded')
        .single();

      if (quoteError || !awardedQuote) {
        return NextResponse.json(
          { error: 'No awarded quote found for this event' },
          { status: 403 }
        );
      }

      // Access admin_user_id from the joined marketplace_companies
      const companies = awardedQuote.marketplace_companies as unknown as { admin_user_id: string };
      const adminUserId = companies.admin_user_id;

      if (adminUserId === user.id) {
        raterType = 'company';
      } else {
        return NextResponse.json(
          { error: 'Only the event poster or awarded company admin can submit ratings' },
          { status: 403 }
        );
      }
    }

    // Upsert: insert if new, update if existing (UNIQUE on job_id + rater_user_id)
    const { data: upserted, error: upsertError } = await supabase
      .from('job_ratings')
      .upsert(
        {
          job_id: eventId,
          rater_user_id: user.id,
          rater_type: raterType,
          rating,
          review: review || null,
          blind_window_expires_at: blindWindowExpiresAt.toISOString(),
          moderation_status: 'published',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'job_id,rater_user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[Marketplace Ratings POST] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating: upserted });
  } catch (error) {
    console.error('[Marketplace Ratings POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
