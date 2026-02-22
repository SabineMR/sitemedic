import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAdminCompanyId } from '@/lib/marketplace/attribution/service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const [{ data: event }, adminCompanyId] = await Promise.all([
      supabase
        .from('marketplace_events')
        .select('id, posted_by')
        .eq('id', eventId)
        .maybeSingle(),
      resolveAdminCompanyId(supabase, user.id),
    ]);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isPoster = event.posted_by === user.id;
    const isPlatformAdmin = user.app_metadata?.role === 'platform_admin';

    if (!isPoster && !isPlatformAdmin && !adminCompanyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ data: score }, { data: signals }] = await Promise.all([
      supabase
        .from('marketplace_integrity_scores')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle(),
      supabase
        .from('marketplace_integrity_signals')
        .select('id, signal_type, confidence, weight, created_at, details')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json(
      {
        eventId,
        score: score || null,
        signals: signals || [],
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[Marketplace Integrity Event GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
