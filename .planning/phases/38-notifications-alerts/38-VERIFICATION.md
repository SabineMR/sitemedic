---
phase: 38-notifications-alerts
verified: 2026-02-20T23:32:48Z
status: passed
score: 5/5 must-haves verified
gaps: []
human_verification:
  - test: "Open dashboard and confirm NotificationBell appears in header next to the message badge"
    expected: "Bell icon visible with no badge when 0 unread; badge shows count when notifications exist"
    why_human: "Visual appearance of header layout cannot be verified programmatically"
  - test: "Post a new event (status=open) and wait 5 seconds, then check a different medic company's notification bell"
    expected: "Bell badge increments by 1 and a 'New event: ...' item appears in the dropdown without page refresh"
    why_human: "Supabase Realtime fan-out behaviour requires a live app and two browser sessions"
  - test: "In Notification Preferences, enter +447700900123, tick the consent checkbox, enable SMS for New Events, save — then confirm sms_opted_in_at is recorded"
    expected: "Preferences save successfully; sms_opted_in_at displayed in the form UI with today's date"
    why_human: "PECR audit trail requires verifying both UI state and database state"
  - test: "Post a high-value event (budget_max > £2,000) and verify an SMS is logged in server console"
    expected: "[SMS DEV MODE] or actual Twilio delivery log appears in Next.js server output"
    why_human: "SMS delivery pathway requires live server logs or Twilio dashboard inspection"
---

# Phase 38: Notifications & Alerts Verification Report

**Phase Goal:** Medics receive timely notifications about matching events through their preferred channels, and all marketplace actions (quotes, awards, payments, ratings, messages) generate appropriate alerts
**Verified:** 2026-02-20T23:32:48Z
**Status:** passed
**Re-verification:** No — initial verification

## Scope Note: Qualification Filtering

ROADMAP success criterion 1 states "matching medics see it in their dashboard feed filtered by location and qualifications." However, `38-CONTEXT.md` (the authoritative implementation decision document) explicitly states:

> "All verified companies see all events — no qualification-based filtering. Companies self-select based on their capabilities. Notification preferences (event type, location radius) control which alerts fire, not visibility"

This was a deliberate product decision to maximise marketplace discovery. The implementation correctly follows the CONTEXT, not the loosely-worded ROADMAP criterion. Verification is performed against the implemented design.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a new event is posted, all verified companies receive a dashboard notification | VERIFIED | `fanOutNewEventNotifications` queries `verification_status='verified' AND can_browse_events=true`, calls `createNotification` per company unconditionally (lines 105-211 of `event-fan-out.ts`) |
| 2 | Matching medics receive email alerts with event summary (no client contact details) when new events are posted | VERIFIED | Email template in fan-out sends event_name, event_type, location, budget — no client name/phone/email fields present. Filtered by `email_new_events !== false` (default true) and optional radius |
| 3 | Urgent or high-value events (<7 days OR >2,000 GBP) trigger SMS alerts to opted-in medics | VERIFIED | `isUrgent` and `isHighValue` flags computed at lines 122-126; `triggerSMS = isUrgent \|\| isHighValue`; SMS gated by `sms_new_events === true`, `sms_phone_number` set, daily cap < 5; `sendSMS` called |
| 4 | All marketplace actions generate appropriate notifications through preferred channels | VERIFIED | All 12 notification types wired: quote_received, quote_awarded, quote_rejected (Stripe webhook), payment_received, payment_failed, rating_received, message_received, dispute_filed, dispute_resolved, event_cancelled, rating_nudge |
| 5 | Medics can configure notification preferences (channels, event types, location radius) | VERIFIED | `NotificationPreferencesForm` at `/dashboard/marketplace/settings/notifications` — 7-row channel x category matrix, SMS opt-in with PECR consent checkbox, event alert radius input; saved via PUT `/api/marketplace/notification-preferences` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Lines | Exists | Substantive | Wired | Status |
|----------|-------|--------|-------------|-------|--------|
| `supabase/migrations/159_user_notifications.sql` | 108 | YES | YES — 12-type CHECK, RLS (3 policies), Realtime, REPLICA IDENTITY FULL | YES — referenced in app code via `user_notifications` table | VERIFIED |
| `supabase/migrations/160_marketplace_notification_preferences.sql` | 103 | YES | YES — 7 email cols (TRUE), 4 SMS cols (FALSE), sms_opted_in_at, event_alert_radius_miles | YES — referenced in fan-out and preferences API | VERIFIED |
| `web/lib/marketplace/sms.ts` | 67 | YES | YES — Twilio v5 client, dev-mode fallback returning `dev-mode-mock-sid` | YES — imported in `event-fan-out.ts` | VERIFIED |
| `web/lib/marketplace/notification-types.ts` | 95 | YES | YES — NOTIFICATION_TYPES const (12), NotificationType union, NOTIFICATION_CATEGORIES, UserNotification, NotificationPreferences interfaces | YES — imported in hooks, components, API routes | VERIFIED |
| `web/lib/marketplace/create-notification.ts` | 112 | YES | YES — service-role client via SUPABASE_SERVICE_ROLE_KEY, createNotification + createBulkNotifications, never throws | YES — imported in 8+ API routes | VERIFIED |
| `web/lib/marketplace/event-fan-out.ts` | 309 | YES | YES — fanOutNewEventNotifications, Haversine distance, email + SMS + dashboard paths, SMS daily cap, per-company try/catch | YES — imported in `web-marketplace/app/api/marketplace/events/route.ts` | VERIFIED |
| `web-marketplace/lib/marketplace/event-fan-out.ts` | 336 | YES | YES — local mirror with inline SMS helper; same logic as web version | YES — imported as `@/lib/marketplace/event-fan-out` (resolves to web-marketplace local) | VERIFIED |
| `web/lib/queries/notifications.hooks.ts` | 177 | YES | YES — useNotifications, useUnreadCount, useRealtimeNotifications (postgres_changes INSERT+UPDATE), useMarkNotificationsRead | YES — imported in NotificationBell + notifications page | VERIFIED |
| `web/components/dashboard/NotificationBell.tsx` | 173 | YES | YES — Bell icon, Popover dropdown, 5-notification preview, unread badge (99+ cap), mark-all-as-read | YES — imported in `web/app/(dashboard)/layout.tsx` line 28 + line 125 | VERIFIED |
| `web/app/(dashboard)/dashboard/notifications/page.tsx` | 208 | YES | YES — full notification history, load-more pagination (PAGE_SIZE=20), per-item mark-as-read, empty state | YES — linked from NotificationBell "View all" footer | VERIFIED |
| `web/app/api/marketplace/notifications/route.ts` | 88 | YES | YES — GET with limit/offset/unread_only, range guard (limit > 0 check), unread_count aggregate | YES — called by useNotifications + useUnreadCount hooks | VERIFIED |
| `web/app/api/marketplace/notifications/mark-read/route.ts` | 100 | YES | YES — PATCH with mark_all + notification_ids, user_id ownership validation | YES — called by useMarkNotificationsRead mutation | VERIFIED |
| `web/app/api/marketplace/notification-preferences/route.ts` | 227 | YES | YES — GET (PGRST116 auto-upsert), PUT (Zod validation, +447 regex, PECR sms_opted_in_at management) | YES — called by NotificationPreferencesForm | VERIFIED |
| `web/components/dashboard/NotificationPreferencesForm.tsx` | 546 | YES | YES — 7-row matrix, Dashboard always-on, Email + SMS toggles, PECR consent checkbox, radius input | YES — imported in notifications settings page | VERIFIED |
| `web/app/(dashboard)/dashboard/marketplace/settings/notifications/page.tsx` | 49 | YES | YES — wraps NotificationPreferencesForm with header and back link | YES — routes to this page exist in Next.js App Router | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `web-marketplace/app/api/marketplace/events/route.ts` | `web-marketplace/lib/marketplace/event-fan-out.ts` | `void fanOutNewEventNotifications(...)` — fire-and-forget, no await | WIRED | Line 153: `void fanOutNewEventNotifications({...})` called only when `!saveAsDraft` (status=open) |
| `event-fan-out.ts` (web) | `create-notification.ts` | `createNotification()` per company | WIRED | Line 197: `await createNotification({userId: company.admin_user_id, type: NOTIFICATION_TYPES.NEW_EVENT, ...})` |
| `event-fan-out.ts` (web) | `sms.ts` | `sendSMS()` for urgent/high-value | WIRED | Lines 279-282: `await sendSMS({to: prefs.sms_phone_number, body: smsBody.slice(0, 160)})` — gated by triggerSMS + opt-in + daily cap |
| `create-notification.ts` | `user_notifications` table | service-role Supabase INSERT | WIRED | Lines 65-72: `supabase.from('user_notifications').insert({user_id, type, title, body, link, metadata})` using `SUPABASE_SERVICE_ROLE_KEY` client |
| `NotificationBell.tsx` | `notifications.hooks.ts` | `useNotifications`, `useUnreadCount`, `useRealtimeNotifications`, `useMarkNotificationsRead` | WIRED | Lines 21-25: all 4 hooks imported and called in component body |
| `web/app/(dashboard)/layout.tsx` | `NotificationBell.tsx` | Component import + userId prop | WIRED | Line 28 import, line 125: `<NotificationBell userId={user.id} />` placed before UnreadBadge |
| `notifications.hooks.ts` | `user_notifications` table | Supabase Realtime postgres_changes | WIRED | Lines 101-130: channel subscribed to INSERT + UPDATE events filtered by `user_id=eq.${userId}` |
| `NotificationPreferencesForm.tsx` | `/api/marketplace/notification-preferences` | `fetch GET` on mount, `fetch PUT` on save | WIRED | Line 153: GET on mount; Line 279: PUT on save with full payload |
| `web-marketplace/quotes/submit/route.ts` | `user_notifications` table | inline service-role INSERT | WIRED | Lines 290-302: inline `srClient.from('user_notifications').insert({type: 'quote_received', ...})` |
| `web-marketplace/quotes/[id]/award/route.ts` | `user_notifications` table | inline INSERT for winner (both paths) | WIRED | Lines 279-292 + 326-339: `quote_awarded` inserted in both Stripe and mock payment paths |
| `web/app/api/stripe/webhooks/route.ts` | `create-notification.ts` | `createNotification` + `createBulkNotifications` | WIRED | Line 25 import; lines 365/383/393 for payment_received; lines 592-594 for payment_failed; lines 427 for quote_rejected losers |
| `web/app/api/marketplace/events/[id]/ratings/route.ts` | `create-notification.ts` | `createNotification` for rating_received | WIRED | Line 23 import; line 353: `createNotification({type: 'rating_received', ...})` |
| `web/app/api/marketplace/messages/send/route.ts` | `create-notification.ts` | `createNotification` for message_received | WIRED | Line 13 import; line 137: `createNotification({type: 'message_received', ...})` — fire-and-forget (no await, createNotification never throws) |
| `web/app/api/marketplace/events/[id]/dispute/route.ts` | `create-notification.ts` | `createNotification` for dispute_filed | WIRED | Line 22 import; line 310: `createNotification({type: 'dispute_filed', ...})` |
| `web/app/api/marketplace/disputes/[id]/resolve/route.ts` | `create-notification.ts` | `createBulkNotifications` for both parties | WIRED | Line 19 import; line 297: `createBulkNotifications(resolveNotifs)` — BOTH parties notified |
| `web/app/api/marketplace/events/[id]/cancel/route.ts` | `create-notification.ts` | `createBulkNotifications` for all quoting companies | WIRED | Line 23 import; line 344: `createBulkNotifications(cancelNotifs)` |
| `web/app/api/cron/rating-nudges/route.ts` | `create-notification.ts` | `createNotification` for rating_nudge | WIRED | Line 17 import; lines 131/154: `createNotification({type: 'rating_nudge', ...})` alongside email nudge |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| NOTIF-01 | New event listings trigger dashboard feed for medics (qualifications/location match) | SATISFIED | Dashboard notifications sent to all verified companies (`can_browse_events=true`). CONTEXT.md explicitly descoped qualification filtering — companies self-select. Location radius filters email/SMS only; dashboard is never filtered. |
| NOTIF-02 | Email alerts with event summary, no client contact details | SATISFIED | Email template includes event_name, event_type, location_display/postcode, budget_max. No client name/phone/email in template. Verified by code inspection of `event-fan-out.ts` lines 226-250. |
| NOTIF-03 | Urgent/high-value events trigger SMS to matching nearby medics | SATISFIED | isUrgent (< 7 days) and isHighValue (> £2000) computed; SMS sent via `sendSMS` when `sms_new_events=true`, phone set, within radius, daily cap < 5. Dev mode falls back to console.log. |
| NOTIF-04 | Quote, award, rejection, payment, rating, message events trigger notifications | SATISFIED | All 12 notification types wired: quote_received (submit route), quote_awarded (award + webhook), quote_rejected (webhook), payment_received (webhook), payment_failed (webhook), rating_received (ratings route), message_received (messages route), dispute_filed, dispute_resolved, event_cancelled, rating_nudge (cron). |
| NOTIF-05 | Medics can configure notification preferences (channels, event types, location radius) | SATISFIED | NotificationPreferencesForm at /dashboard/marketplace/settings/notifications — 7 email + 4 SMS toggles, PECR consent checkbox, E.164 phone validation, event alert radius (1-500 miles or null). GET auto-creates defaults via PGRST116 detection. PUT validates with Zod. |

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns found in any of the 15 key files. All files contain real implementations.

---

### Human Verification Required

#### 1. Dashboard Header Bell Appearance

**Test:** Load `/dashboard` as a logged-in marketplace user
**Expected:** Bell icon appears in the header between SidebarTrigger and UnreadBadge; no badge when 0 unread; red badge with count when unread notifications exist
**Why human:** Visual layout verification cannot be determined programmatically

#### 2. Realtime Fan-Out — Live Badge Update

**Test:** Open two browser sessions: Session A (event poster) and Session B (a verified company). In Session A, post a new event. In Session B, watch the notification bell.
**Expected:** Session B's bell badge increments within ~1 second without page refresh. New "New event: [name]" entry appears in the dropdown.
**Why human:** Supabase Realtime fan-out requires a live environment with actual database writes and WebSocket connections

#### 3. PECR SMS Opt-In — Audit Trail

**Test:** Navigate to `/dashboard/marketplace/settings/notifications`. Enter `+447700900123`, tick the consent checkbox, enable "New Events" SMS toggle, click "Save preferences".
**Expected:** "Preferences saved" confirmation appears. The `sms_opted_in_at` date displays in the form UI. Supabase row shows `sms_opted_in_at` populated with today's timestamp.
**Why human:** Requires verifying both UI feedback and database state; sms_opted_in_at is set server-side

#### 4. SMS Dev Mode Logging (or Production Twilio Delivery)

**Test:** Post an event with `budget_max > 2000` when a company has `sms_new_events=true` and a phone set. Check Next.js server console.
**Expected:** `[SMS DEV MODE] Would send to: +447... | SiteMedic: New event...` in server logs (without TWILIO_* env vars), or actual Twilio message SID in logs (with credentials)
**Why human:** Requires live server log inspection and a configured test environment

---

## Summary

Phase 38 fully achieves its goal. The notification system is implemented end-to-end:

**Foundation (Plan 01):** Both database migrations exist with correct RLS, Realtime publication, REPLICA IDENTITY FULL, and PECR-compliant SMS defaults. All three TypeScript utilities (sendSMS, notification-types, createNotification/createBulkNotifications) are substantive, correctly wired, and fire-and-forget.

**Dashboard Feed (Plan 02):** NotificationBell is wired into the dashboard layout with Supabase Realtime subscription. The full notifications page exists at `/dashboard/notifications`. Both API routes (GET with pagination, PATCH mark-read) are implemented. TanStack Query cache invalidation is correctly wired to Realtime INSERT and UPDATE events.

**Trigger Wiring (Plan 03):** All 12 notification types from the database CHECK constraint have active trigger points. Event fan-out is fire-and-forget (void call), Haversine radius filtering is implemented for email/SMS (dashboard never filtered), SMS daily cap of 5 is enforced, and each trigger in the Stripe webhook and API routes has individual try/catch. The web-marketplace cross-package import problem is resolved via local mirror with inline SMS helper.

**Preferences UI (Plan 04):** The 7-row channel x category matrix renders with Dashboard always-on, Email per category, and SMS for 4 time-sensitive categories. PECR consent flow (checkbox + E.164 phone validation + sms_opted_in_at server-side) is fully implemented. GET auto-creates defaults on first visit via PGRST116 detection.

The only open items are 4 human verification tests that require a live environment to confirm visual rendering, Realtime fan-out timing, and PECR audit trail database state.

---

_Verified: 2026-02-20T23:32:48Z_
_Verifier: Claude (gsd-verifier)_
