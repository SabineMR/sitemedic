/**
 * POST /api/messages/broadcast
 * Phase 44: Broadcast Messaging
 *
 * Sends a broadcast message to all medics in the organisation.
 *
 * Flow:
 * 1. Auth check + org_admin role enforcement
 * 2. Get-or-create the single broadcast conversation for this org
 * 3. Insert message
 * 4. Bulk-insert message_recipients for all org medics
 * 5. Update conversation metadata
 * 6. Upsert sender's read status
 *
 * The existing on_message_insert_notify DB trigger (migration 150)
 * fires automatically and calls the send-message-notification Edge
 * Function, which already handles broadcast type for multi-recipient
 * push delivery.
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

    // 3. Verify role is org_admin
    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only org admins can send broadcasts' },
        { status: 403 }
      );
    }

    // 4. Parse body
    let body: { content?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 5. Validate content
    const { content } = body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: 'content must not exceed 5000 characters' },
        { status: 400 }
      );
    }

    // 6. Get-or-create broadcast conversation (single per org)
    let conversationId: string;

    const { data: existing, error: selectError } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', orgId)
      .eq('type', 'broadcast')
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing broadcast conversation:', selectError);
      return NextResponse.json(
        { error: 'Failed to check broadcast conversation' },
        { status: 500 }
      );
    }

    if (existing) {
      conversationId = existing.id;
    } else {
      // Insert new broadcast conversation
      const { data: newConv, error: insertError } = await supabase
        .from('conversations')
        .insert({
          org_id: orgId,
          type: 'broadcast',
          created_by: user.id,
          medic_id: null,
        })
        .select('id')
        .single();

      if (insertError) {
        // Handle race condition: unique constraint violation (23505)
        if (insertError.code === '23505') {
          const { data: raceExisting, error: raceError } = await supabase
            .from('conversations')
            .select('id')
            .eq('org_id', orgId)
            .eq('type', 'broadcast')
            .maybeSingle();

          if (raceError || !raceExisting) {
            console.error('Error recovering from race condition:', raceError);
            return NextResponse.json(
              { error: 'Failed to create broadcast conversation' },
              { status: 500 }
            );
          }

          conversationId = raceExisting.id;
        } else {
          console.error('Error creating broadcast conversation:', insertError);
          return NextResponse.json(
            { error: 'Failed to create broadcast conversation' },
            { status: 500 }
          );
        }
      } else {
        conversationId = newConv.id;
      }
    }

    // 7. Insert message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        org_id: orgId,
        sender_id: user.id,
        message_type: 'text',
        content: trimmedContent,
        status: 'sent',
      })
      .select()
      .single();

    if (msgError || !message) {
      console.error('Error inserting broadcast message:', msgError);
      return NextResponse.json(
        { error: 'Failed to send broadcast message' },
        { status: 500 }
      );
    }

    // 8. Fetch all medics in org (no filtering by available_for_work)
    const { data: medics, error: medicsError } = await supabase
      .from('medics')
      .select('user_id')
      .eq('org_id', orgId);

    if (medicsError) {
      console.error('Error fetching medics:', medicsError);
      // Message was sent, but recipient tracking will be incomplete
    }

    // 9. Bulk insert message_recipients for all medics
    const recipientCount = medics?.length ?? 0;
    if (medics && medics.length > 0) {
      const recipientRows = medics.map((medic) => ({
        message_id: message.id,
        recipient_id: medic.user_id,
        org_id: orgId,
      }));

      const { error: recipError } = await supabase
        .from('message_recipients')
        .insert(recipientRows);

      if (recipError) {
        console.error('Error inserting message recipients:', recipError);
        // Non-fatal: message was sent, read tracking may be affected
      }
    }

    // 10. Update conversation metadata
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at,
        last_message_preview: trimmedContent.substring(0, 100),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation metadata:', updateError);
      // Non-fatal: message was already sent
    }

    // 11. Upsert sender's own read status so admin doesn't see unread badge
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
      // Non-fatal
    }

    return NextResponse.json(
      {
        conversationId,
        messageId: message.id,
        recipientCount,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Broadcast send error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
