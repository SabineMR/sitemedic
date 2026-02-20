/**
 * GET /api/marketplace/messages/conversations/[id] -- Fetch conversation details + all messages
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 02
 *
 * Fetches a single conversation with all messages, event name, and company name.
 * Auto-marks the conversation as read for the requesting user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// GET -- Fetch conversation details + all messages
// =============================================================================

export async function GET(
  _request: NextRequest,
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

    // Fetch conversation by id
    const { data: conversation, error: convoError } = await supabase
      .from('marketplace_conversations')
      .select(`
        id,
        event_id,
        company_id,
        client_user_id,
        company_user_id,
        last_message_at,
        last_message_preview,
        last_message_sender_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (convoError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user is a participant
    if (user.id !== conversation.client_user_id && user.id !== conversation.company_user_id) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Fetch all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('marketplace_messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[Marketplace Conversation GET] Messages fetch error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Fetch event name
    const { data: event } = await supabase
      .from('marketplace_events')
      .select('event_name')
      .eq('id', conversation.event_id)
      .single();

    // Fetch company name
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name')
      .eq('id', conversation.company_id)
      .single();

    // Auto mark-as-read: upsert read status for the current user
    const { error: readError } = await supabase
      .from('marketplace_conversation_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id: id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    if (readError) {
      console.error('[Marketplace Conversation GET] Read status upsert error:', readError);
      // Non-fatal: conversation and messages are still returned
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        event_name: event?.event_name || 'Unknown Event',
        company_name: company?.company_name || 'Unknown Company',
      },
      messages: messages || [],
    });
  } catch (error) {
    console.error('[Marketplace Conversation GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
