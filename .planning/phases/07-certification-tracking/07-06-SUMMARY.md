---
phase: 07-certification-tracking
plan: 06
subsystem: infra
tags: [edge-functions, email, certification, compliance, personalization]

# Dependency graph
requires:
  - phase: 07-02
    provides: Certification expiry checker Edge Function with email templates
provides:
  - Real organization name in all certification expiry emails (medic and manager)
  - Corrected organizations table field reference (name vs company_name)
  - Professional email branding with actual org name
affects: [07-certification-tracking, compliance-reporting, customer-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [Organization data lookup for email personalization]

key-files:
  created: []
  modified:
    - supabase/functions/certification-expiry-checker/index.ts

key-decisions:
  - "Query organizations.name once per certification for all related emails"
  - "Separate org query variables for medic vs manager emails to avoid scope confusion"
  - "Graceful fallback to 'Your Organization' when org query returns null"

patterns-established:
  - "Email personalization pattern: query org data before email send, pass to template"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 7 Plan 06: Gap Closure - Real Org Name in Certification Emails Summary

**Certification expiry emails now show real organization name from organizations.name field instead of hardcoded 'Your Organization'**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-17T01:21:19Z
- **Completed:** 2026-02-17T01:23:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added organization name query before medic reminder email send
- Fixed incorrect company_name field reference to correct name field in manager notifications
- Fixed incorrect company_name field reference in expired certification notifications
- All 3 email code paths (medic reminder, manager critical, manager expired) now use organizations.name
- Zero instances of incorrect company_name field remain in the file

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace hardcoded org name with real org query in certification expiry checker** - `39748f6` (fix)

## Files Created/Modified
- `supabase/functions/certification-expiry-checker/index.ts` - Added org name lookup for medic emails (line 77-81), corrected manager notification org queries from company_name to name (lines 137-142, 190-195)

## Decisions Made

1. **Separate org query variables**: Used `orgName`, `managerOrgName`, and `expiredOrgName` as distinct variables instead of reusing the same variable name - prevents scope confusion when reading code and makes it clear which org lookup applies to which email path.

2. **Query placement**: Added org query immediately before medic email send (after duplicate check) rather than at top of loop - ensures org query only runs when email will actually be sent, avoiding unnecessary database queries for already-reminded certifications.

3. **Field name correction**: Changed all `.select('company_name')` to `.select('name')` - the organizations table has a `name` field (per migration 00001_organizations.sql), not `company_name`. The company_name field exists on the clients table, not organizations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward field name correction and org query addition following established patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Email personalization complete:**
- All certification expiry emails (medic + manager) show real org name
- Professional branding in all email communications
- Foundation complete for Gap Closure Wave 1 (plans 05-08)

**Testing recommendation:**
- Verify email sends with actual organization names in test environment
- Confirm fallback to 'Your Organization' works when org_id is invalid/null

---
*Phase: 07-certification-tracking*
*Completed: 2026-02-17*
