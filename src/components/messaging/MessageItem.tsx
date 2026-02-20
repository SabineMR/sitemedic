/**
 * MessageItem - React Native
 *
 * Single message display in a flat list layout (Slack/Teams style, NOT chat bubbles).
 * Left-aligned with sender avatar initial, sender name, message content,
 * and relative timestamp. Queued messages render with reduced opacity and clock indicator.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MessageItemProps {
  senderName: string;
  content: string;
  createdAt: number;
  status: string;
  isOwnMessage: boolean;
  onRetry?: () => void;
}

/**
 * Derive a consistent color from a name string.
 * Same hash approach as ConversationRow for avatar consistency.
 */
const AVATAR_COLORS = [
  '#2563EB', // blue
  '#7C3AED', // violet
  '#DB2777', // pink
  '#DC2626', // red
  '#EA580C', // orange
  '#16A34A', // green
  '#0891B2', // cyan
  '#4F46E5', // indigo
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Format message timestamp.
 * - Today: just time (e.g., "10:30")
 * - Yesterday: "Yesterday 10:30"
 * - Older: "12 Jan 10:30"
 */
function formatMessageTime(epochMs: number): string {
  const date = new Date(epochMs);
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

export function MessageItem({
  senderName,
  content,
  createdAt,
  status,
  isOwnMessage,
  onRetry,
}: MessageItemProps) {
  const initial = (senderName || '?').charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(senderName || '');
  const timeDisplay = formatMessageTime(createdAt);
  const isQueued = status === 'queued';
  const isFailed = status === 'failed';
  const isPending = isQueued || isFailed;

  return (
    <View style={[styles.container, isPending && styles.containerPending]}>
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isOwnMessage
              ? avatarColor + '30'
              : '#F3F4F6',
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            {
              color: isOwnMessage ? avatarColor : '#6B7280',
            },
          ]}
        >
          {initial}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.senderName}>
            {senderName}
            {isOwnMessage && (
              <Text style={styles.youSuffix}> (you)</Text>
            )}
          </Text>
        </View>
        <Text style={styles.messageContent}>{content}</Text>
        <View style={styles.timestampRow}>
          <Text style={styles.timestamp}>{timeDisplay}</Text>
          {isQueued && (
            <Text style={styles.queuedIndicator}>Sending...</Text>
          )}
          {isFailed && (
            <View style={styles.failedRow}>
              <Text style={styles.failedIndicator}>Failed to send</Text>
              {onRetry && (
                <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.retryButton}>Tap to retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  containerPending: {
    opacity: 0.5,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  youSuffix: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  messageContent: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
    marginTop: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  queuedIndicator: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  failedIndicator: {
    fontSize: 11,
    color: '#DC2626',
    fontStyle: 'italic',
  },
  retryButton: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
});
