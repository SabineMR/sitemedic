/**
 * GET  /api/direct-jobs/[id]/ratings -- Retrieve ratings for a job
 * POST /api/direct-jobs/[id]/ratings -- Submit or update a rating
 *
 * Phase 34.1: Self-Procured Jobs -- Plan 05
 *
 * Bidirectional ratings for completed direct jobs. Company admin can rate
 * the client, and (once client auth exists) the client can rate the company.
 *
 * Constraints:
 *   - Ratings only allowed on completed jobs
 *   - One rating per user per job (upsert via ON CONFLICT)
 *   - Rating must be 1-5 stars
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
// GET -- Retrieve ratings for a job
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the job exists and is a direct job
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('id, source')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Fetch all ratings for this job
    const { data: ratings, error: ratingsError } = await supabase
      .from('job_ratings')
      .select('id, rater_user_id, rater_type, rating, review, created_at, updated_at')
      .eq('job_id', id)
      .order('created_at', { ascending: true });

    if (ratingsError) {
      console.error('[Ratings GET] Fetch error:', ratingsError);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    const ratingList = ratings || [];
    const averageRating =
      ratingList.length > 0
        ? Math.round(
            (ratingList.reduce((sum, r) => sum + r.rating, 0) / ratingList.length) * 10
          ) / 10
        : null;

    return NextResponse.json({
      ratings: ratingList,
      averageRating,
      count: ratingList.length,
    });
  } catch (error) {
    console.error('[Ratings GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST -- Submit or update a rating (upsert)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify the job exists, is source='direct', and is completed
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Ratings can only be submitted for completed jobs' },
        { status: 400 }
      );
    }

    // Determine rater type: company admin who posted the job -> 'company'
    // Future: client users linked to the job's client record -> 'client'
    let raterType: 'company' | 'client';
    if (job.posted_by === user.id) {
      raterType = 'company';
    } else {
      // For now, only the company admin can rate.
      // Client rating will be enabled when client auth exists.
      return NextResponse.json(
        { error: 'Only the job poster can submit ratings at this time' },
        { status: 403 }
      );
    }

    // Upsert: insert if new, update if existing (UNIQUE on job_id + rater_user_id)
    const { data: upserted, error: upsertError } = await supabase
      .from('job_ratings')
      .upsert(
        {
          job_id: id,
          rater_user_id: user.id,
          rater_type: raterType,
          rating,
          review: review || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'job_id,rater_user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[Ratings POST] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating: upserted });
  } catch (error) {
    console.error('[Ratings POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
