/**
 * GET /api/direct-jobs/combined — Return both marketplace and direct jobs for the current user
 *
 * Phase 34.1: Self-Procured Jobs — Plan 03
 *
 * Supports query params:
 *   - source: 'marketplace' | 'direct' (filter by source, omit for all)
 *   - status: event status filter
 *   - search: text search on event_name
 *   - page: pagination (default 1)
 *   - limit: items per page (default 20, max 100)
 *
 * Returns a unified list of jobs from marketplace_events with source badges.
 * Direct jobs include joined direct_clients data.
 * Ordered by created_at descending (newest first).
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
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Query all marketplace_events for this user (both marketplace and direct)
    // Include direct_clients and event_days for UI display
    let query = supabase
      .from('marketplace_events')
      .select(
        '*, direct_clients(*), event_days(*), event_staffing_requirements(*)',
        { count: 'exact' }
      )
      .eq('posted_by', user.id);

    // Filter by source if specified
    if (source === 'marketplace' || source === 'direct') {
      query = query.eq('source', source);
    }

    // Filter by status if specified
    if (status) {
      query = query.eq('status', status);
    }

    // Text search on event_name
    if (search) {
      query = query.ilike('event_name', `%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('[Combined Jobs GET] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Map joined data for direct jobs
    const mappedJobs = (jobs || []).map((row: Record<string, unknown>) => ({
      ...row,
      client: row.direct_clients || null,
    }));

    return NextResponse.json({
      jobs: mappedJobs,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Combined Jobs GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
