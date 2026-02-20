---
phase: 38-notifications-alerts
plan: "02"
subsystem: ui
tags: [react, tanstack-query, supabase-realtime, notifications, popover, date-fns]

# Dependency graph
requires:
  - phase: 38-01
    provides: user_notifications table with REPLICA IDENTITY FULL, UserNotification type, createNotification utility

provides:
  - GET /api/marketplace/notifications with limit/offset/unread_only pagination
  - PATCH /api/marketplace/notifications/mark-read for single or bulk mark-as-read
  - useNotifications(limit) TanStack Query hook
  - useUnreadCount() hook with 30s staleTime
  - useRealtimeNotifications(userId) Supabase Realtime subscription on user_notifications
  - useMarkNotificationsRead() mutation with cache invalidation
  - NotificationBell component with popover dropdown and live unread badge
  - /dashboard/notifications full notification history page with load-more

affects:
  - 38-03
  - 38-04
  - Any future phase using notifications UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Supabase Realtime postgres_changes subscription for user-scoped table (filter user_id=eq.userId)
    - TanStack Query cache invalidation on Realtime events (same pattern as comms.hooks.ts)
    - Popover-based notification dropdown with 'use client' directive
    - Load-more pagination via useState(limit) that grows by PAGE_SIZE on click

key-files:
  created:
    - web/app/api/marketplace/notifications/route.ts
    - web/app/api/marketplace/notifications/mark-read/route.ts
    - web/lib/queries/notifications.hooks.ts
    - web/components/dashboard/NotificationBell.tsx
    - web/app/(dashboard)/dashboard/notifications/page.tsx
  modified:
    - web/app/(dashboard)/layout.tsx

key-decisions:
  - "useUnreadCount uses limit=1 (NOT limit=0) to avoid .range(0,-1) invalid range on server"
  - "Realtime channel filtered by user_id=eq.userId for per-user isolation (not org-wide)"
  - "NotificationBell placed immediately before UnreadBadge in header for visual grouping"
  - "Load-more pagination in notifications page: useState(limit) grows by 20 per click"

patterns-established:
  - "Pattern: Realtime subscription in component props (userId passed from server component in layout)"
  - "Pattern: Badge style consistent with UnreadBadge (absolute -top-0.5 -right-0.5, red, 99+ cap)"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 38 Plan 02: Notification Feed UI Summary

**Bell icon dropdown with Supabase Realtime badge updates + full /dashboard/notifications page using TanStack Query hooks and postgres_changes subscription**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T23:18:45Z
- **Completed:** 2026-02-20T23:21:36Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- Two API routes (GET notifications with pagination, PATCH mark-read for single/bulk)
- Four TanStack Query hooks (useNotifications, useUnreadCount, useRealtimeNotifications, useMarkNotificationsRead)
- Supabase Realtime postgres_changes subscription on user_notifications filtered by user_id
- NotificationBell popover component with live unread badge, 5-notification preview, and mark-all-as-read
- Full /dashboard/notifications page with load-more pagination and per-item mark-as-read
- Layout updated with NotificationBell before UnreadBadge in header

## Task Commits

1. **Task 1: Notification API routes and TanStack Query + Realtime hooks** - `46d800f` (feat)
2. **Task 2: NotificationBell component, notifications page, and layout integration** - `fc90e59` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `web/app/api/marketplace/notifications/route.ts` - GET endpoint with limit/offset/unread_only
- `web/app/api/marketplace/notifications/mark-read/route.ts` - PATCH endpoint for marking read
- `web/lib/queries/notifications.hooks.ts` - All four TanStack Query + Realtime hooks
- `web/components/dashboard/NotificationBell.tsx` - Bell icon with popover dropdown
- `web/app/(dashboard)/dashboard/notifications/page.tsx` - Full notification history page
- `web/app/(dashboard)/layout.tsx` - Added NotificationBell before UnreadBadge in header

## Decisions Made
- **limit=1 for useUnreadCount**: Using `limit=1` (not `limit=0`) avoids `.range(0, -1)` which is an invalid Supabase range call. The `unread_count` aggregate is always returned regardless of the limit applied to the row set.
- **User-scoped Realtime channel**: Channel filtered with `user_id=eq.${userId}` for per-user isolation, matching the user_notifications RLS design from Plan 01.
- **NotificationBell placement**: Placed immediately before UnreadBadge in the header so both icon badges are visually grouped on the right side of the header.
- **Load-more pagination**: Notifications page uses `useState(limit)` growing by 20 per click (fetches new limit from start), which is simpler than cursor-based pagination for this read-heavy feed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation clean on all new files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Notification bell and full history page fully operational
- Realtime hook ready for Plans 03 and 04 (preferences UI and notification triggers)
- API routes ready to receive notifications created by Plan 01 utilities (createNotification)
- No blockers for Plan 03 (Notification Preferences UI)

---
*Phase: 38-notifications-alerts*
*Completed: 2026-02-20*
