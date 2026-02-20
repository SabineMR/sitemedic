---
phase: 38-notifications-alerts
plan: 03
subsystem: api
tags: [notifications, sms, email, twilio, resend, fan-out, haversine, webhooks, supabase]

requires:
  - phase: 38-01
    provides: user_notifications table, createNotification utility, SMS utility, notification types, marketplace_notification_preferences
  - phase: 35-02
    provides: Stripe webhook handler for marketplace deposit
  - phase: 36-01
    provides: job_ratings table and ratings API route
  - phase: 36-02
    provides: marketplace messaging routes and conversations
  - phase: 36-03
    provides: disputes routes and cancellation routes

provides:
  - fanOutNewEventNotifications: notifies all verified companies on new event post (dashboard always, email/SMS radius-filtered)
  - Quote triggers: quote_received to poster on submission, quote_awarded to winner on intent
  - Payment triggers: quote_awarded + quote_rejected + payment_received in Stripe webhook on deposit success; payment_failed on remainder failure
  - rating_received: other party notified on rating submission
  - message_received: recipient dashboard notification on marketplace message
  - dispute_filed: other party notified on dispute creation
  - dispute_resolved: BOTH parties notified via createBulkNotifications on resolution
  - event_cancelled: all quoting companies notified on cancellation
  - rating_nudge: dashboard notification alongside email in cron job

affects:
  - 38-02 (notification feed reads from user_notifications rows created here)
  - 38-04 (notification preferences control email/SMS sent here)

tech-stack:
  added: ["twilio (web-marketplace package)"]
  patterns:
    - "Fire-and-forget notifications: void fn() or .catch() — NEVER await in API response path"
    - "Service-role client for cross-user inserts: createClient(url, serviceKey) for user_notifications rows"
    - "Inline INSERT for web-marketplace routes (can't import from web/lib)"
    - "createBulkNotifications for multi-recipient fan-outs (award/cancel/dispute-resolve)"
    - "Haversine radius filter on email/SMS only — dashboard notifications never radius-filtered"
    - "Per-company try/catch in fan-out loop: one company failure never blocks others"

key-files:
  created:
    - web/lib/marketplace/event-fan-out.ts
    - web-marketplace/lib/marketplace/event-fan-out.ts
  modified:
    - web-marketplace/app/api/marketplace/events/route.ts
    - web-marketplace/app/api/marketplace/quotes/submit/route.ts
    - web-marketplace/app/api/marketplace/quotes/[id]/award/route.ts
    - web/app/api/stripe/webhooks/route.ts
    - web/app/api/marketplace/events/[id]/ratings/route.ts
    - web/app/api/marketplace/messages/send/route.ts
    - web/app/api/marketplace/events/[id]/dispute/route.ts
    - web/app/api/marketplace/disputes/[id]/resolve/route.ts
    - web/app/api/marketplace/events/[id]/cancel/route.ts
    - web/app/api/cron/rating-nudges/route.ts

key-decisions:
  - "Dashboard notifications never radius-filtered; email/SMS filtered by event_alert_radius_miles (Haversine)"
  - "SMS daily cap checked via count of new_event notifications since start of day (< 5 allowed)"
  - "quote_awarded notification sent at award-intent time (PaymentIntent created), NOT just on deposit success — gives company earliest possible notice"
  - "Definitive quote_awarded/rejected/payment_received also sent in Stripe webhook where status changes actually occur"
  - "Inline supabase.from('user_notifications').insert() for web-marketplace routes — cannot import from web/lib"
  - "web-marketplace event-fan-out inlines its own SMS helper to avoid cross-package Twilio import"
  - "twilio added to web-marketplace package.json (Rule 3 auto-fix — required for fan-out SMS)"
  - "dispute_filed notification: filer-type determines recipient (client->company admin, company->event poster)"
  - "dispute_resolved: createBulkNotifications to BOTH parties; emails sent to each separately"
  - "event_cancelled: all quoting companies notified (not just awarded company)"
  - "cancel route also notifies event poster if cancelled by company (reverse notification)"

patterns-established:
  - "Fan-out pattern: fetch all targets -> build message once -> loop with per-target try/catch"
  - "Radius filter: check prefs.event_alert_radius_miles + event.location_coordinates; skip email/SMS if distance exceeds radius; fallback notify if no company location"
  - "Notification body lookup pattern: fetch event/company/profile inside notification try/catch so lookup failures don't propagate"

duration: 8min
completed: 2026-02-20
---

# Phase 38 Plan 03: Notification Triggers Summary

**Event fan-out module with Haversine radius filtering plus notification triggers wired into all 10+ marketplace API routes covering every user-facing action**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T23:19:35Z
- **Completed:** 2026-02-20T23:27:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Created `fanOutNewEventNotifications` in both web and web-marketplace apps — fetches all verified companies, respects radius prefs via Haversine, sends dashboard + email + SMS (urgency-triggered) fire-and-forget
- Wired `quote_received`, `quote_awarded`, `quote_rejected`, `payment_received`, `payment_failed` triggers into quote submission, award, and Stripe webhook routes
- Wired `rating_received`, `message_received`, `dispute_filed`, `dispute_resolved`, `event_cancelled`, `rating_nudge` into remaining marketplace routes

## Task Commits

1. **Task 1: Event fan-out module and event posting trigger** - `32551e6` (feat)
2. **Task 2: Marketplace action notification triggers in existing API routes** - `cfc0e8b` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `web/lib/marketplace/event-fan-out.ts` - Fan-out: dashboard (all), email (radius-filtered), SMS (urgent/high-value + radius-filtered)
- `web-marketplace/lib/marketplace/event-fan-out.ts` - Mirror with inline Twilio (no web/lib import)
- `web-marketplace/app/api/marketplace/events/route.ts` - Added void fanOutNewEventNotifications() on POST when status=open
- `web-marketplace/app/api/marketplace/quotes/submit/route.ts` - quote_received → event poster on submission
- `web-marketplace/app/api/marketplace/quotes/[id]/award/route.ts` - quote_awarded → company on award intent (both Stripe and mock paths)
- `web/app/api/stripe/webhooks/route.ts` - quote_awarded + payment_received (both parties) + quote_rejected (losers) on deposit success; payment_failed on remainder failure
- `web/app/api/marketplace/events/[id]/ratings/route.ts` - rating_received → other party on submission
- `web/app/api/marketplace/messages/send/route.ts` - message_received → recipient as dashboard notification
- `web/app/api/marketplace/events/[id]/dispute/route.ts` - dispute_filed → other party with proper lookup
- `web/app/api/marketplace/disputes/[id]/resolve/route.ts` - dispute_resolved → BOTH parties via createBulkNotifications
- `web/app/api/marketplace/events/[id]/cancel/route.ts` - event_cancelled → all quoting companies + poster if company cancels
- `web/app/api/cron/rating-nudges/route.ts` - rating_nudge dashboard notification alongside email

## Decisions Made

- Dashboard notifications NEVER radius-filtered; email/SMS radius-filtered via Haversine against event_alert_radius_miles
- SMS daily cap: count new_event notifications since start of day, skip if >= 5
- quote_awarded sent at award intent (PaymentIntent create) AND again definitively in webhook
- Inline service-role client insert for web-marketplace routes (cross-package import not possible)
- twilio added to web-marketplace dependencies (needed for inline SMS in fan-out)
- dispute_filed/resolved notifications: proper recipient lookup from awarded quote's company

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added twilio to web-marketplace package.json**

- **Found during:** Task 1 (web-marketplace event-fan-out.ts)
- **Issue:** web-marketplace could not import twilio — missing from package.json, TypeScript error
- **Fix:** `pnpm add twilio` in web-marketplace
- **Files modified:** web-marketplace/package.json, web-marketplace/pnpm-lock.yaml
- **Verification:** `tsc --noEmit` passes for event-fan-out.ts
- **Committed in:** `cfc0e8b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking dependency)
**Impact on plan:** Essential for fan-out SMS functionality. No scope creep.

## Issues Encountered

- dispute route uses `/api/marketplace/events/[id]/dispute` (not `/api/marketplace/disputes`) for filing — plan listed wrong path for "dispute_filed" route. Found the actual filing route and used it. No impact on implementation.

## Next Phase Readiness

- All notification triggers are live — every marketplace action now creates dashboard notifications
- Plan 02 (notification feed UI) can display real notifications created by this plan
- Plan 04 (notification preferences) UI controls what gets sent by this plan
- No blockers for remaining plans in phase 38

---
*Phase: 38-notifications-alerts*
*Completed: 2026-02-20*
