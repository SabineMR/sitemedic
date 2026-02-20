/**
 * ConversationRow - React Native
 *
 * Single conversation row with avatar initial, participant name,
 * truncated message preview, relative timestamp, and unread badge.
 * Minimum 72px height for gloves-on tap targets.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ConversationRowProps {
  participantName: string;
  lastMessagePreview: string | undefined;
  lastMessageAt: number | undefined;
  unreadCount: number;
  onPress: () => void;
}

/**
 * Derive a consistent color from a name string.
 * Simple hash to pick from a palette of 8 colors.
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
 * Format relative time for conversation row timestamps.
 * - Today: show time (e.g., "10:30")
 * - Yesterday: "Yesterday"
 * - This week: day name (e.g., "Mon")
 * - Older: date (e.g., "12 Jan")
 */
function formatRelativeTime(epochMs: number | undefined): string {
  if (!epochMs) return '';

  const date = new Date(epochMs);
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

export function ConversationRow({
  participantName,
  lastMessagePreview,
  lastMessageAt,
  unreadCount,
  onPress,
}: ConversationRowProps) {
  const initial = (participantName || '?').charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(participantName || '');
  const timeDisplay = formatRelativeTime(lastMessageAt);
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      {/* Avatar circle with initial */}
      <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>
          {initial}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.participantName,
              hasUnread && styles.participantNameUnread,
            ]}
            numberOfLines={1}
          >
            {participantName || 'Unknown'}
          </Text>
          <Text style={styles.timestamp}>{timeDisplay}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              hasUnread && styles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {lastMessagePreview || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  participantNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  preview: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  previewUnread: {
    color: '#374151',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
