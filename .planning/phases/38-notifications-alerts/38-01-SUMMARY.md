---
phase: 38-notifications-alerts
plan: 01
subsystem: database, notifications
tags: [twilio, supabase, realtime, sms, rls, postgres, typescript, notifications]

# Dependency graph
requires:
  - phase: 36-ratings-messaging-disputes
    provides: marketplace messaging pattern (user_id RLS, Realtime, fire-and-forget notifications.ts)
  - phase: 35-award-flow-payment
    provides: service-role client pattern (send-welcome.ts) and notifications.ts email utilities
  - phase: 38-01 (migrations)
    provides: user_notifications + marketplace_notification_preferences tables

provides:
  - user_notifications table with user_id RLS, Realtime enabled, REPLICA IDENTITY FULL
  - marketplace_notification_preferences table with PECR-compliant SMS defaults (all FALSE)
  - sendSMS() utility with dev-mode fallback (no Twilio credentials needed in dev)
  - createNotification() + createBulkNotifications() fire-and-forget utilities (service-role)
  - NOTIFICATION_TYPES, NotificationType, NOTIFICATION_CATEGORIES, UserNotification, NotificationPreferences shared types
  - Twilio SMS documented in .env.example

affects:
  - 38-02: Dashboard notification feed (reads user_notifications via Realtime hook)
  - 38-03: Trigger wiring (calls createNotification, sendSMS from existing API routes)
  - 38-04: Notification preferences UI (reads/writes marketplace_notification_preferences)

# Tech tracking
tech-stack:
  added:
    - twilio@5.12.2 (SMS delivery via Twilio API)
  patterns:
    - Service-role Supabase client for cross-user INSERT (fan-out pattern)
    - Fire-and-forget notification creation (never throws, always catches)
    - Dev-mode SMS fallback (console.log when TWILIO_* env vars missing)
    - REPLICA IDENTITY FULL for Realtime UPDATE events

key-files:
  created:
    - supabase/migrations/159_user_notifications.sql
    - supabase/migrations/160_marketplace_notification_preferences.sql
    - web/lib/marketplace/sms.ts
    - web/lib/marketplace/notification-types.ts
    - web/lib/marketplace/create-notification.ts
  modified:
    - web/.env.example
    - web/package.json

key-decisions:
  - "Service-role client required for createNotification (not anon-key) — fan-out inserts rows for other users which RLS blocks for anon-key"
  - "REPLICA IDENTITY FULL on user_notifications — needed for Realtime UPDATE payloads when marking notifications as read"
  - "All sms_* preference columns default FALSE — PECR compliance; sms_opted_in_at provides audit trail"
  - "SMS dev-mode returns success:true with dev-mode-mock-sid (not error) — unblocks dev without Twilio credentials"
  - "createBulkNotifications does single INSERT for fan-out (not N individual inserts) — avoids N×DB round trips"

patterns-established:
  - "Notification creation: always import createNotification from @/lib/marketplace/create-notification and wrap in void"
  - "Notification types: always use NOTIFICATION_TYPES.XXX constant, never raw strings"
  - "SMS sending: always call sendSMS({ to, body }) — works in dev without credentials"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 38 Plan 01: Database Foundation & Notification Utilities Summary

**user_notifications table (Realtime-enabled, user_id RLS) + marketplace_notification_preferences (PECR-compliant SMS opt-in) + Twilio sendSMS + fire-and-forget createNotification with service-role client**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T23:12:59Z
- **Completed:** 2026-02-20T23:15:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Migration 159 creates user_notifications with 12-type CHECK constraint, user_id RLS (SELECT/UPDATE for users, service-role INSERT for fan-out), Realtime publication, and REPLICA IDENTITY FULL for mark-as-read live updates
- Migration 160 creates marketplace_notification_preferences with 7 email booleans (TRUE) + 4 SMS booleans (FALSE) + sms_opted_in_at PECR audit trail + event_alert_radius_miles for location filtering
- Three TypeScript utility modules created: sendSMS (Twilio v5 with dev fallback), NOTIFICATION_TYPES/interfaces, createNotification/createBulkNotifications (service-role, fire-and-forget)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migrations for notifications and preferences** - `499a8fd` (feat)
2. **Task 2: Twilio SMS module, notification types, and create-notification utility** - `dac7e84` (feat)

**Plan metadata:** Included in final docs commit.

## Files Created/Modified

- `supabase/migrations/159_user_notifications.sql` - user_notifications table: 12-type CHECK constraint, user_id RLS (3 policies), indexes, Realtime publication, REPLICA IDENTITY FULL
- `supabase/migrations/160_marketplace_notification_preferences.sql` - notification preferences: email x7 (TRUE), sms x4 (FALSE), sms_opted_in_at PECR audit, event_alert_radius_miles, updated_at trigger
- `web/lib/marketplace/sms.ts` - Twilio v5 SMS wrapper: sendSMS() with dev-mode fallback returning dev-mode-mock-sid
- `web/lib/marketplace/notification-types.ts` - NOTIFICATION_TYPES const (12 types), NotificationType union, NOTIFICATION_CATEGORIES groupings, UserNotification + NotificationPreferences interfaces
- `web/lib/marketplace/create-notification.ts` - createNotification() and createBulkNotifications(): service-role client, fire-and-forget (never throws)
- `web/.env.example` - Added TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER with setup instructions
- `web/package.json` - Added twilio@5.12.2 dependency

## Decisions Made

- **Service-role client in createNotification:** The anon-key cookie client from `@/lib/supabase/server` is bound to the calling user's session. Fan-out in Plan 03 inserts rows for OTHER users — their `user_id != auth.uid()` at time of insertion. The `service_role_insert_notifications` RLS policy (WITH CHECK true) only works with the service-role client. Pattern matches `send-welcome.ts`.
- **REPLICA IDENTITY FULL:** Required for Realtime UPDATE event payloads (needed when user marks notification as read and the feed should update live). Same pattern as migration 157 for marketplace_messages.
- **SMS defaults all FALSE (not just sms_new_events):** Conservative PECR stance — user must opt in to each SMS category individually. sms_opted_in_at records when consent was first given.
- **createBulkNotifications uses single array INSERT:** More efficient than N individual calls; Supabase handles batching. Used for fan-out in Plan 03.
- **Dev-mode SMS returns success:true:** Returning `{ success: false }` in dev would cause callers to log errors on every dev notification — confusing. Mock success is correct behaviour since the message was "delivered" (to console).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly (`tsc --noEmit --skipLibCheck` with zero errors). Twilio 5.12.2 installed without conflicts.

## User Setup Required

**External services require manual configuration.** Twilio SMS is the only new service introduced in this plan.

**To enable SMS notifications in production:**

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Purchase a UK phone number: Twilio Console → Phone Numbers → Buy a Number → filter by country UK (+44)
3. Add to production environment variables:
   - `TWILIO_ACCOUNT_SID` — from Twilio Console → Account Info → Account SID
   - `TWILIO_AUTH_TOKEN` — from Twilio Console → Account Info → Auth Token
   - `TWILIO_PHONE_NUMBER` — the purchased E.164 UK number (e.g. `+441xxxxxxxxx`)
4. **Without these variables:** `sendSMS()` falls back to `console.log` — no errors, no SMS sent.

**Supabase migrations to apply:**
- `159_user_notifications.sql` — creates `user_notifications` table with Realtime
- `160_marketplace_notification_preferences.sql` — creates `marketplace_notification_preferences` table

## Next Phase Readiness

- **Plan 02 (Dashboard Feed):** Ready — `user_notifications` table exists with Realtime. `UserNotification` interface ready for hook typing.
- **Plan 03 (Trigger Wiring):** Ready — `createNotification`, `createBulkNotifications`, `sendSMS` all importable from `@/lib/marketplace/`.
- **Plan 04 (Preferences UI):** Ready — `marketplace_notification_preferences` table exists. `NotificationPreferences` interface ready.
- **No blockers** — dev mode works without Twilio credentials.

---
*Phase: 38-notifications-alerts*
*Completed: 2026-02-20*
