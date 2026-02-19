/**
 * Conversation Row - Client Component
 *
 * Single conversation row with avatar initial, participant name,
 * truncated message preview, relative timestamp, unread badge,
 * and role indicator.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import Link from 'next/link';
import type { ConversationListItem } from '@/lib/queries/comms';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConversationRowProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationRow({
  conversation,
  isSelected,
  onClick,
}: ConversationRowProps) {
  const timeDisplay = formatRelativeTime(conversation.last_message_at);
  const initial = conversation.participant_name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/messages/${conversation.id}`}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b',
        isSelected && 'bg-muted'
      )}
    >
      {/* Avatar circle with initial */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-medium text-primary">{initial}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              conversation.unread_count > 0 ? 'font-semibold' : 'font-medium'
            )}
          >
            {conversation.participant_name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {timeDisplay}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              'text-xs truncate',
              conversation.unread_count > 0
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {conversation.last_message_preview || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-[10px]"
            >
              {conversation.unread_count > 99
                ? '99+'
                : conversation.unread_count}
            </Badge>
          )}
        </div>
        {/* Role indicator */}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
          {conversation.participant_role === 'medic' ? 'Medic' : 'Admin'}
        </span>
      </div>
    </Link>
  );
}

/**
 * Format relative time for conversation row timestamps.
 * - Today: show time (e.g., "10:30")
 * - Yesterday: "Yesterday"
 * - This week: day name (e.g., "Mon")
 * - Older: date (e.g., "12 Jan")
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  // Today: show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // This week: show day name
  if (diffDays < 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  }

  // Older: show date
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
