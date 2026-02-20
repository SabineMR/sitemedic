/**
 * POST /api/marketplace/messages/send -- Send a message in a marketplace conversation
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 02
 *
 * Validates that the sender is a participant in the conversation,
 * inserts the message, updates conversation metadata, and
 * upserts the sender's read status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const sendMessageSchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message must be under 5000 characters'),
});

// =============================================================================
// POST -- Send a message
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { conversation_id, content } = parsed.data;

    // Verify conversation exists and user is a participant
    const { data: conversation, error: convoError } = await supabase
      .from('marketplace_conversations')
      .select('id, client_user_id, company_user_id')
      .eq('id', conversation_id)
      .single();

    if (convoError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (user.id !== conversation.client_user_id && user.id !== conversation.company_user_id) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from('marketplace_messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Marketplace Send] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update conversation metadata
    const preview = content.length > 100 ? content.substring(0, 100) : content;
    const { error: updateError } = await supabase
      .from('marketplace_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        last_message_sender_id: user.id,
      })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('[Marketplace Send] Conversation update error:', updateError);
      // Non-fatal: message was sent, metadata update failed
    }

    // Upsert sender's read status to now
    const { error: readError } = await supabase
      .from('marketplace_conversation_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    if (readError) {
      console.error('[Marketplace Send] Read status upsert error:', readError);
      // Non-fatal: message was sent
    }

    // Fire-and-forget: notification
    try {
      const { sendMarketplaceMessageNotification } = await import('@/lib/marketplace/notifications');
      if (typeof sendMarketplaceMessageNotification === 'function') {
        sendMarketplaceMessageNotification({
          conversationId: conversation_id,
          senderId: user.id,
          content,
        }).catch((err: unknown) => {
          console.warn('[Marketplace Send] Notification failed (non-fatal):', err);
        });
      }
    } catch {
      // Notification module doesn't exist yet -- silently ignore
      console.log('[Marketplace Send] Notification module not available yet');
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('[Marketplace Send] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
