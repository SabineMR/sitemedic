/**
 * GET /api/messages/search
 * Phase 47-02: Cross-conversation message search
 *
 * Uses PostgreSQL full-text search via the tsvector `fts` column
 * (created in migration 157). Returns messages enriched with sender
 * names and conversation names.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import type { MessageSearchResult } from '@/types/comms.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const userRole = user.app_metadata?.role as string | undefined;

    // 2. Get org_id
    const orgId = await requireOrgId();

    // 3. Parse query params
    const q = request.nextUrl.searchParams.get('q')?.trim();
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // 4. Full-text search using tsvector column
    const { data: messages, error: searchError } = await supabase
      .from('messages')
      .select('id, conversation_id, content, sender_id, created_at')
      .textSearch('fts', q, { type: 'websearch', config: 'english' })
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ results: [] });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 5. Enrich with sender names
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const { data: medics } = await supabase
      .from('medics')
      .select('user_id, first_name, last_name')
      .in('user_id', senderIds);

    const senderNameMap = new Map<string, string>();
    if (medics) {
      medics.forEach((m) => {
        senderNameMap.set(m.user_id, `${m.first_name} ${m.last_name}`);
      });
    }

    // 6. Enrich with conversation names
    const conversationIds = [...new Set(messages.map((m) => m.conversation_id))];
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, type, medic_id, subject')
      .in('id', conversationIds);

    // Resolve medic names for conversation display
    const convMedicIds = (conversations ?? [])
      .map((c) => c.medic_id)
      .filter((id): id is string => id !== null);

    let convMedicMap = new Map<string, string>();
    if (convMedicIds.length > 0) {
      const { data: convMedics } = await supabase
        .from('medics')
        .select('id, first_name, last_name')
        .in('id', convMedicIds);

      if (convMedics) {
        convMedics.forEach((m) => {
          convMedicMap.set(m.id, `${m.first_name} ${m.last_name}`);
        });
      }
    }

    const convNameMap = new Map<string, { name: string; type: string }>();
    if (conversations) {
      conversations.forEach((conv) => {
        let name = 'Unknown';
        if (conv.type === 'broadcast') {
          name = 'Broadcasts';
        } else if (userRole === 'medic') {
          name = 'Admin';
        } else if (conv.medic_id && convMedicMap.has(conv.medic_id)) {
          name = convMedicMap.get(conv.medic_id)!;
        }
        convNameMap.set(conv.id, { name, type: conv.type });
      });
    }

    // 7. Build results
    const results: MessageSearchResult[] = messages.map((msg) => {
      const convInfo = convNameMap.get(msg.conversation_id);
      return {
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content || '',
        sender_id: msg.sender_id,
        sender_name: senderNameMap.get(msg.sender_id) || 'Admin',
        created_at: msg.created_at,
        conversation_name: convInfo?.name || 'Unknown',
        conversation_type: (convInfo?.type || 'direct') as 'direct' | 'broadcast',
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Message search error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
