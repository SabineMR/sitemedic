'use client';

/**
 * NotificationBell
 *
 * Bell icon with unread count badge in the dashboard header.
 * Clicking opens a popover with the 5 most recent notifications.
 * A "View all" link navigates to /dashboard/notifications for the full history.
 *
 * Realtime subscription keeps the badge count live via useRealtimeNotifications.
 *
 * Phase 38: Notifications & Alerts — Plan 02
 */

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useUnreadCount,
  useRealtimeNotifications,
  useMarkNotificationsRead,
} from '@/lib/queries/notifications.hooks';
import type { UserNotification } from '@/lib/marketplace/notification-types';

interface NotificationBellProps {
  userId: string;
}

// =============================================================================
// Notification item row
// =============================================================================

function NotificationItem({
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
      className={`flex gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
        !notification.is_read ? 'bg-muted/30' : ''
      }`}
      onClick={() => {
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
        if (notification.link) {
          window.location.href = notification.link;
        }
      }}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 mt-1.5">
        {!notification.is_read ? (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium' : 'font-normal'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

// =============================================================================
// NotificationBell
// =============================================================================

export function NotificationBell({ userId }: NotificationBellProps) {
  // Establish live Realtime subscription — keeps badge + feed updated
  useRealtimeNotifications(userId);

  const { data: notifData, isLoading } = useNotifications(5);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { mutate: markRead } = useMarkNotificationsRead();

  const notifications = notifData?.notifications ?? [];

  function handleMarkRead(id: string) {
    markRead({ notification_ids: [id] });
  }

  function handleMarkAll() {
    markRead({ mark_all: true });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Link
            href="/dashboard/notifications"
            className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
