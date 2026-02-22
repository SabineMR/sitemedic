/**
 * POST /api/cron/integrity-sla-report
 * Phase 52 Extension: Integrity SLA Reporting Alerts
 *
 * Computes integrity queue SLA breaches and notifies platform admins when
 * open/investigating cases exceed configured SLA.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBulkNotifications } from '@/lib/marketplace/create-notification';
import { completeJobRun, failJobRun, startJobRun } from '@/lib/ops/job-runs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  let jobRun: { id: string; startedAt: string } | null = null;
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();
    jobRun = await startJobRun({
      supabase,
      jobName: 'integrity-sla-report',
      triggerType: 'cron',
    });

    const [{ data: cfg }, { data: openCases }, { data: platformAdmins }] = await Promise.all([
      supabase
        .from('marketplace_integrity_config')
        .select('review_sla_hours')
        .eq('singleton_key', 'marketplace_integrity')
        .maybeSingle(),
      supabase
        .from('marketplace_integrity_cases')
        .select('id, event_id, status, opened_at, event:marketplace_events!marketplace_integrity_cases_event_id_fkey(event_name)')
        .in('status', ['open', 'investigating'])
        .order('opened_at', { ascending: true })
        .limit(500),
      supabase
        .from('profiles')
        .select('id')
        .eq('role', 'platform_admin')
        .eq('is_active', true),
    ]);

    const slaHours = Number(cfg?.review_sla_hours || 48);
    const now = Date.now();

    const breachedCases = (openCases || []).filter((row) => {
      const ageHours = (now - new Date(row.opened_at).getTime()) / (1000 * 60 * 60);
      return ageHours > slaHours;
    });

    if (breachedCases.length === 0 || !platformAdmins || platformAdmins.length === 0) {
      await completeJobRun({
        supabase,
        runId: jobRun.id,
        startedAt: jobRun.startedAt,
        metadata: { breachedCases: 0, sent: 0 },
      });
      return NextResponse.json({
        success: true,
        sent: 0,
        breachedCases: 0,
        message: 'No SLA breach alerts needed',
      });
    }

    const oldest = breachedCases[0];
    const oldestAgeHours = Math.round(
      (now - new Date(oldest.opened_at).getTime()) / (1000 * 60 * 60)
    );

    await createBulkNotifications(
      platformAdmins.map((admin) => ({
        userId: admin.id,
        type: 'integrity_alert',
        title: 'Integrity SLA breaches detected',
        body: `${breachedCases.length} integrity cases exceeded ${slaHours}h SLA. Oldest is ${oldestAgeHours}h old.`,
        link: '/platform/marketplace/entities?entity=integrity&status=open',
        metadata: {
          breachedCaseCount: breachedCases.length,
          slaHours,
          oldestCaseId: oldest.id,
          oldestEventId: oldest.event_id,
        },
      }))
    );

    await completeJobRun({
      supabase,
      runId: jobRun.id,
      startedAt: jobRun.startedAt,
      metadata: {
        breachedCases: breachedCases.length,
        sent: platformAdmins.length,
        slaHours,
      },
    });

    return NextResponse.json({
      success: true,
      sent: platformAdmins.length,
      breachedCases: breachedCases.length,
      slaHours,
    });
  } catch (error) {
    if (jobRun) {
      try {
        const supabase = await createClient();
        await failJobRun({
          supabase,
          runId: jobRun.id,
          startedAt: jobRun.startedAt,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (jobError) {
        console.error('[Integrity SLA Report Cron] Failed to record failed job run:', jobError);
      }
    }
    console.error('[Integrity SLA Report Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
