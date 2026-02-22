import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 });
    }

    const serviceClient = getServiceClient();

    const [
      { count: openCount },
      { count: investigatingCount },
      { count: highRiskCount },
      { count: holdCount },
      { data: openCases },
      { data: cfg },
    ] = await Promise.all([
      serviceClient
        .from('marketplace_integrity_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      serviceClient
        .from('marketplace_integrity_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'investigating'),
      serviceClient
        .from('marketplace_integrity_scores')
        .select('event_id', { count: 'exact', head: true })
        .eq('risk_band', 'high'),
      serviceClient
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('remainder_hold', true)
        .ilike('remainder_hold_reason', 'integrity_case:%'),
      serviceClient
        .from('marketplace_integrity_cases')
        .select('opened_at')
        .in('status', ['open', 'investigating'])
        .order('opened_at', { ascending: false })
        .limit(200),
      serviceClient
        .from('marketplace_integrity_config')
        .select('review_sla_hours')
        .eq('singleton_key', 'marketplace_integrity')
        .maybeSingle(),
    ]);

    const slaHours = Number(cfg?.review_sla_hours || 48);
    const now = Date.now();

    const openAgesHours = (openCases || []).map((row) =>
      (now - new Date(row.opened_at).getTime()) / (1000 * 60 * 60)
    );

    const avgOpenAgeHours =
      openAgesHours.length > 0
        ? Number((openAgesHours.reduce((sum, value) => sum + value, 0) / openAgesHours.length).toFixed(1))
        : 0;

    const slaBreaches = openAgesHours.filter((age) => age > slaHours).length;

    return NextResponse.json(
      {
        queue: {
          open: Number(openCount || 0),
          investigating: Number(investigatingCount || 0),
          highRiskActive: Number(highRiskCount || 0),
          integrityHolds: Number(holdCount || 0),
          avgOpenAgeHours,
          slaBreaches,
          slaHours,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (apiError) {
    console.error('[Platform Integrity Overview GET] Unexpected error:', apiError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
