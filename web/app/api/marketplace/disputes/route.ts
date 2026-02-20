/**
 * GET /api/marketplace/disputes
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Platform admin endpoint to list all marketplace disputes.
 * Supports filtering by status via query param.
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

    // Verify platform admin
    const { data: isAdmin } = await supabase.rpc('is_platform_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('marketplace_disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: disputes, error: disputesError } = await query;

    if (disputesError) {
      console.error('[Disputes List] Fetch error:', disputesError);
      return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
    }

    // Enrich with event names
    const eventIds = [...new Set((disputes || []).map((d: any) => d.event_id))];
    let eventMap = new Map();

    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('marketplace_events')
        .select('id, event_name')
        .in('id', eventIds);

      eventMap = new Map((events || []).map((e: any) => [e.id, e.event_name]));
    }

    const enriched = (disputes || []).map((d: any) => ({
      ...d,
      event_name: eventMap.get(d.event_id) || null,
    }));

    return NextResponse.json({ disputes: enriched });
  } catch (error) {
    console.error('[Disputes List] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
