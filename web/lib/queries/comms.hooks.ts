'use client';

/**
 * Comms Client Hooks
 *
 * Client-side TanStack Query hooks and Supabase Realtime subscriptions
 * for conversations and messages.
 *
 * Phase 41: Web Messaging Core
 * Phase 43: Polling replaced with Supabase Realtime subscriptions
 */

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { supabase as realtimeSupabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MessageWithSender } from '@/types/comms.types';
import {
  fetchConversationsWithUnread,
  fetchMessagesForConversation,
  type ConversationListItem,
} from './comms';

// Re-export types for convenience so existing imports still work
export type { ConversationListItem } from './comms';

// =============================================================================
// CLIENT HOOKS
// =============================================================================

/**
 * Client-side hook for conversations.
 * Realtime subscriptions handle live updates (no polling).
 * Initial data comes from server-side fetch for SSR hydration.
 *
 * @param initialData - Server-side fetched conversations for SSR hydration
 */
export function useConversations(initialData: ConversationListItem[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversationsWithUnread(supabase),
    initialData,
  });
}

/**
 * Client-side hook for messages in a conversation.
 * Realtime subscriptions handle live updates (no polling).
 * Initial data comes from server-side fetch for SSR hydration.
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
  });
}

// =============================================================================
// REALTIME SUBSCRIPTION HOOK (Phase 43)
// =============================================================================

/**
 * Supabase Realtime subscription hook that replaces polling.
 *
 * Creates a single Realtime channel per user/org and listens for:
 * - INSERT on `messages` table (new message arrival)
 * - UPDATE on `conversations` table (metadata changes like last_message_at)
 *
 * On Realtime event, invalidates the relevant TanStack Query cache entries
 * so components automatically re-render with fresh data.
 *
 * @param orgId - Current organisation UUID (required for channel filter)
 * @returns { isConnected: boolean } - Whether the Realtime channel is active
 */
export function useRealtimeMessages(orgId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) {
      setIsConnected(false);
      return;
    }

    const channelName = `web-messages:org_${orgId}`;

    const channel: RealtimeChannel = realtimeSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          // Invalidate the specific conversation's messages query
          const conversationId = payload.new?.conversation_id;
          if (conversationId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', conversationId],
            });
          }
          // Also refresh the conversation list (preview, timestamp, unread count)
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Refresh conversation list on any conversation metadata change
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      realtimeSupabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [orgId, queryClient]);

  return { isConnected };
}
