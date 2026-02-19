/**
 * Message Item - Client Component
 *
 * Single message display in a flat list layout (Slack/Teams style, NOT chat bubbles).
 * Left-aligned with sender avatar initial, sender name, message content,
 * and relative timestamp.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import type { MessageWithSender } from '@/types/comms.types';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const initial = (message.sender_name || '?').charAt(0).toUpperCase();
  const timeDisplay = formatMessageTime(message.created_at);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
          isOwnMessage
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {message.sender_name}
            {isOwnMessage && (
              <span className="text-muted-foreground font-normal"> (you)</span>
            )}
          </span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span className="text-[11px] text-muted-foreground mt-1 inline-block">
          {timeDisplay}
        </span>
      </div>
    </div>
  );
}

/**
 * Format message timestamp.
 * - Today: just time (e.g., "10:30")
 * - Yesterday: "Yesterday 10:30"
 * - Older: "12 Jan 10:30"
 */
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Today: just time
  if (date.toDateString() === now.toDateString()) {
    return timeStr;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${timeStr}`;
  }

  // Older: date + time
  const dateDisplay = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${dateDisplay} ${timeStr}`;
}
