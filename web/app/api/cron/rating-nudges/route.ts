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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cron secret for auth (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();

    // Find completed events from 48+ hours ago that haven't had nudges sent
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsError } = await supabase
      .from('marketplace_events')
      .select('id, title, posted_by, updated_at')
      .eq('status', 'completed')
      .is('rating_nudge_sent_at', null)
      .lte('updated_at', cutoffDate)
      .limit(50); // Process in batches

    if (eventsError) {
      console.error('[Rating Nudge Cron] Query error:', eventsError);
      return NextResponse.json({ error: 'Failed to query events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No events need nudges' });
    }

    let processed = 0;
    let errors = 0;

    for (const event of events) {
      try {
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
            eventName: event.title,
            eventId: event.id,
            recipientRole: 'client',
          });
        }

        if (!ratedUserIds.has(company.admin_user_id)) {
          await sendRatingNudgeNotification({
            recipientEmail: company.company_email,
            recipientName: company.company_name,
            eventName: event.title,
            eventId: event.id,
            recipientRole: 'company',
          });
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

    return NextResponse.json({
      processed,
      errors,
      total: events.length,
      message: `Processed ${processed} events, ${errors} errors`,
    });
  } catch (error) {
    console.error('[Rating Nudge Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
