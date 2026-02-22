import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 });
    }

    const [{ data: score, error: scoreError }, { data: signals, error: signalsError }] = await Promise.all([
      supabase
        .from('marketplace_integrity_scores')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle(),
      supabase
        .from('marketplace_integrity_signals')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (scoreError || signalsError) {
      throw scoreError || signalsError;
    }

    return NextResponse.json(
      {
        eventId,
        score: score || null,
        signals: signals || [],
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('[Platform Integrity Event GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
