/**
 * PATCH /api/messages/broadcast/read
 * Phase 44: Broadcast Messaging
 *
 * Marks all unread broadcast messages as read for the current medic.
 * Updates both message_recipients (read_at) and conversation_read_status
 * (for unread badge calculation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get org_id
    const orgId = await requireOrgId();

    // 3. Parse body
    let body: { conversationId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { conversationId } = body;
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // 4. Verify conversation exists, belongs to org, and is broadcast type
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, type')
      .eq('id', conversationId)
      .eq('org_id', orgId)
      .single();

    if (convError || !conversation || conversation.type !== 'broadcast') {
      return NextResponse.json(
        { error: 'Broadcast conversation not found' },
        { status: 404 }
      );
    }

    // 5. Update all unread message_recipients rows for this user
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null);

    if (messages && messages.length > 0) {
      const messageIds = messages.map((m) => m.id);
      const { error: recipError } = await supabase
        .from('message_recipients')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('org_id', orgId)
        .in('message_id', messageIds)
        .is('read_at', null);

      if (recipError) {
        console.error('Error updating message_recipients:', recipError);
        // Non-fatal: still try conversation_read_status below
      }
    }

    // 6. Upsert conversation_read_status for unread badge calculation
    const { error: readError } = await supabase
      .from('conversation_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          org_id: orgId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    if (readError) {
      console.error('Error upserting read status:', readError);
      // Non-fatal: message_recipients were already updated
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Broadcast mark-as-read error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
