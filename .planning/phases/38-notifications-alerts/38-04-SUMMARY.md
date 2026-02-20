---
phase: 38-notifications-alerts
plan: 04
subsystem: ui, api
tags: [notifications, preferences, sms, pecr, zod, react, typescript, supabase, switch]

# Dependency graph
requires:
  - phase: 38-01
    provides: marketplace_notification_preferences table + NotificationPreferences interface

provides:
  - GET /api/marketplace/notification-preferences — auto-creates defaults on first visit (upsert)
  - PUT /api/marketplace/notification-preferences — Zod-validated updates with PECR SMS opt-in logic
  - NotificationPreferencesForm component: channel x category matrix (7 email, 4 SMS columns)
  - Switch UI component (CSS-based, no additional Radix dep)
  - /dashboard/marketplace/settings/notifications page

affects:
  - Future phases needing notification preference checks (e.g. reading sms_phone_number before sending Twilio SMS)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Auto-create-on-first-GET via PGRST116 error code detection + upsert defaults
    - PECR SMS consent: sms_opted_in_at set on first SMS channel enable, cleared when all disabled
    - Channel x category matrix UI (Dashboard always-on greyed col, Email + SMS toggleable)
    - Client-side phone validation mirrors API Zod schema (+447xxxxxxxxx)

key-files:
  created:
    - web/app/api/marketplace/notification-preferences/route.ts
    - web/components/dashboard/NotificationPreferencesForm.tsx
    - web/components/ui/switch.tsx
    - web/app/(dashboard)/dashboard/marketplace/settings/notifications/page.tsx
  modified: []

key-decisions:
  - "GET auto-creates preferences on first visit using PGRST116 detection — no separate 'initialise' call needed"
  - "PECR: sms_opted_in_at set server-side when first SMS channel enabled; cleared when all disabled — server is the source of truth"
  - "Dashboard column always ON (greyed/disabled) — no preference column exists, pure UI enforcement"
  - "Switch component built as CSS-based (no @radix-ui/react-switch) — avoids adding dependency for a single component"
  - "SMS consent checkbox is local-only state (not sent to API) — opt-in timestamp managed server-side via channel state"

patterns-established:
  - "Notification preferences page: /dashboard/marketplace/settings/notifications"
  - "Switch usage: import from @/components/ui/switch, use checked + onCheckedChange props"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 38 Plan 04: Notification Preferences UI Summary

**Channel x category matrix preferences UI with PECR-compliant SMS opt-in, event radius filter, and GET/PUT API with auto-create defaults**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T23:21:02Z
- **Completed:** 2026-02-20T23:24:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Notification preferences API route with GET (auto-creates defaults via upsert on PGRST116) and PUT (Zod schema, +447 regex, PECR sms_opted_in_at management)
- NotificationPreferencesForm: 7-row category matrix with Dashboard (always-on/greyed), Email, and SMS columns; SMS opt-in section with phone input + consent checkbox; event radius input
- Settings page at /dashboard/marketplace/settings/notifications with clean header + back link
- CSS-based Switch component added to the UI library (no Radix dependency needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Notification preferences API route** - `5aa9131` (feat)
2. **Task 2: Notification preferences form and settings page** - `f5052eb` (feat)

**Plan metadata:** Included in final docs commit.

## Files Created/Modified

- `web/app/api/marketplace/notification-preferences/route.ts` - GET (auto-upsert defaults on PGRST116) + PUT (Zod validation, PECR sms_opted_in_at, E.164 UK phone regex)
- `web/components/dashboard/NotificationPreferencesForm.tsx` - Channel x category matrix, SMS opt-in with PECR consent checkbox, event alert radius, save/error states
- `web/components/ui/switch.tsx` - CSS toggle component matching shadcn/ui pattern; checked + onCheckedChange props
- `web/app/(dashboard)/dashboard/marketplace/settings/notifications/page.tsx` - Settings page wrapping the form

## Decisions Made

- **PGRST116 auto-create:** Supabase returns PGRST116 when `.single()` finds no rows. Detecting this code in GET to upsert defaults means users always get a preferences row on first load without a separate initialisation step.
- **PECR sms_opted_in_at server-side:** The timestamp is set/cleared by the PUT handler based on the effective SMS channel state after the update. The frontend only sends channel booleans; it never directly sets the timestamp. This keeps the consent audit trail tamper-resistant.
- **Dashboard column always ON:** There is no `dashboard_*` column in the schema — dashboard notifications are always delivered. The UI enforces this by rendering disabled greyed-out switches for the Dashboard column.
- **CSS Switch (no @radix-ui/react-switch):** The project already has 10 Radix packages; adding another for a single toggle is unnecessary. The CSS implementation is fully accessible (hidden checkbox + label with sr-only, aria-label on each Switch usage).
- **SMS categories limited to 4:** Only events, quotes, awards, payments are SMS-applicable (time-sensitive, actionable). Ratings, messages, and disputes are email-only per the spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript index error on FormState**
- **Found during:** Task 2 (NotificationPreferencesForm)
- **Issue:** `form[cat.emailField]` produced TS7053 because `FormState` extends `Omit<NotificationPreferences, 'user_id' | 'updated_at'>` but `cat.emailField` is typed as `keyof NotificationPreferences` — `updated_at` is excluded from FormState but still part of the key union.
- **Fix:** Cast `form` as `Record<string, unknown>` at the indexing sites; values still cast to `boolean` for Switch.
- **Files modified:** `web/components/dashboard/NotificationPreferencesForm.tsx`
- **Verification:** `tsc --noEmit --skipLibCheck` zero errors after fix.
- **Committed in:** `f5052eb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** TypeScript type narrowing fix only. No behaviour change.

## Issues Encountered

None beyond the TypeScript index type issue noted above.

## User Setup Required

None - no new external services required. This plan is pure UI and API. The marketplace_notification_preferences table was created in Plan 01.

## Next Phase Readiness

- **Plan 02 (Dashboard Feed) and Plan 03 (Trigger Wiring):** Both already complete per project state.
- **Phase 38 complete:** All 4 plans shipped. The notification system is fully operational end-to-end.
- **Production:** Apply supabase migrations 159 + 160 before enabling notifications in production.

---
*Phase: 38-notifications-alerts*
*Completed: 2026-02-20*
