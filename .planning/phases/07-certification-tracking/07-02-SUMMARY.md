---
phase: 07-certification-tracking
plan: 02
subsystem: infra
tags: [edge-functions, cron, email, resend, certification, compliance]

# Dependency graph
requires:
  - phase: 07-01
    provides: Certification tracking database infrastructure (GIN index, audit table, RPC functions)
provides:
  - Daily automated certification expiry checker
  - Progressive email reminders (30/14/7/1 days before expiry)
  - Duplicate prevention via audit table
  - Manager escalation at critical stages
affects: [07-03-certification-dashboard, compliance-reporting, medic-retention]

# Tech tracking
tech-stack:
  added: [Resend email API, pg_cron scheduler, Deno Edge Functions]
  patterns: [Progressive reminder system, Batch resilient processing, Vault-authenticated cron jobs]

key-files:
  created:
    - supabase/functions/certification-expiry-checker/index.ts
    - supabase/functions/certification-expiry-checker/email-templates.ts
    - supabase/migrations/032_certification_expiry_cron.sql
  modified: []

key-decisions:
  - "Progressive email reminders at 30/14/7/1 days before expiry with urgency-based color coding"
  - "Site managers notified at critical stages only (14/7/1 days) to avoid email fatigue"
  - "Expired certifications (0 days) trigger immediate manager notification"
  - "Batch resilient: individual email failures don't stop processing other certifications"

patterns-established:
  - "Edge Function + pg_cron pattern for daily compliance checks"
  - "Duplicate prevention via audit table checking before sending"
  - "Progressive urgency escalation with color-coded emails"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 7 Plan 02: Certification Expiry Checker Engine Summary

**Daily automated certification expiry checker with progressive 4-stage reminders (30/14/7/1 days), duplicate prevention, and manager escalation at critical stages**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-17T00:40:21Z
- **Completed:** 2026-02-17T00:42:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Edge Function checking all 4 reminder stages with duplicate prevention
- Professional SiteMedic-branded emails with urgency-appropriate styling
- pg_cron daily scheduler using vault authentication
- Manager escalation at 14/7/1 day stages (not just medics)
- Expired certification notifications (0 days) to managers
- Batch resilience: individual failures don't stop processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create certification expiry checker Edge Function** - `1765884` (feat)
2. **Task 2: Create pg_cron migration for daily scheduling** - `7e6fc54` (feat)

## Files Created/Modified
- `supabase/functions/certification-expiry-checker/email-templates.ts` - Professional branded email templates with progressive urgency colors (red/amber/blue)
- `supabase/functions/certification-expiry-checker/index.ts` - Daily checker iterating 4 reminder stages, duplicate prevention, manager escalation logic
- `supabase/migrations/032_certification_expiry_cron.sql` - pg_cron daily job at 09:00 UTC invoking Edge Function via vault-authenticated HTTP POST

## Decisions Made

1. **Progressive urgency styling**: Red background for 1 day (CRITICAL), amber for 7 days (URGENT), blue for 14/30 days (Important/Reminder) - matches user expectations for urgency visual hierarchy

2. **Manager notification timing**: Only notify managers at 14/7/1 day stages (not 30 days) - prevents email fatigue while ensuring timely escalation for business-critical expiries

3. **Expired notification workflow**: 0-day expiry check sends notification ONLY to managers (not medics) - assumes medic already received 4 prior reminders; manager needs immediate action awareness

4. **Batch resilience pattern**: Individual email failures logged but don't stop processing - ensures one Resend API failure doesn't block all other reminder sends

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Edge Function and cron migration followed established RIDDOR deadline checker pattern precisely.

## User Setup Required

None - no external service configuration required (Resend API key already configured in Phase 6).

## Next Phase Readiness

**Ready for Phase 07-03 (Certification Dashboard):**
- Backend certification expiry engine operational
- Email reminders sending daily at 09:00 UTC
- Audit trail in certification_reminders table
- Dashboard can query certification_reminders for "last reminded" timestamps
- Manager escalation working for critical stages

**Foundation complete for:**
- UI dashboard showing expiring certifications
- Admin compliance reporting
- Medic retention workflows (proactive renewal assistance)

---
*Phase: 07-certification-tracking*
*Completed: 2026-02-17*
