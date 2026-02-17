---
phase: 14-compliance-exports
plan: 01
subsystem: ui
tags: [supabase, pdf, payslips, next.js, react]

# Dependency graph
requires:
  - phase: 06.5-payments-payouts
    provides: payslips table with pdf_url and payslip_reference columns (migration 032)
provides:
  - Optimised payslip download: instant open via stored pdf_url, edge function fallback for older records
  - Payslip reference number displayed in medic payslips list
affects: [14-compliance-exports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-path download: check stored URL first (instant), fall back to edge function only when needed"
    - "Supabase LEFT join via payslip:payslips(id, pdf_url, payslip_reference) — no !inner so older timesheets without payslip records still load"
    - "Optional chaining on joined payslip row (row.payslip?.pdf_url) to guard null joins"

key-files:
  created: []
  modified:
    - web/app/medic/payslips/page.tsx

key-decisions:
  - "Use LEFT join (no !inner) for payslips join — timesheets pre-migration 032 have no payslip row and must still appear in the list"
  - "Path A (fast): window.open(pdf_url) directly if pdf_url exists — no edge function, no cold start"
  - "Path B (fallback): invoke generate-payslip-pdf edge function only when pdf_url is null (older records)"
  - "Signed URLs are 365 days — no need to regenerate on each download for recent payslips"

patterns-established:
  - "Stored-URL-first pattern: always check for pre-generated asset before invoking generation function"

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 14 Plan 01: Payslip Download Optimisation Summary

**Payslip download now uses stored pdf_url for instant open (no edge function cold start), falling back to generate-payslip-pdf only for pre-migration records without a stored URL**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-17T18:17:44Z
- **Completed:** 2026-02-17T18:22:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added LEFT join to payslips table in timesheets query, mapping pdf_url and payslip_reference onto each row
- Implemented two-path download: Path A (instant, direct window.open) when pdf_url exists; Path B (edge function fallback) for older payslips without a stored URL
- Payslip reference number displayed inline in the list row when available

## Task Commits

Each task was committed atomically:

1. **Task 1: Add payslips table join and optimise download logic** - `bb24617` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/app/medic/payslips/page.tsx` - Updated with payslips LEFT join, two-path download logic (fast path + fallback), payslip_reference display

## Decisions Made
- LEFT join chosen (not `!inner`) so timesheets created before migration 032 (no payslip row) still appear in the list
- Stored-URL-first pattern: check `pdf_url` before invoking edge function to avoid 3-5s cold starts for recent payslips
- `row.payslip?.pdf_url` optional chaining guards the null join case cleanly
- Signed URLs are 365 days intentionally — no change made to URL expiry

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `/admin` page prerender build failure exists in the codebase (confirmed by reverting changes and re-running build — same error). This is unrelated to the payslips page. The payslips page has zero TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Payslip fast-path download is live for all payslips with a stored pdf_url (post-migration 032 records)
- Older payslips continue to work via edge function fallback
- Plan 14-02 can proceed (next compliance export feature)

---
*Phase: 14-compliance-exports*
*Completed: 2026-02-17*
