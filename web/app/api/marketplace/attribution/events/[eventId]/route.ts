import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAttributionChain,
  resolveAdminCompanyId,
} from '@/lib/marketplace/attribution/service';

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

    const chain = await getAttributionChain(supabase, eventId);

    const adminCompanyId = await resolveAdminCompanyId(supabase, user.id);
    const isPlatformAdmin = user.app_metadata?.role === 'platform_admin';
    const isParticipant =
      !!adminCompanyId &&
      [chain.originCompanyId, chain.currentResponsibleCompanyId, chain.activeHandoff?.target_company_id]
        .filter(Boolean)
        .includes(adminCompanyId);

    if (!isPlatformAdmin && !isParticipant) {
      const { data: eventOwnership } = await supabase
        .from('marketplace_events')
        .select('posted_by')
        .eq('id', eventId)
        .maybeSingle();

      const isPoster = eventOwnership?.posted_by === user.id;
      if (!isPoster) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(chain, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attribution chain';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error('[Attribution Chain API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
