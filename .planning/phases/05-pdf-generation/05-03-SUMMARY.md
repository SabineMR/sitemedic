---
phase: 05-pdf-generation
plan: 03
subsystem: automation, ui
tags: [pg_cron, pg_net, dashboard, reports, pdf, scheduled-jobs]

# Dependency graph
requires:
  - phase: 05-01
    provides: Edge Function for PDF generation with react-pdf renderer
  - phase: 05-02
    provides: Storage bucket, signed URLs, email delivery, weekly_reports table
  - phase: 04-01
    provides: Dashboard layout with sidebar navigation pattern
provides:
  - pg_cron scheduled job for automated Friday report generation
  - Dashboard Reports page with report history and download links
  - On-demand report generation capability
affects: [Phase 6 (user onboarding will reference reports), Phase 7 (audit trail will reference reports)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pg_cron scheduled jobs with pg_net HTTP invocation"
    - "Vault-based secret management for Edge Function authentication"
    - "60-second polling pattern for real-time report list updates"
    - "Card-based report list UI (simpler than DataTable for this use case)"

key-files:
  created:
    - supabase/migrations/016_weekly_report_cron.sql
    - web/lib/queries/reports.ts
    - web/components/dashboard/reports-list.tsx
    - web/app/(dashboard)/reports/page.tsx
  modified:
    - web/app/(dashboard)/layout.tsx

key-decisions:
  - "D-05-03-001: pg_cron job runs every Friday at 5 PM UTC (end of UK working day, captures all Friday data)"
  - "D-05-03-002: Vault secrets (project_url, service_role_key) for secure Edge Function invocation from pg_cron"
  - "D-05-03-003: Reports list as Card components instead of DataTable (simpler UI for chronological list)"
  - "D-05-03-004: 60-second polling interval for reports list (picks up newly generated reports automatically)"
  - "D-05-03-005: On-demand generation triggers browser download of PDF blob (no need to refetch list, polling handles it)"
  - "D-05-03-006: Manual trigger returns PDF as Blob via Edge Function response (different from cron trigger which returns JSON)"

patterns-established:
  - "Scheduled job pattern: pg_cron + pg_net + Vault secrets for authenticated Edge Function invocation"
  - "Reports UI pattern: Card-based list with metadata badges (trigger type, email status, file size, generation time)"
  - "Download pattern: Get fresh signed URL on demand, open in new tab for browser PDF handling"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 05 Plan 03: Automated Report Generation and Dashboard Summary

**pg_cron job schedules automated Friday report generation, dashboard Reports page provides download UI with on-demand generation capability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T05:09:20Z
- **Completed:** 2026-02-16T05:13:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- pg_cron scheduled job runs every Friday at 5 PM UTC to generate weekly safety reports
- Dashboard Reports page displays report history with download links and metadata
- On-demand report generation button triggers PDF download directly from Edge Function
- Reports list auto-refreshes every 60 seconds to pick up newly generated reports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pg_cron migration for Friday scheduling** - `f0d9dfe` (feat)
2. **Task 2: Build dashboard reports page with download and on-demand generation** - `24d2387` (feat)

## Files Created/Modified

- `supabase/migrations/016_weekly_report_cron.sql` - pg_cron scheduled job for Friday 5 PM UTC report generation
- `web/lib/queries/reports.ts` - Data fetching hooks for weekly reports with 60-second polling
- `web/components/dashboard/reports-list.tsx` - Report list component with download buttons and on-demand generation
- `web/app/(dashboard)/reports/page.tsx` - Reports page server component with initial data fetch
- `web/app/(dashboard)/layout.tsx` - Updated sidebar navigation to include Reports menu item

## Decisions Made

**D-05-03-001: pg_cron job runs every Friday at 5 PM UTC**
- Rationale: End of UK working day (5 PM UTC), ensures all Friday data is captured before generation

**D-05-03-002: Vault secrets (project_url, service_role_key) for secure Edge Function invocation**
- Rationale: Avoids hardcoding secrets in migration, follows Supabase best practice for pg_cron jobs

**D-05-03-003: Reports list as Card components instead of DataTable**
- Rationale: Simpler UI for chronological list, better visual hierarchy for metadata (trigger type, email status)

**D-05-03-004: 60-second polling interval for reports list**
- Rationale: Matches existing dashboard polling patterns (Plan 04-01), picks up newly generated reports automatically

**D-05-03-005: On-demand generation triggers browser download of PDF blob**
- Rationale: Immediate download UX, no need to refetch list (polling handles it within 60 seconds)

**D-05-03-006: Manual trigger returns PDF as Blob via Edge Function response**
- Rationale: Edge Function returns different response types based on trigger (cron=JSON, manual=PDF buffer per Plan 05-02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase functions.invoke API for PDF blob response**
- **Found during:** Task 2 (generating report from client)
- **Issue:** Plan specified `responseType: 'blob'` which doesn't exist in Supabase functions.invoke TypeScript API
- **Fix:** Removed responseType parameter, handled response as Blob or BlobPart with type assertion
- **Files modified:** web/lib/queries/reports.ts
- **Verification:** pnpm build passes, TypeScript compilation succeeds
- **Committed in:** 24d2387 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for TypeScript compilation. No functional changes to plan intent.

## Issues Encountered

**TypeScript compilation error with responseType:**
- Problem: Initial implementation used `responseType: 'blob'` which isn't a valid Supabase functions.invoke option
- Resolution: Removed parameter and handled response type checking in code (Blob or BlobPart cast)
- Impact: No functional change, just type handling for PDF blob response

## User Setup Required

**Vault secrets must be configured in Supabase Dashboard:**
See [05-USER-SETUP.md](./05-USER-SETUP.md) for:
- project_url secret (Supabase project URL)
- service_role_key secret (for Edge Function authentication from pg_cron)
- Verification: Check cron.job_run_details for successful executions after Friday 5 PM UTC

**Note:** Migration creates the job assuming secrets exist. Job will fail if secrets not configured.

## Next Phase Readiness

✅ **Ready for Phase 6 (RIDDOR Compliance):**
- Weekly report generation is fully automated (cron + manual triggers)
- Dashboard provides download UI for site managers
- Email delivery working (if RESEND_API_KEY configured)
- Reports table tracks all generated reports with metadata

**No blockers.** PDF generation pipeline complete:
1. ✅ Edge Function generates PDFs with compliance metrics (Plan 05-01)
2. ✅ Storage bucket with signed URLs and email delivery (Plan 05-02)
3. ✅ Automated scheduling and dashboard UI (Plan 05-03)

**Phase 5 complete.** Ready to proceed to Phase 6.

---
*Phase: 05-pdf-generation*
*Completed: 2026-02-16*
