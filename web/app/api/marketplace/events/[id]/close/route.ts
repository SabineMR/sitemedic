/**
 * POST /api/marketplace/events/[id]/close — Close or cancel a marketplace event
 *
 * Phase 33: Event Posting & Discovery — Plan 01
 *
 * Actions:
 *   - 'close': Event poster closes the event to new quotes
 *   - 'cancel': Event poster cancels the event entirely
 *
 * Requires: poster owns the event, event is in 'open' or 'draft' status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CloseBody {
  action: 'close' | 'cancel';
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: CloseBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.action || !['close', 'cancel'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "close" or "cancel"' },
        { status: 400 }
      );
    }

    // Fetch existing event
    const { data: event, error: fetchError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify ownership
    if (event.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    // Verify status allows close/cancel
    if (!['open', 'draft'].includes(event.status)) {
      return NextResponse.json(
        { error: `Cannot ${body.action} an event with status "${event.status}"` },
        { status: 400 }
      );
    }

    // Update status
    const newStatus = body.action === 'close' ? 'closed' : 'cancelled';
    const { data: updated, error: updateError } = await supabase
      .from('marketplace_events')
      .update({ status: newStatus })
      .eq('id', id)
      .select('id, status, event_name')
      .single();

    if (updateError) {
      console.error('[Event Close] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update event status' }, { status: 500 });
    }

    // TODO: Phase 38 — notify medics who quoted on this event
    // When notifications are built, send a notification to all medics
    // who have an active quote on this event, informing them the event
    // has been closed/cancelled.

    return NextResponse.json({
      success: true,
      event: updated,
    });
  } catch (error) {
    console.error('[Event Close] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
