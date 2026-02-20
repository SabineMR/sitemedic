/**
 * PATCH /api/marketplace/messages/conversations/[id]/read -- Mark conversation as read
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 02
 *
 * Upserts the marketplace_conversation_read_status for the current user,
 * setting last_read_at to NOW().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// PATCH -- Mark conversation as read
// =============================================================================

export async function PATCH(
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

    // Verify conversation exists and user is a participant
    const { data: conversation, error: convoError } = await supabase
      .from('marketplace_conversations')
      .select('id, client_user_id, company_user_id')
      .eq('id', id)
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

    // Upsert read status
    const { error: upsertError } = await supabase
      .from('marketplace_conversation_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id: id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    if (upsertError) {
      console.error('[Marketplace Read] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketplace Read] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
