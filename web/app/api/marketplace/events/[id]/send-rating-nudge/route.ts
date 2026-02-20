/**
 * POST /api/marketplace/events/[id]/send-rating-nudge
 * Phase 36 Extension: Feature 7 — Rating Prompt/Nudge Emails
 *
 * Triggers a rating nudge email for a completed marketplace event.
 * Callable by admin or cron. Sends to both client and company
 * if they haven't already rated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRatingNudgeNotification } from '@/lib/marketplace/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, title, posted_by, status, rating_nudge_sent_at')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'completed') {
      return NextResponse.json({ error: 'Event is not completed' }, { status: 400 });
    }

    if (event.rating_nudge_sent_at) {
      return NextResponse.json({ error: 'Rating nudge already sent' }, { status: 409 });
    }

    // Get client details
    const { data: clientProfile } = await supabase
      .from('medics')
      .select('first_name, last_name, email')
      .eq('user_id', event.posted_by)
      .single();

    // Get awarded company details
    const { data: awardedQuote } = await supabase
      .from('marketplace_quotes')
      .select('company_id, marketplace_companies!inner(company_name, company_email, admin_user_id)')
      .eq('event_id', eventId)
      .eq('status', 'awarded')
      .single();

    if (!awardedQuote) {
      return NextResponse.json({ error: 'No awarded company for this event' }, { status: 400 });
    }

    const company = awardedQuote.marketplace_companies as unknown as {
      company_name: string;
      company_email: string;
      admin_user_id: string;
    };

    // Check existing ratings to only nudge parties who haven't rated
    const { data: existingRatings } = await supabase
      .from('job_ratings')
      .select('rater_user_id')
      .eq('job_id', eventId);

    const ratedUserIds = new Set((existingRatings || []).map((r: any) => r.rater_user_id));

    const results: { client?: any; company?: any } = {};

    // Send nudge to client if they haven't rated
    if (clientProfile && !ratedUserIds.has(event.posted_by)) {
      const clientName = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
      results.client = await sendRatingNudgeNotification({
        recipientEmail: clientProfile.email,
        recipientName: clientName || 'there',
        eventName: event.title,
        eventId: event.id,
        recipientRole: 'client',
      });
    }

    // Send nudge to company admin if they haven't rated
    if (!ratedUserIds.has(company.admin_user_id)) {
      results.company = await sendRatingNudgeNotification({
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
      .eq('id', eventId);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Rating Nudge] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
