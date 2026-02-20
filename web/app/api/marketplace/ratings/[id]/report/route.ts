/**
 * POST /api/marketplace/ratings/[id]/report
 * Report (flag) a marketplace review for moderation.
 *
 * - Any authenticated user can flag a published rating
 * - Platform admin can directly remove a rating with moderation notes
 * - Only ratings with moderation_status='published' can be flagged
 *
 * Uses job_ratings table with moderation columns from Phase 36.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const reportSchema = z.object({
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(1000, 'Reason must be under 1000 characters'),
  admin_action: z.literal('remove').optional(),
  moderation_notes: z.string().max(2000).optional(),
});

// =============================================================================
// POST -- Report/flag a rating for moderation
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate
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
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { reason, admin_action, moderation_notes } = parsed.data;

    // 3. Fetch the rating and verify it exists and is published
    const { data: rating, error: ratingError } = await supabase
      .from('job_ratings')
      .select('id, moderation_status')
      .eq('id', id)
      .single();

    if (ratingError || !rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      );
    }

    if (rating.moderation_status !== 'published') {
      return NextResponse.json(
        {
          error: `Rating cannot be reported: current status is '${rating.moderation_status}'`,
        },
        { status: 400 }
      );
    }

    // 4. Check if platform admin wants to directly remove
    if (admin_action === 'remove') {
      const { data: isAdmin } = await supabase.rpc('is_platform_admin');

      if (isAdmin !== true) {
        return NextResponse.json(
          { error: 'Only platform admins can directly remove ratings' },
          { status: 403 }
        );
      }

      // Admin removal: set status to 'removed' with moderation notes
      const { data: updated, error: updateError } = await supabase
        .from('job_ratings')
        .update({
          moderation_status: 'removed',
          flagged_at: new Date().toISOString(),
          flagged_by: user.id,
          flagged_reason: reason,
          moderation_notes: moderation_notes || null,
          moderated_by: user.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, moderation_status')
        .single();

      if (updateError) {
        console.error('[Rating Report] Admin removal error:', updateError);
        return NextResponse.json(
          { error: 'Failed to remove rating' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
        rating: updated,
      });
    }

    // 5. Standard flag: update moderation_status to 'flagged'
    const { data: updated, error: updateError } = await supabase
      .from('job_ratings')
      .update({
        moderation_status: 'flagged',
        flagged_at: new Date().toISOString(),
        flagged_by: user.id,
        flagged_reason: reason,
      })
      .eq('id', id)
      .select('id, moderation_status')
      .single();

    if (updateError) {
      console.error('[Rating Report] Flag error:', updateError);
      return NextResponse.json(
        { error: 'Failed to flag rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: 'flagged',
      rating: updated,
    });
  } catch (error) {
    console.error('[Rating Report] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
