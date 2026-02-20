/**
 * GET /api/messages/broadcast/{messageId}/recipients
 * Phase 44: Broadcast Messaging
 *
 * Returns broadcast read tracking summary and per-medic detail
 * for a specific broadcast message. Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
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

    // 2. Get org_id and verify admin role
    const orgId = await requireOrgId();
    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only org admins can view broadcast read status' },
        { status: 403 }
      );
    }

    // 3. Verify message exists and belongs to user's org
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, org_id')
      .eq('id', messageId)
      .eq('org_id', orgId)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // 4. Fetch all message_recipients for this message
    const { data: recipients, error: recipError } = await supabase
      .from('message_recipients')
      .select('recipient_id, read_at, delivered_at')
      .eq('message_id', messageId)
      .eq('org_id', orgId);

    if (recipError) {
      console.error('Error fetching recipients:', recipError);
      return NextResponse.json(
        { error: 'Failed to fetch recipients' },
        { status: 500 }
      );
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({
        messageId,
        totalRecipients: 0,
        readCount: 0,
        recipients: [],
      });
    }

    // 5. Fetch medic names for all recipient_ids
    const recipientIds = recipients.map((r) => r.recipient_id);
    const { data: medics } = await supabase
      .from('medics')
      .select('user_id, first_name, last_name')
      .in('user_id', recipientIds);

    // 6. Build response with summary and details
    const totalRecipients = recipients.length;
    const readCount = recipients.filter((r) => r.read_at !== null).length;

    const details = recipients.map((r) => {
      const medic = medics?.find((m) => m.user_id === r.recipient_id);
      return {
        recipient_id: r.recipient_id,
        name: medic ? `${medic.first_name} ${medic.last_name}` : 'Unknown',
        read_at: r.read_at,
        status: r.read_at ? ('read' as const) : ('unread' as const),
      };
    });

    // Sort: read first (by most recent read_at), then unread alphabetically
    details.sort((a, b) => {
      if (a.status === 'read' && b.status === 'unread') return -1;
      if (a.status === 'unread' && b.status === 'read') return 1;
      if (a.status === 'read' && b.status === 'read') {
        return (
          new Date(b.read_at!).getTime() - new Date(a.read_at!).getTime()
        );
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      messageId,
      totalRecipients,
      readCount,
      recipients: details,
    });
  } catch (err) {
    console.error('Broadcast recipients error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
