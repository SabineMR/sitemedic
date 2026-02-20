/**
 * PATCH /api/messages/{messageId}/status
 * Phase 47-01: Advance message delivery status
 *
 * Forward-only state machine: sent -> delivered -> read
 * The caller must NOT be the message sender (the other party advances status).
 * Supports batch mode: ?conversationId=xxx marks all messages from the other
 * sender in that conversation as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

const STATUS_ORDER: Record<string, number> = {
  sent: 0,
  delivered: 1,
  read: 2,
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
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
    let body: { status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const newStatus = body.status;
    if (!newStatus || !['delivered', 'read'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'status must be "delivered" or "read"' },
        { status: 400 }
      );
    }

    // 4. Check for batch mode (conversationId query param)
    const conversationId = request.nextUrl.searchParams.get('conversationId');

    if (conversationId && newStatus === 'read') {
      // Batch: mark all messages from other senders in conversation as read
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .eq('org_id', orgId)
        .neq('sender_id', user.id)
        .in('status', ['sent', 'delivered']);

      return NextResponse.json({ success: true });
    }

    // 5. Single message mode — fetch current message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_id, status, org_id')
      .eq('id', messageId)
      .eq('org_id', orgId)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // 6. Prevent self-marking (sender cannot mark their own messages)
    if (message.sender_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot update status of your own message' },
        { status: 403 }
      );
    }

    // 7. Forward-only enforcement
    const currentRank = STATUS_ORDER[message.status] ?? 0;
    const newRank = STATUS_ORDER[newStatus] ?? 0;

    if (newRank <= currentRank) {
      // Already at or past the requested status — idempotent success
      return NextResponse.json({ success: true });
    }

    // 8. Update status with optimistic concurrency check
    await supabase
      .from('messages')
      .update({ status: newStatus })
      .eq('id', messageId)
      .eq('status', message.status);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Message status update error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
