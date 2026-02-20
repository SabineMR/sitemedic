/**
 * Search Result Item - Client Component
 *
 * Single search result row showing message preview, conversation name,
 * sender name, and timestamp. Clicking navigates to the conversation.
 *
 * Phase 47: Message Polish
 */

'use client';

import Link from 'next/link';
import type { MessageSearchResult } from '@/types/comms.types';

interface SearchResultItemProps {
  result: MessageSearchResult;
  onClick: () => void;
}

export function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const timeDisplay = formatSearchTime(result.created_at);
  const snippet =
    result.content.length > 120
      ? result.content.substring(0, 120) + '...'
      : result.content;

  return (
    <Link
      href={`/messages/${result.conversation_id}`}
      onClick={onClick}
      className="block px-4 py-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium truncate">
          {result.conversation_name}
        </span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
          {timeDisplay}
        </span>
      </div>
      <p className="text-sm mt-0.5 text-foreground line-clamp-2">{snippet}</p>
      <span className="text-xs text-muted-foreground mt-0.5 inline-block">
        {result.sender_name}
      </span>
    </Link>
  );
}

function formatSearchTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (date.toDateString() === now.toDateString()) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${timeStr}`;
  }

  const dateDisplay = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${dateDisplay} ${timeStr}`;
}
