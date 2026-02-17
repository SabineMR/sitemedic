---
phase: 11-org-settings
plan: 01
subsystem: database
tags: [postgresql, supabase, rls, migration, org-settings, jsonb]

# Dependency graph
requires:
  - phase: 08-lead-capture
    provides: RLS pattern with get_user_org_id() and is_platform_admin() functions
provides:
  - org_settings table with per-org base_rate, geofence_default_radius, urgency_premiums, net30_eligible, credit_limit, admin_email
  - Seed data for all existing organisations with v1.0 defaults
  - RLS policies scoped to org users (SELECT) and platform admins (full CRUD)
affects: [11-02, 11-03, pricing-logic, geofencing, booking-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-org configuration table: one settings row per organisation, seeded from existing orgs"
    - "RLS pattern: org users read-only, platform admins full CRUD, no INSERT/DELETE for org users"
    - "JSONB for array config: urgency_premiums stored as JSONB array for flexible schema"

key-files:
  created:
    - supabase/migrations/118_org_settings.sql
  modified: []

key-decisions:
  - "uuid_generate_v4() used (not gen_random_uuid()) for consistency with migrations 115-117"
  - "No moddatetime trigger — project convention is manual updated_at in application update calls"
  - "No INSERT or DELETE policy for org users — only platform admins create settings rows, seeded by migration"
  - "ON CONFLICT (org_id) DO NOTHING on seed INSERT — makes migration idempotent/safe to re-run"
  - "4 RLS policies total: 1 org SELECT + 3 platform admin (SELECT, INSERT, UPDATE) — no DELETE policy for org users"

patterns-established:
  - "Org settings seeded at migration time to ensure all existing orgs have a row before Plans 11-02/11-03 run"

# Metrics
duration: 1min
completed: 2026-02-17
---

# Phase 11 Plan 01: Org Settings Migration Summary

**org_settings table with JSONB urgency premiums, geofence radius, base rate, and RLS — seeded for all existing organisations**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-17T17:32:08Z
- **Completed:** 2026-02-17T17:33:06Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `org_settings` table replacing hardcoded business defaults scattered across pricing and booking logic
- Seeded all existing organisations with v1.0 defaults (GBP 42/hr, 200 m geofence, [0,20,50,75] urgency premiums, GBP 5000 credit limit)
- Established RLS: org users can SELECT their own row; platform admins have full INSERT/UPDATE/SELECT access
- Added COMMENT ON TABLE and all 10 columns for developer documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 118_org_settings.sql** - `958c8cb` (feat)

## Files Created/Modified

- `supabase/migrations/118_org_settings.sql` - org_settings table, constraints, column comments, index, seed INSERT, RLS enable + 4 policies, summary comment block

## Decisions Made

- Used `uuid_generate_v4()` (not `gen_random_uuid()`) — consistent with migrations 115-117 project convention
- No `moddatetime` trigger — project convention: manual `updated_at` in application update calls (matches 115-117)
- No INSERT or DELETE RLS policy for org users — platform admins own the lifecycle; migration seeds the row
- `ON CONFLICT (org_id) DO NOTHING` on seed INSERT — makes migration idempotent, safe to re-run
- 4 RLS policies: org users SELECT only (1), platform admins SELECT + INSERT + UPDATE (3) — no platform admin DELETE policy added per plan spec ("4 policies")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `org_settings` table exists and is seeded — Plans 11-02 and 11-03 can proceed immediately
- No blockers. RLS functions `get_user_org_id()` and `is_platform_admin()` were already available from prior phases.

---
*Phase: 11-org-settings*
*Completed: 2026-02-17*
