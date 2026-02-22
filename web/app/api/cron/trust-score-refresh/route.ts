/**
 * POST /api/cron/trust-score-refresh
 * Phase 36 Extension: Feature 9 — Periodic Trust Score Recalculation
 *
 * Recalculates trust scores for all marketplace companies.
 * Catches signals not tied to rating changes (tenure, cancellations,
 * quote response rate) that the trigger wouldn't capture.
 *
 * Intended to be called by a cron scheduler (e.g. daily via Vercel Cron).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateTrustScore } from '@/lib/marketplace/trust-score';
import { completeJobRun, failJobRun, startJobRun } from '@/lib/ops/job-runs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  let jobRun: { id: string; startedAt: string } | null = null;
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();
    jobRun = await startJobRun({
      supabase,
      jobName: 'trust-score-refresh',
      triggerType: 'cron',
    });

    // Fetch all marketplace companies
    const { data: companies, error: companiesError } = await supabase
      .from('marketplace_companies')
      .select('id, average_rating, review_count, insurance_status, verification_status, created_at');

    if (companiesError) {
      console.error('[Trust Score Refresh] Query error:', companiesError);
      return NextResponse.json({ error: 'Failed to query companies' }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      await completeJobRun({
        supabase,
        runId: jobRun.id,
        startedAt: jobRun.startedAt,
        metadata: { processed: 0, errors: 0, total: 0 },
      });
      return NextResponse.json({ processed: 0, message: 'No companies found' });
    }

    // Get total marketplace events (for response rate denominator)
    const { count: totalEventsAvailable } = await supabase
      .from('marketplace_events')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'quoting', 'awarded', 'completed', 'cancelled']);

    let processed = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        // Count completed and cancelled events for this company
        const { data: awardedQuoteEventIds } = await supabase
          .from('marketplace_quotes')
          .select('event_id')
          .eq('company_id', company.id)
          .eq('status', 'awarded');

        const eventIds = (awardedQuoteEventIds || []).map((q: any) => q.event_id);

        let completedEvents = 0;
        let cancelledEvents = 0;

        if (eventIds.length > 0) {
          const { count: completed } = await supabase
            .from('marketplace_events')
            .select('id', { count: 'exact', head: true })
            .in('id', eventIds)
            .eq('status', 'completed');

          const { count: cancelled } = await supabase
            .from('marketplace_events')
            .select('id', { count: 'exact', head: true })
            .in('id', eventIds)
            .eq('status', 'cancelled');

          completedEvents = completed || 0;
          cancelledEvents = cancelled || 0;
        }

        // Count total quotes submitted
        const { count: totalQuotes } = await supabase
          .from('marketplace_quotes')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id);

        // Calculate trust score
        const trustScore = calculateTrustScore({
          averageRating: company.average_rating || 0,
          reviewCount: company.review_count || 0,
          insuranceStatus: company.insurance_status || 'unverified',
          verificationStatus: company.verification_status || 'pending',
          completedEvents,
          cancelledEvents,
          createdAt: company.created_at,
          totalQuotes: totalQuotes || 0,
          totalEventsAvailable: totalEventsAvailable || 0,
        });

        // Update trust score
        await supabase
          .from('marketplace_companies')
          .update({ trust_score: trustScore })
          .eq('id', company.id);

        processed++;
      } catch (err) {
        console.error(`[Trust Score Refresh] Error for company ${company.id}:`, err);
        errors++;
      }
    }

    const responsePayload = {
      processed,
      errors,
      total: companies.length,
      message: `Refreshed ${processed} companies, ${errors} errors`,
    };

    await completeJobRun({
      supabase,
      runId: jobRun.id,
      startedAt: jobRun.startedAt,
      metadata: responsePayload,
    });

    return NextResponse.json(responsePayload);
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
        console.error('[Trust Score Refresh] Failed to record failed job run:', jobError);
      }
    }
    console.error('[Trust Score Refresh] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
