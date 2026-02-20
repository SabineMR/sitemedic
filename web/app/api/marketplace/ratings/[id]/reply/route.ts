/**
 * GET/POST/PUT /api/marketplace/ratings/[id]/reply
 * Phase 36 Extension: Feature 6 — Company Reply to Reviews
 *
 * Allows company admins to reply to client reviews (one reply per review).
 * GET: Fetch existing reply for a rating
 * POST: Create a new reply
 * PUT: Update an existing reply
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const replySchema = z.object({
  reply_text: z
    .string()
    .min(1, 'Reply cannot be empty')
    .max(1000, 'Reply must be under 1000 characters'),
});

// =============================================================================
// GET — Fetch existing reply for a rating
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ratingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: reply, error } = await supabase
      .from('review_replies')
      .select('id, rating_id, company_id, reply_by, reply_text, created_at, updated_at')
      .eq('rating_id', ratingId)
      .maybeSingle();

    if (error) {
      console.error('[Reply GET] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch reply' }, { status: 500 });
    }

    return NextResponse.json({ reply: reply || null });
  } catch (error) {
    console.error('[Reply GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST — Create a new reply (company admin only)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ratingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the rating exists and is a client review
    const { data: rating, error: ratingError } = await supabase
      .from('job_ratings')
      .select('id, job_id, rater_type')
      .eq('id', ratingId)
      .single();

    if (ratingError || !rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    if (rating.rater_type !== 'client') {
      return NextResponse.json(
        { error: 'Can only reply to client reviews' },
        { status: 400 }
      );
    }

    // Resolve the company from the awarded quote
    const { data: awardedQuote } = await supabase
      .from('marketplace_quotes')
      .select('company_id, marketplace_companies!inner(admin_user_id)')
      .eq('event_id', rating.job_id)
      .eq('status', 'awarded')
      .single();

    if (!awardedQuote) {
      return NextResponse.json({ error: 'No awarded quote for this event' }, { status: 403 });
    }

    const companies = awardedQuote.marketplace_companies as unknown as { admin_user_id: string };
    if (companies.admin_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the company admin can reply to reviews' },
        { status: 403 }
      );
    }

    // Check for existing reply
    const { data: existingReply } = await supabase
      .from('review_replies')
      .select('id')
      .eq('rating_id', ratingId)
      .maybeSingle();

    if (existingReply) {
      return NextResponse.json(
        { error: 'Reply already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Insert reply
    const { data: reply, error: insertError } = await supabase
      .from('review_replies')
      .insert({
        rating_id: ratingId,
        company_id: awardedQuote.company_id,
        reply_by: user.id,
        reply_text: parsed.data.reply_text,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Reply POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('[Reply POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PUT — Update an existing reply (company admin only)
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ratingId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the reply exists and belongs to this user
    const { data: existingReply, error: replyError } = await supabase
      .from('review_replies')
      .select('id, reply_by')
      .eq('rating_id', ratingId)
      .single();

    if (replyError || !existingReply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    if (existingReply.reply_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own replies' },
        { status: 403 }
      );
    }

    // Update reply
    const { data: reply, error: updateError } = await supabase
      .from('review_replies')
      .update({
        reply_text: parsed.data.reply_text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingReply.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Reply PUT] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('[Reply PUT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
