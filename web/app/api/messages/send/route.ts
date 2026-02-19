/**
 * POST /api/messages/send
 * Phase 41-02: Send a text message in a conversation
 *
 * Inserts a new message, updates conversation metadata (last_message_at,
 * last_message_preview), and upserts the sender's own read status so they
 * don't see their own message as unread.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
    let body: { conversationId?: string; content?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 4. Validate
    const { conversationId, content } = body;

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const trimmed = content.trim();
    if (trimmed.length > 5000) {
      return NextResponse.json(
        { error: 'content must not exceed 5000 characters' },
        { status: 400 }
      );
    }

    // 5. Verify conversation exists and belongs to user's org
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, org_id')
      .eq('id', conversationId)
      .eq('org_id', orgId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 6. Insert message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        org_id: orgId,
        sender_id: user.id,
        message_type: 'text',
        content: trimmed,
        status: 'sent',
      })
      .select()
      .single();

    if (msgError || !message) {
      console.error('Error inserting message:', msgError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // 7. Update conversation metadata (last_message_at, last_message_preview)
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at,
        last_message_preview: trimmed.substring(0, 100),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation metadata:', updateError);
      // Non-fatal: message was already sent successfully
    }

    // 8. Upsert sender's own read status so they don't see their own message as unread
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
      // Non-fatal: message was already sent successfully
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
