/**
 * POST /api/cron/rating-nudges
 * Phase 36 Extension: Feature 7 — Rating Nudge Cron
 *
 * Scans for completed marketplace events that:
 *   - Were completed 48+ hours ago
 *   - Haven't had a rating nudge sent yet
 *   - Still have at least one party who hasn't rated
 *
 * Triggers the rating nudge endpoint for each qualifying event.
 * Intended to be called by a cron scheduler (e.g. Vercel Cron).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRatingNudgeNotification } from '@/lib/marketplace/notifications';
import { createNotification } from '@/lib/marketplace/create-notification';
import { completeJobRun, failJobRun, startJobRun } from '@/lib/ops/job-runs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cron secret for auth (set in environment variables)
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
      jobName: 'rating-nudges',
      triggerType: 'cron',
    });

    // Find completed events that haven't had nudges sent
    const { data: events, error: eventsError } = await supabase
      .from('marketplace_events')
      .select('id, event_name, posted_by')
      .eq('status', 'completed')
      .is('rating_nudge_sent_at', null)
      .limit(50); // Process in batches

    if (eventsError) {
      console.error('[Rating Nudge Cron] Query error:', eventsError);
      return NextResponse.json({ error: 'Failed to query events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      await completeJobRun({
        supabase,
        runId: jobRun.id,
        startedAt: jobRun.startedAt,
        metadata: { processed: 0, errors: 0, total: 0 },
      });
      return NextResponse.json({ processed: 0, message: 'No events need nudges' });
    }

    let processed = 0;
    let errors = 0;

    const cutoffMs = 48 * 60 * 60 * 1000; // 48 hours in ms

    for (const event of events) {
      try {
        // Check last event day — only nudge if 48+ hours after last event day
        const { data: lastDay } = await supabase
          .from('event_days')
          .select('date')
          .eq('event_id', event.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastDay) {
          const lastDayEnd = new Date(lastDay.date);
          lastDayEnd.setHours(23, 59, 59, 999); // End of last event day
          if (Date.now() - lastDayEnd.getTime() < cutoffMs) {
            continue; // Too soon — skip this event
          }
        }

        // Get awarded company
        const { data: awardedQuote } = await supabase
          .from('marketplace_quotes')
          .select('company_id, marketplace_companies!inner(company_name, company_email, admin_user_id)')
          .eq('event_id', event.id)
          .eq('status', 'awarded')
          .single();

        if (!awardedQuote) continue;

        const company = awardedQuote.marketplace_companies as unknown as {
          company_name: string;
          company_email: string;
          admin_user_id: string;
        };

        // Check existing ratings
        const { data: existingRatings } = await supabase
          .from('job_ratings')
          .select('rater_user_id')
          .eq('job_id', event.id);

        const ratedUserIds = new Set((existingRatings || []).map((r: any) => r.rater_user_id));

        // If both have rated, no need to nudge
        if (ratedUserIds.has(event.posted_by) && ratedUserIds.has(company.admin_user_id)) {
          // Mark as sent to avoid re-checking
          await supabase
            .from('marketplace_events')
            .update({ rating_nudge_sent_at: new Date().toISOString() })
            .eq('id', event.id);
          continue;
        }

        // Get client details
        const { data: clientProfile } = await supabase
          .from('medics')
          .select('first_name, last_name, email')
          .eq('user_id', event.posted_by)
          .single();

        // Send nudge to unrated parties
        if (clientProfile && !ratedUserIds.has(event.posted_by)) {
          const clientName = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
          await sendRatingNudgeNotification({
            recipientEmail: clientProfile.email,
            recipientName: clientName || 'there',
            eventName: event.event_name,
            eventId: event.id,
            recipientRole: 'client',
          });
          // Dashboard notification alongside email
          try {
            await createNotification({
              userId: event.posted_by,
              type: 'rating_nudge',
              title: 'Don\'t forget to leave a rating',
              body: `How was your experience with "${event.event_name}"? Your feedback matters.`,
              link: `/marketplace/events/${event.id}`,
              metadata: { event_id: event.id, recipient_role: 'client' },
            });
          } catch (notifErr) {
            console.error(`[Rating Nudge Cron] Dashboard notification failed for client ${event.posted_by}:`, notifErr);
          }
        }

        if (!ratedUserIds.has(company.admin_user_id)) {
          await sendRatingNudgeNotification({
            recipientEmail: company.company_email,
            recipientName: company.company_name,
            eventName: event.event_name,
            eventId: event.id,
            recipientRole: 'company',
          });
          // Dashboard notification alongside email
          try {
            await createNotification({
              userId: company.admin_user_id,
              type: 'rating_nudge',
              title: 'Don\'t forget to leave a rating',
              body: `How was your experience with "${event.event_name}"? Your feedback helps build trust.`,
              link: `/marketplace/events/${event.id}`,
              metadata: { event_id: event.id, recipient_role: 'company' },
            });
          } catch (notifErr) {
            console.error(`[Rating Nudge Cron] Dashboard notification failed for company ${company.admin_user_id}:`, notifErr);
          }
        }

        // Mark nudge as sent
        await supabase
          .from('marketplace_events')
          .update({ rating_nudge_sent_at: new Date().toISOString() })
          .eq('id', event.id);

        processed++;
      } catch (err) {
        console.error(`[Rating Nudge Cron] Error processing event ${event.id}:`, err);
        errors++;
      }
    }

    const responsePayload = {
      processed,
      errors,
      total: events.length,
      message: `Processed ${processed} events, ${errors} errors`,
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
        console.error('[Rating Nudge Cron] Failed to record failed job run:', jobError);
      }
    }
    console.error('[Rating Nudge Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
