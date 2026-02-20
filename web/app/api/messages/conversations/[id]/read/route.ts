/**
 * PATCH /api/messages/conversations/{id}/read
 * Phase 41-02: Mark a conversation as read
 *
 * Upserts conversation_read_status with the current timestamp for the
 * authenticated user. This resets the unread count for the conversation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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

    // 3. Verify conversation exists and belongs to user's org
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('org_id', orgId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 4. Upsert conversation_read_status
    const { error: upsertError } = await supabase
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

    if (upsertError) {
      console.error('Error upserting read status:', upsertError);
      return NextResponse.json(
        { error: 'Failed to mark as read' },
        { status: 500 }
      );
    }

    // 5. Advance message status to 'read' for all other-sender messages
    const { error: statusError } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .eq('org_id', orgId)
      .neq('sender_id', user.id)
      .in('status', ['sent', 'delivered']);

    if (statusError) {
      console.error('Error advancing message status to read:', statusError);
      // Non-fatal: conversation read status was already updated
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark-as-read error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
