/**
 * GET  /api/marketplace/messages/conversations -- List all marketplace conversations
 * POST /api/marketplace/messages/conversations -- Create or get existing conversation
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 02
 *
 * Marketplace conversations are user_id-scoped (cross-org by design).
 * One conversation per (event_id, company_id) pair.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const createConversationSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  company_id: z.string().uuid('Invalid company ID'),
});

// =============================================================================
// GET -- List all marketplace conversations for the authenticated user
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch conversations where user is a participant
    const { data: conversations, error: convoError } = await supabase
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
        updated_at,
        marketplace_events!inner(event_name),
        marketplace_companies!inner(company_name)
      `)
      .or(`client_user_id.eq.${user.id},company_user_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (convoError) {
      console.error('[Marketplace Conversations GET] Fetch error:', convoError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    const conversationList = conversations || [];

    // Fetch read statuses for this user
    const conversationIds = conversationList.map((c) => c.id);
    let readStatusMap: Record<string, string> = {};

    if (conversationIds.length > 0) {
      const { data: readStatuses } = await supabase
        .from('marketplace_conversation_read_status')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds);

      if (readStatuses) {
        for (const rs of readStatuses) {
          readStatusMap[rs.conversation_id] = rs.last_read_at;
        }
      }
    }

    // Compute unread counts: messages created after last_read_at AND not sent by current user
    const enrichedConversations = await Promise.all(
      conversationList.map(async (convo) => {
        const lastReadAt = readStatusMap[convo.id] || '1970-01-01T00:00:00Z';

        const { count, error: countError } = await supabase
          .from('marketplace_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .neq('sender_id', user.id)
          .gt('created_at', lastReadAt);

        if (countError) {
          console.error('[Marketplace Conversations GET] Unread count error:', countError);
        }

        // Determine other party name
        const isClient = convo.client_user_id === user.id;
        const event = convo.marketplace_events as unknown as { event_name: string };
        const company = convo.marketplace_companies as unknown as { company_name: string };

        return {
          id: convo.id,
          event_id: convo.event_id,
          company_id: convo.company_id,
          client_user_id: convo.client_user_id,
          company_user_id: convo.company_user_id,
          last_message_at: convo.last_message_at,
          last_message_preview: convo.last_message_preview,
          last_message_sender_id: convo.last_message_sender_id,
          created_at: convo.created_at,
          updated_at: convo.updated_at,
          event_name: event?.event_name || 'Unknown Event',
          company_name: company?.company_name || 'Unknown Company',
          other_party_name: isClient
            ? (company?.company_name || 'Unknown Company')
            : 'Client',
          unread_count: count || 0,
        };
      })
    );

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (error) {
    console.error('[Marketplace Conversations GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST -- Create or get existing conversation
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

    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { event_id, company_id } = parsed.data;

    // Fetch event to determine client_user_id
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status, event_name')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch company to determine company_user_id
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id, company_name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const clientUserId = event.posted_by;
    const companyUserId = company.admin_user_id;

    // Auth check: User must be the event poster (client) OR the company admin
    if (user.id !== clientUserId && user.id !== companyUserId) {
      return NextResponse.json(
        { error: 'You must be the event poster or the company admin to start a conversation' },
        { status: 403 }
      );
    }

    // Access check for companies: company must have a quote on the event
    // (any status except 'withdrawn') OR be verified and event is open
    if (user.id === companyUserId) {
      const { data: existingQuote } = await supabase
        .from('marketplace_quotes')
        .select('id, status')
        .eq('event_id', event_id)
        .eq('company_id', company_id)
        .neq('status', 'withdrawn')
        .limit(1)
        .maybeSingle();

      if (!existingQuote) {
        // No non-withdrawn quote -- check if company is verified and event is open
        const { data: companyFull } = await supabase
          .from('marketplace_companies')
          .select('verification_status')
          .eq('id', company_id)
          .single();

        if (companyFull?.verification_status !== 'verified' || event.status !== 'open') {
          return NextResponse.json(
            { error: 'Company must have a quote on this event or be verified with event open' },
            { status: 403 }
          );
        }
      }
    }

    // Try to find existing conversation first
    const { data: existing, error: existingError } = await supabase
      .from('marketplace_conversations')
      .select('*')
      .eq('event_id', event_id)
      .eq('company_id', company_id)
      .maybeSingle();

    if (existingError) {
      console.error('[Marketplace Conversations POST] Lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to check existing conversation' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ conversation: existing, created: false });
    }

    // Insert new conversation
    const { data: newConvo, error: insertError } = await supabase
      .from('marketplace_conversations')
      .insert({
        event_id,
        company_id,
        client_user_id: clientUserId,
        company_user_id: companyUserId,
      })
      .select()
      .single();

    if (insertError) {
      // Handle race condition: UNIQUE constraint violation means it was created concurrently
      if (insertError.code === '23505') {
        const { data: raceConvo } = await supabase
          .from('marketplace_conversations')
          .select('*')
          .eq('event_id', event_id)
          .eq('company_id', company_id)
          .single();

        if (raceConvo) {
          return NextResponse.json({ conversation: raceConvo, created: false });
        }
      }

      console.error('[Marketplace Conversations POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation: newConvo, created: true }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace Conversations POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
