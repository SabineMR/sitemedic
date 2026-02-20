/**
 * GET /api/marketplace/notifications
 *
 * Fetch notifications for the authenticated user with pagination.
 * Phase 38: Notifications & Alerts — Plan 02
 *
 * Query params:
 *   limit       - max rows to return (default 50, max 100)
 *   offset      - skip this many rows (default 0)
 *   unread_only - if 'true', only return unread notifications
 *
 * Returns:
 *   { notifications, unread_count, total_count }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);

    const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build the notifications query
    let query = supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    // Guard: only apply range when limit is positive
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: notifications, error: notifError, count: totalCount } = await query;

    if (notifError) {
      console.error('[Notifications GET] Fetch error:', notifError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count (always, regardless of filter)
    const { count: unreadCount, error: countError } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (countError) {
      console.error('[Notifications GET] Unread count error:', countError);
      // Non-fatal: return 0 unread count
    }

    return NextResponse.json({
      notifications: notifications ?? [],
      unread_count: unreadCount ?? 0,
      total_count: totalCount ?? 0,
    });
  } catch (error) {
    console.error('[Notifications GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
