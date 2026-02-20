/**
 * Comms Query Functions
 *
 * Server-side fetch and client-side TanStack Query hooks for conversations
 * with computed unread counts and participant name resolution.
 *
 * Phase 41: Web Messaging Core
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Conversation, MessageWithSender } from '@/types/comms.types';

// =============================================================================
// TYPES
// =============================================================================

/** Conversation list item with computed unread count and resolved participant name */
export interface ConversationListItem {
  id: string;
  org_id: string;
  type: 'direct';
  subject: string | null;
  medic_id: string | null;
  created_by: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  unread_count: number;
  participant_name: string;
  participant_role: 'medic' | 'admin';
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Fetch all direct conversations for the current user's org, with computed
 * unread counts and resolved participant names.
 *
 * Performance approach: 3 parallel queries (conversations, read statuses,
 * messages) instead of N+1. Unread counts computed in JavaScript.
 *
 * @param supabase - Server or client Supabase instance
 * @returns Array of conversations sorted by most recent message first
 */
export async function fetchConversationsWithUnread(
  supabase: SupabaseClient
): Promise<ConversationListItem[]> {
  // 1. Get current user and role
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      'Error getting user for conversations:',
      userError ? JSON.stringify(userError) : 'No user session'
    );
    return [];
  }

  const userId = user.id;
  const userRole = user.app_metadata?.role as string | undefined;

  // 2. Fetch all direct conversations for the user's org (RLS scopes to org)
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('type', 'direct')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convError) {
    console.error(
      `Error fetching conversations: message=${convError.message}, code=${convError.code}, details=${convError.details}, hint=${convError.hint}`
    );
    return [];
  }

  if (!conversations || conversations.length === 0) {
    return [];
  }

  const conversationIds = conversations.map((c) => c.id);

  // 3. Parallel queries: read statuses + messages for unread + participant names
  const medicIds = conversations
    .map((c) => c.medic_id)
    .filter((id): id is string => id !== null);

  const [readStatusResult, messagesResult, medicsResult] = await Promise.all([
    // Read statuses for the current user
    supabase
      .from('conversation_read_status')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .in('conversation_id', conversationIds),

    // All messages in these conversations (RLS filters deleted_at IS NULL)
    supabase
      .from('messages')
      .select('conversation_id, created_at, sender_id')
      .in('conversation_id', conversationIds),

    // Medic names for participant resolution
    medicIds.length > 0
      ? supabase
          .from('medics')
          .select('id, first_name, last_name, user_id')
          .in('id', medicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Build lookup maps
  const readStatusMap = new Map<string, string>();
  if (readStatusResult.data) {
    readStatusResult.data.forEach((rs) => {
      readStatusMap.set(rs.conversation_id, rs.last_read_at);
    });
  }

  const medicMap = new Map<
    string,
    { first_name: string; last_name: string; user_id: string }
  >();
  if (medicsResult.data) {
    medicsResult.data.forEach((m) => {
      medicMap.set(m.id, {
        first_name: m.first_name,
        last_name: m.last_name,
        user_id: m.user_id,
      });
    });
  }

  // Compute unread counts per conversation
  // Group messages by conversation_id, then count those after last_read_at
  // where sender_id is not the current user
  const unreadCountMap = new Map<string, number>();
  if (messagesResult.data) {
    messagesResult.data.forEach((msg) => {
      // Skip own messages
      if (msg.sender_id === userId) return;

      const lastReadAt = readStatusMap.get(msg.conversation_id);
      const isUnread = !lastReadAt || new Date(msg.created_at) > new Date(lastReadAt);

      if (isUnread) {
        unreadCountMap.set(
          msg.conversation_id,
          (unreadCountMap.get(msg.conversation_id) || 0) + 1
        );
      }
    });
  }

  // 4. Build result array with participant names and unread counts
  return conversations.map((conv) => {
    let participantName = 'Unknown';
    let participantRole: 'medic' | 'admin' = 'admin';

    if (userRole === 'medic') {
      // Current user is a medic — the other party is the org admin
      participantName = 'Admin';
      participantRole = 'admin';
    } else {
      // Current user is org_admin — the other party is the medic
      if (conv.medic_id && medicMap.has(conv.medic_id)) {
        const medic = medicMap.get(conv.medic_id)!;
        participantName = `${medic.first_name} ${medic.last_name}`;
      }
      participantRole = 'medic';
    }

    return {
      id: conv.id,
      org_id: conv.org_id,
      type: 'direct' as const,
      subject: conv.subject,
      medic_id: conv.medic_id,
      created_by: conv.created_by,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      unread_count: unreadCountMap.get(conv.id) || 0,
      participant_name: participantName,
      participant_role: participantRole,
    };
  });
}

/**
 * Fetch total unread message count across all conversations.
 * Used for the header badge in the dashboard layout.
 *
 * @param supabase - Server Supabase instance
 * @returns Total unread count (number)
 */
export async function fetchTotalUnreadCount(
  supabase: SupabaseClient
): Promise<number> {
  const conversations = await fetchConversationsWithUnread(supabase);
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}

// =============================================================================
// CLIENT HOOKS
// =============================================================================

/**
 * Client-side hook for conversations with 30-second polling.
 * More frequent than workers (60s) since messaging is time-sensitive.
 *
 * @param initialData - Server-side fetched conversations for SSR hydration
 */
export function useConversations(initialData: ConversationListItem[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversationsWithUnread(supabase),
    initialData,
    refetchInterval: 30_000, // 30 seconds
  });
}

// =============================================================================
// MESSAGE QUERY FUNCTIONS (41-02)
// =============================================================================

/**
 * Fetch a single conversation by ID.
 *
 * @param supabase - Server or client Supabase instance
 * @param conversationId - The conversation UUID
 * @returns Conversation or null if not found
 */
export async function fetchConversationById(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error || !data) {
    if (error) console.error('Error fetching conversation:', error);
    return null;
  }

  return data as Conversation;
}

/**
 * Fetch all messages for a conversation with sender name resolution.
 *
 * Messages are ordered by created_at ASC (oldest first) for display
 * in a thread. Sender names are resolved by bulk-querying the medics
 * table — medics get their full name, non-medic senders get "Admin".
 *
 * @param supabase - Server or client Supabase instance
 * @param conversationId - The conversation UUID
 * @returns Array of MessageWithSender sorted oldest-first (limit 200)
 */
export async function fetchMessagesForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<MessageWithSender[]> {
  // 1. Fetch messages for this conversation
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (msgError) {
    console.error('Error fetching messages:', msgError);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // 2. Collect unique sender IDs
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];

  // 3. Bulk-resolve sender names from medics table (medics have user_id FK)
  const { data: medics } = await supabase
    .from('medics')
    .select('user_id, first_name, last_name')
    .in('user_id', senderIds);

  // Build lookup: userId -> full name
  const senderNameMap = new Map<string, string>();
  if (medics) {
    medics.forEach((m) => {
      senderNameMap.set(m.user_id, `${m.first_name} ${m.last_name}`);
    });
  }

  // 4. Map messages to MessageWithSender
  return messages.map((msg) => ({
    ...msg,
    sender_name: senderNameMap.get(msg.sender_id) || 'Admin',
    sender_role: senderNameMap.has(msg.sender_id) ? 'medic' : 'admin',
  })) as MessageWithSender[];
}

/**
 * Client-side hook for messages in a conversation with 10-second polling.
 * Faster polling than conversations (30s) since an active thread is
 * time-sensitive.
 *
 * @param conversationId - The conversation UUID
 * @param initialData - Server-side fetched messages for SSR hydration
 */
export function useMessages(
  conversationId: string,
  initialData: MessageWithSender[]
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessagesForConversation(supabase, conversationId),
    initialData,
    refetchInterval: 10_000, // 10 seconds — faster for active thread
  });
}
