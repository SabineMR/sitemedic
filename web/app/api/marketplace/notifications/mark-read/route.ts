/**
 * PATCH /api/marketplace/notifications/mark-read
 *
 * Mark notifications as read for the authenticated user.
 * Phase 38: Notifications & Alerts — Plan 02
 *
 * Body (JSON):
 *   notification_ids?: string[]  - specific IDs to mark read (mutually exclusive with mark_all)
 *   mark_all?: boolean           - if true, mark ALL unread notifications as read
 *
 * Returns:
 *   { success: true, updated_count: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  notification_ids: z.array(z.string().uuid()).optional(),
  mark_all: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { notification_ids, mark_all } = parsed.data;

    if (!mark_all && (!notification_ids || notification_ids.length === 0)) {
      return NextResponse.json(
        { error: 'Must provide notification_ids or set mark_all=true' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (mark_all) {
      // Mark ALL unread notifications for this user as read
      const { data: updated, error: updateError } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: now })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .select('id');

      if (updateError) {
        console.error('[Notifications Mark-Read] mark_all update error:', updateError);
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated_count: updated?.length ?? 0 });
    }

    // Mark specific notification IDs as read — validate they belong to this user
    const { data: updated, error: updateError } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', user.id)
      .in('id', notification_ids!)
      .select('id');

    if (updateError) {
      console.error('[Notifications Mark-Read] specific IDs update error:', updateError);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_count: updated?.length ?? 0 });
  } catch (error) {
    console.error('[Notifications Mark-Read] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
