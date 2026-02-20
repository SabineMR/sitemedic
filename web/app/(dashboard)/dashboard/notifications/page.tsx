'use client';

/**
 * /dashboard/notifications
 *
 * Full notification history page.
 * Features:
 *  - All notifications with infinite scroll / load more
 *  - Mark individual notifications as read
 *  - Mark all as read
 *  - Empty state
 *
 * Phase 38: Notifications & Alerts — Plan 02
 */

import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useMarkNotificationsRead,
} from '@/lib/queries/notifications.hooks';
import type { UserNotification } from '@/lib/marketplace/notification-types';

// =============================================================================
// Notification row
// =============================================================================

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <div
      className={`flex gap-4 p-4 rounded-lg border transition-colors ${
        !notification.is_read
          ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30'
          : 'bg-background border-border'
      }`}
    >
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-2">
        {!notification.is_read ? (
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        ) : (
          <div className="w-2.5 h-2.5 rounded-full bg-muted" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p
              className={`text-sm ${
                !notification.is_read ? 'font-semibold' : 'font-medium'
              }`}
            >
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {notification.body}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">{timeAgo}</p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {notification.link && (
              <Link href={notification.link}>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  View
                </Button>
              </Link>
            )}
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={() => onMarkRead(notification.id)}
                title="Mark as read"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, isFetching } = useNotifications(limit);
  const { mutate: markRead, isPending: isMarkingRead } = useMarkNotificationsRead();

  const notifications = data?.notifications ?? [];
  const totalCount = data?.total_count ?? 0;
  const unreadCount = data?.unread_count ?? 0;
  const hasMore = notifications.length < totalCount;

  function handleMarkRead(id: string) {
    markRead({ notification_ids: [id] });
  }

  function handleMarkAll() {
    markRead({ mark_all: true });
  }

  function handleLoadMore() {
    setLimit((prev) => prev + PAGE_SIZE);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={isMarkingRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium text-muted-foreground">
            No notifications yet
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            You&apos;ll receive notifications for new events, quotes, payments, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Showing {notifications.length} of {totalCount} notification
            {totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
