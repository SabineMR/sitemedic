---
phase: 43-real-time-push-notifications
plan: 03
subsystem: notifications, api, database
tags: [expo-push-api, pg_net, postgresql-trigger, deno-edge-function, gdpr, push-notifications]

# Dependency graph
requires:
  - phase: 43-02
    provides: "Push token registration on profiles.push_token column"
  - phase: 40-01
    provides: "Messages table schema, conversations table with type/medic_id/created_by"
provides:
  - "Edge Function send-message-notification for GDPR-safe push delivery via Expo Push API"
  - "PostgreSQL AFTER INSERT trigger on messages table invoking Edge Function via pg_net"
  - "DeviceNotRegistered token cleanup from profiles table"
  - "Support for both direct (1:1) and broadcast message push notifications"
affects: [44-broadcast-messaging, 47-production-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pg_net + Vault secrets trigger pattern for Edge Function invocation (reused from migration 033)"
    - "Expo Push API batching (100 tokens per request) for broadcast scalability"
    - "GDPR-safe notification payload: sender name only, never message content"

key-files:
  created:
    - "supabase/functions/send-message-notification/index.ts"
    - "supabase/migrations/150_message_notification_trigger.sql"
  modified:
    - "FEATURES.md"

key-decisions:
  - "Migration numbered 150 (not 149 as planned) because 149_marketplace_award_payment.sql already existed"
  - "Vault secrets pattern (not current_setting) for Edge Function URL and service role key, matching existing trigger pattern from migration 033"
  - "Sender name resolved from medics table first (first_name + last_name), falling back to profiles.full_name, then 'Someone'"
  - "Direct messages: medic_id resolved to user_id for comparison with sender_id to determine recipient"

patterns-established:
  - "Message notification trigger: pg_net async HTTP from AFTER INSERT trigger, non-blocking to INSERT transaction"
  - "GDPR push notification: only sender name in body, deep link data in payload.data, never message content"
  - "Token cleanup: DeviceNotRegistered responses from Expo Push API trigger profiles.push_token = NULL"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 43 Plan 03: Server-Side Push Notification Pipeline Summary

**PostgreSQL AFTER INSERT trigger on messages table invokes Deno Edge Function that sends GDPR-safe push notifications ("New message from [Name]") via Expo Push API, with DeviceNotRegistered token cleanup**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T04:35:10Z
- **Completed:** 2026-02-20T04:37:30Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Edge Function resolves sender name and recipient tokens, sends GDPR-safe push via Expo Push API
- Database trigger fires asynchronously on every message INSERT via pg_net (non-blocking)
- Both direct (1:1) and broadcast messages trigger push notifications
- Invalid device tokens cleaned up automatically on DeviceNotRegistered error
- Sender never receives their own notification

## Task Commits

Each task was committed atomically:

1. **Task 1: Edge Function for GDPR-safe push notification delivery** - `9b77547` (feat)
2. **Task 2: Database trigger on messages INSERT to invoke Edge Function** - `cfd1c42` (feat)

## Files Created/Modified
- `supabase/functions/send-message-notification/index.ts` - Deno Edge Function: accepts message details from trigger, resolves sender name (medics > profiles > fallback), determines recipients (direct: other participant, broadcast: all org members except sender), sends GDPR-safe push via Expo Push API with 100-token batching, cleans up DeviceNotRegistered tokens
- `supabase/migrations/150_message_notification_trigger.sql` - PostgreSQL AFTER INSERT trigger on messages table, calls Edge Function via pg_net with Vault secrets authentication, passes message_id/conversation_id/sender_id/org_id only (never content)
- `FEATURES.md` - Added Phase 43 complete documentation with Plans 01-03 feature tables

## Decisions Made
- **Migration number 150:** Plan specified 149 but that was already taken by marketplace_award_payment.sql. Used 150 as next available number.
- **Vault secrets pattern:** Used `vault.decrypted_secrets` for project_url and service_role_key (matching migration 033 RIDDOR trigger pattern), not `current_setting('app.*')`.
- **Sender name resolution order:** Check medics table first (has separate first_name/last_name), fall back to profiles.full_name (admins), then "Someone" as final fallback.
- **Medic user_id lookup:** For direct conversations, look up medic's user_id from medics table to compare with sender_id (conversation.medic_id is the medics table ID, not auth.users ID).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration numbered 150 instead of 149**
- **Found during:** Task 2 (Database trigger creation)
- **Issue:** Plan specified migration 149 but `149_marketplace_award_payment.sql` and `149b_remainder_charge_cron.sql` already exist
- **Fix:** Used migration number 150 as next available
- **Files modified:** `supabase/migrations/150_message_notification_trigger.sql` (filename)
- **Verification:** `ls supabase/migrations/ | sort | tail -5` confirms 150 follows sequence
- **Committed in:** cfd1c42 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor filename change only. No functional difference.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The Edge Function uses existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (auto-provided by Supabase) and optionally `EXPO_ACCESS_TOKEN` (already configured from existing notification-service). Vault secrets `project_url` and `service_role_key` must already be set (required by existing triggers like migration 033).

## Next Phase Readiness
- Push notification pipeline complete for both direct and broadcast messages
- Phase 44 (Broadcast Messaging) can build on this -- broadcast messages will automatically trigger push notifications to all org members
- Production deployment requires: apply migration 150, deploy send-message-notification Edge Function, verify Vault secrets are configured

---
*Phase: 43-real-time-push-notifications*
*Completed: 2026-02-20*
