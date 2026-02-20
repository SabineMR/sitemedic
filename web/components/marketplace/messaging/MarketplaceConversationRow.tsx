'use client';

/**
 * MarketplaceConversationRow Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * A single row in the marketplace inbox conversation list.
 * Shows other party name, event name, last message preview,
 * timestamp, and unread badge.
 */

import type { MarketplaceConversation } from '@/lib/marketplace/messaging-types';

interface MarketplaceConversationRowProps {
  conversation: MarketplaceConversation;
  isActive: boolean;
  onClick: () => void;
}

export function MarketplaceConversationRow({
  conversation,
  isActive,
  onClick,
}: MarketplaceConversationRowProps) {
  const hasUnread = (conversation.unread_count || 0) > 0;

  // Relative time formatting
  const lastMessageDate = conversation.last_message_at
    ? new Date(conversation.last_message_at)
    : null;
  let timeLabel = '';
  if (lastMessageDate) {
    const now = new Date();
    const diffMs = now.getTime() - lastMessageDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      timeLabel = 'Just now';
    } else if (diffMins < 60) {
      timeLabel = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      timeLabel = `${diffHours}h ago`;
    } else if (diffDays === 1) {
      timeLabel = 'Yesterday';
    } else if (diffDays < 7) {
      timeLabel = `${diffDays}d ago`;
    } else {
      timeLabel = lastMessageDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Other party name */}
          <div className="flex items-center gap-2">
            <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
              {conversation.other_party_name || conversation.company_name || 'Unknown'}
            </p>
            {hasUnread && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </div>

          {/* Event name */}
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {conversation.event_name || 'Event'}
          </p>

          {/* Last message preview */}
          {conversation.last_message_preview && (
            <p className={`text-xs truncate mt-1 ${hasUnread ? 'text-gray-700' : 'text-gray-500'}`}>
              {conversation.last_message_preview}
            </p>
          )}
        </div>

        {/* Timestamp */}
        {timeLabel && (
          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
            {timeLabel}
          </span>
        )}
      </div>
    </button>
  );
}
