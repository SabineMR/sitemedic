'use client';

/**
 * Notification Client Hooks
 *
 * Client-side TanStack Query hooks and Supabase Realtime subscriptions
 * for the user notification feed.
 *
 * Phase 38: Notifications & Alerts — Plan 02
 */

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { UserNotification } from '@/lib/marketplace/notification-types';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface NotificationsResponse {
  notifications: UserNotification[];
  unread_count: number;
  total_count: number;
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch the N most recent notifications for the current user.
 *
 * @param limit - Maximum number of notifications to return (default 50)
 */
export function useNotifications(limit = 50) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/notifications?limit=${limit}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch notifications: ${res.status}`);
      }
      return res.json() as Promise<NotificationsResponse>;
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch the current unread notification count.
 *
 * Uses limit=1 (NOT limit=0) to avoid triggering an invalid .range(0, -1) call
 * on the server. The unread_count is always returned as a separate aggregate.
 */
export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/notifications?unread_only=true&limit=1');
      if (!res.ok) {
        throw new Error(`Failed to fetch unread count: ${res.status}`);
      }
      const data = (await res.json()) as NotificationsResponse;
      return data.unread_count;
    },
    staleTime: 30_000,
  });
}

// =============================================================================
// REALTIME SUBSCRIPTION HOOK
// =============================================================================

/**
 * Supabase Realtime subscription that watches the user_notifications table
 * for INSERT and UPDATE events.
 *
 * On any change, invalidates ['notifications'] and ['notification-unread-count']
 * TanStack Query cache entries so components re-render with fresh data.
 *
 * Mirrors the pattern from useRealtimeMessages in comms.hooks.ts.
 *
 * @param userId - Current user ID (null = subscription not created)
 * @returns { isConnected: boolean }
 */
export function useRealtimeNotifications(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      setIsConnected(false);
      return;
    }

    const supabase = createClient();
    const channelName = `web-notifications:user_${userId}`;

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // New notification arrived — refresh the feed and badge count
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Notification updated (e.g. marked as read) — refresh badge count
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [userId, queryClient]);

  return { isConnected };
}

// =============================================================================
// MUTATION HOOK
// =============================================================================

/**
 * Mark one or more notifications as read.
 *
 * Accepts the same body as PATCH /api/marketplace/notifications/mark-read:
 *   { notification_ids?: string[], mark_all?: boolean }
 *
 * On success, invalidates the notifications and unread-count caches.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { notification_ids?: string[]; mark_all?: boolean }) => {
      const res = await fetch('/api/marketplace/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Failed to mark notifications as read: ${res.status}`);
      }
      return res.json() as Promise<{ success: boolean; updated_count: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
    },
  });
}
