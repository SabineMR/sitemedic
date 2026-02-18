---
phase: 23-analytics-heat-maps-and-trend-charts
plan: 01
subsystem: database
tags: [supabase, postgres, rls, edge-function, compliance, upsert]

# Dependency graph
requires:
  - phase: 18-vertical-infrastructure
    provides: compliance_score_history table (migration 124) with RLS enabled and org-member SELECT policy
  - phase: 05-pdf-generation
    provides: generate-weekly-report Edge Function with fetchWeeklyReportData and complianceScore object
provides:
  - UNIQUE INDEX on compliance_score_history(org_id, vertical, period_start) for idempotent upserts
  - Platform admin SELECT RLS policy on compliance_score_history for cross-org trend queries
  - Compliance score writer in generate-weekly-report — populates compliance_score_history on every weekly run
  - Formula v1: numeric 0-100 score with penalty weights for 4 compliance factors
affects:
  - 23-analytics-heat-maps-and-trend-charts (plans 23-04, 23-05 read from compliance_score_history)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-blocking side-effect upsert: compliance score persisted after data fetch, failure logged but does not interrupt primary operation (PDF generation)"
    - "Formula version in JSONB details: formula_version stored in details JSONB field (not a column) so historical rows remain interpretable after formula changes"
    - "Idempotent weekly run: onConflict='org_id,vertical,period_start' makes re-running same week a no-op (upsert replaces, not duplicates)"

key-files:
  created:
    - supabase/migrations/130_compliance_score_history_index_and_rls.sql
  modified:
    - supabase/functions/generate-weekly-report/index.tsx

key-decisions:
  - "formula_version stored in details JSONB, not as a column — table schema from migration 124 has no formula_version column; JSONB details field is the correct storage location"
  - "vertical='general' as org-wide sentinel — NOT NULL constraint on vertical column; 'general' is the agreed sentinel for org-wide (non-vertical-specific) compliance"
  - "Non-blocking upsert — compliance score failure must not prevent weekly report PDF delivery; error logged, execution continues"
  - "Period start computed from weekEnding minus 7 days — matches the query window in fetchWeeklyReportData; consistent week boundary semantics"

patterns-established:
  - "Formula v1 penalty weights: dailyCheckDone=40, riddorDeadlines=30, overdueFollowups=20, expiredCerts=10 (total 100)"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 23 Plan 01: Compliance Score History — Migration 130 + Weekly Report Writer Summary

**Migration 130 drops the redundant composite index and adds UNIQUE + platform admin RLS on compliance_score_history; generate-weekly-report now upserts formula v1 numeric score (0-100) with JSONB details on every weekly run**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-18T05:24:47Z
- **Completed:** 2026-02-18T05:25:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migration 130 drops `compliance_score_history_period_idx` (non-unique from migration 124) and replaces with `compliance_score_history_period_unique` UNIQUE INDEX on `(org_id, vertical, period_start)` — enables idempotent upserts
- Platform admin SELECT policy added via `is_platform_admin()` function — allows cross-org compliance trend queries needed in plan 23-05
- `generate-weekly-report` now persists a numeric compliance score (0-100) after each `fetchWeeklyReportData` call, before PDF rendering — non-blocking, failure logs only
- Formula v1: starts at 100, deducts 40 (no daily check), 30 (RIDDOR deadline), 20 (overdue followup), 10 (expired certs); all factors plus `formula_version: 'v1'` stored in `details` JSONB

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 130** - `7d660d0` (feat)
2. **Task 2: Add compliance score upsert to Edge Function** - `52d646f` (feat)

**Plan metadata:** see final docs commit

## Files Created/Modified
- `supabase/migrations/130_compliance_score_history_index_and_rls.sql` - Drop redundant index, create UNIQUE index, create platform admin RLS policy
- `supabase/functions/generate-weekly-report/index.tsx` - Compliance score upsert block between fetchWeeklyReportData and renderToBuffer

## Decisions Made
- `formula_version` stored in `details` JSONB (not a column) — migration 124 table has no `formula_version` column; JSONB bag is the correct approach per STATE.md decision
- `vertical = 'general'` as the org-wide sentinel — NOT NULL constraint requires a value; 'general' agreed as non-vertical-specific compliance sentinel
- Non-blocking upsert — PDF delivery is the primary operation; compliance score persistence is a side-effect that must not block the report
- `onConflict = 'org_id,vertical,period_start'` — matches the UNIQUE INDEX from Task 1; re-running for the same week is idempotent (updates score, not duplicates)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `compliance_score_history` is now populated on every weekly report run — data foundation is ready for plans 23-04 (trend chart query) and 23-05 (heat map API)
- Platform admin SELECT policy enables cross-org analytics without bypassing RLS
- Formula v1 is frozen; `formula_version` in JSONB details means historical rows remain interpretable if formula changes in future

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
