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
      { data: confirmedCases },
      { count: deadLetterCount },
      { count: failedDeliveryCount },
      { data: recentJobRuns },
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
        .select('review_sla_hours, repeat_offender_case_window_days, repeat_offender_confirmed_case_threshold')
        .eq('singleton_key', 'marketplace_integrity')
        .maybeSingle(),
      serviceClient
        .from('marketplace_integrity_cases')
        .select('company_id, closed_at')
        .eq('status', 'resolved_confirmed')
        .not('company_id', 'is', null)
        .limit(2000),
      serviceClient
        .from('marketplace_alert_delivery_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dead_letter'),
      serviceClient
        .from('marketplace_alert_delivery_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      serviceClient
        .from('marketplace_job_runs')
        .select('job_name, status, started_at, finished_at, error_message')
        .order('started_at', { ascending: false })
        .limit(30),
    ]);

    const slaHours = Number(cfg?.review_sla_hours || 48);
    const repeatWindowDays = Number(cfg?.repeat_offender_case_window_days || 180);
    const repeatThreshold = Number(cfg?.repeat_offender_confirmed_case_threshold || 2);
    const now = Date.now();

    const openAgesHours = (openCases || []).map((row) =>
      (now - new Date(row.opened_at).getTime()) / (1000 * 60 * 60)
    );

    const avgOpenAgeHours =
      openAgesHours.length > 0
        ? Number((openAgesHours.reduce((sum, value) => sum + value, 0) / openAgesHours.length).toFixed(1))
        : 0;

    const slaBreaches = openAgesHours.filter((age) => age > slaHours).length;

    const repeatCutoff = new Date(now - repeatWindowDays * 24 * 60 * 60 * 1000).toISOString();
    const repeatCounts = new Map<string, number>();
    for (const row of confirmedCases || []) {
      if (!row.company_id || !row.closed_at || row.closed_at < repeatCutoff) continue;
      repeatCounts.set(row.company_id, (repeatCounts.get(row.company_id) || 0) + 1);
    }
    const repeatOffenderWatchlist = Array.from(repeatCounts.values()).filter(
      (count) => count >= repeatThreshold
    ).length;

    const latestJobState = new Map<string, {
      status: string;
      startedAt: string;
      finishedAt: string | null;
      errorMessage: string | null;
    }>();

    for (const run of recentJobRuns || []) {
      if (latestJobState.has(run.job_name)) continue;
      latestJobState.set(run.job_name, {
        status: run.status,
        startedAt: run.started_at,
        finishedAt: run.finished_at,
        errorMessage: run.error_message,
      });
    }

    const trackedJobs = ['integrity-sla-report', 'rating-nudges', 'trust-score-refresh'];
    const cronHealth = trackedJobs.map((jobName) => {
      const latest = latestJobState.get(jobName);
      return {
        jobName,
        status: latest?.status || 'unknown',
        startedAt: latest?.startedAt || null,
        finishedAt: latest?.finishedAt || null,
        errorMessage: latest?.errorMessage || null,
      };
    });

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
          repeatOffenderWatchlist,
          repeatWindowDays,
          repeatThreshold,
          alertDeadLetters: Number(deadLetterCount || 0),
          alertFailuresPendingRetry: Number(failedDeliveryCount || 0),
        },
        cronHealth,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (apiError) {
    console.error('[Platform Integrity Overview GET] Unexpected error:', apiError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
