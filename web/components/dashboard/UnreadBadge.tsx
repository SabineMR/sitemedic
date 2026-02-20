/**
 * UnreadBadge - Client Component
 *
 * Reactive unread message count badge for the dashboard header.
 * Uses useConversations hook which is kept up-to-date by Realtime
 * subscription cache invalidation.
 *
 * Replaces the server-side-only badge from Phase 41 so the count
 * updates live without page reload.
 *
 * Phase 43: Real-time Push Notifications
 */

'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useConversations, useRealtimeMessages, type ConversationListItem } from '@/lib/queries/comms.hooks';

interface UnreadBadgeProps {
  /** Server-side initial conversations for SSR hydration */
  initialConversations: ConversationListItem[];
  /** Organisation ID for Realtime subscription */
  orgId: string;
}

export function UnreadBadge({ initialConversations, orgId }: UnreadBadgeProps) {
  const { data: conversations } = useConversations(initialConversations);

  // Establish Realtime subscription at the layout level
  // This ensures the badge updates even when not on the /messages page
  useRealtimeMessages(orgId);

  const totalUnread = conversations?.reduce(
    (sum, c) => sum + c.unread_count,
    0
  ) ?? 0;

  return (
    <Link
      href="/messages"
      className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <MessageSquare className="h-5 w-5" />
      {totalUnread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </Link>
  );
}
