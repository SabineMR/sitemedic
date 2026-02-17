---
phase: 08-lead-capture
plan: 08-01
subsystem: database
tags: [supabase, postgresql, rls, migrations, lead-capture]

# Dependency graph
requires:
  - phase: 04.5-marketing-booking
    provides: organizations table (org_id FK target), bookings table (converted_booking_id FK target)
  - phase: 05.5-admin-operations
    provides: get_user_org_id() RLS helper function (established in migration 028)
  - phase: 04-web-dashboard
    provides: is_platform_admin() function (established in migration 107/112)
provides:
  - contact_submissions table with org-scoped RLS for storing /contact page enquiries
  - quote_submissions table with org-scoped RLS for storing quote builder submissions
  - 7 indexes for performance-optimised admin queries
  - 12 RLS policies (2 org-scoped + 4 platform admin per table)
  - SUPABASE_SERVICE_ROLE_KEY and ASG_ORG_ID documented in env example
affects:
  - 08-02 (API routes write to these tables via service role)
  - 08-03 (admin leads inbox reads from these tables via org-scoped SELECT)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "No INSERT policy for org users — service role bypasses RLS for public route inserts"
    - "No DELETE policy for org users — leads are permanent records"
    - "Platform admin full CRUD (4 policies) layered on top of org-scoped policies (2 policies)"
    - "No moddatetime triggers — project uses manual updated_at in update calls"

key-files:
  created:
    - supabase/migrations/115_lead_capture_tables.sql
  modified:
    - web/.env.local.example

key-decisions:
  - "D-08-01-001: No INSERT policy for authenticated/anon roles — service role (server-only) handles all public form inserts, preventing direct client writes"
  - "D-08-01-002: No DELETE policy for org users — lead submissions are permanent records; platform admins retain delete capability for GDPR/data management"
  - "D-08-01-003: special_requirements stored as TEXT[] (PostgreSQL array) not JSONB — simple string list needs no JSON structure overhead"
  - "D-08-01-004: converted_booking_id uses ON DELETE SET NULL — if booking is deleted, lead record is preserved with null FK rather than cascade-deleted"
  - "D-08-01-005: ASG_ORG_ID env var approach — hardcodes the Apex Safety Group org UUID server-side so public form submissions land in the correct org without user auth"

patterns-established:
  - "Service-role-insert pattern: public form APIs use SUPABASE_SERVICE_ROLE_KEY to bypass RLS; org users only read/update via org-scoped policies"
  - "Lead table RLS: 2 org policies (SELECT + UPDATE) + 4 platform admin policies (SELECT/INSERT/UPDATE/DELETE) = 6 per table"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 08 Plan 01: Lead Capture Tables Summary

**PostgreSQL migration creating contact_submissions and quote_submissions tables with service-role-insert RLS pattern, 7 indexes, and 12 policies for multi-tenant lead persistence**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T16:42:48Z
- **Completed:** 2026-02-17T16:44:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `contact_submissions` table with enquiry type, status lifecycle (new/contacted/converted/closed), follow-up notes, and org-scoped RLS
- Created `quote_submissions` table with full quote builder field set including `TEXT[]` for special requirements, `NUMERIC(10,2)` for calculated price, `DATE` fields, and `converted_booking_id` FK to bookings
- Applied RLS pattern: no INSERT/DELETE for org users (service role handles public writes), SELECT + UPDATE for org users, full CRUD for platform admins

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration file with both tables, indexes, and RLS policies** - `972bf08` (feat)
2. **Task 2: Update .env.local.example with service role key and org ID vars** - `6b1a63a` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `supabase/migrations/115_lead_capture_tables.sql` - Migration creating both lead capture tables with 7 indexes and 12 RLS policies
- `web/.env.local.example` - Added SUPABASE_SERVICE_ROLE_KEY and ASG_ORG_ID with instructions for obtaining values

## Decisions Made
- **D-08-01-001:** No INSERT policy for org users — service role bypasses RLS on server-side API routes, preventing untrusted client-side writes to lead tables
- **D-08-01-002:** No DELETE policy for org users — lead submissions are permanent business records; only platform admins can delete for GDPR/data management purposes
- **D-08-01-003:** `special_requirements` as `TEXT[]` not JSONB — a simple list of requirement strings needs no JSON structure
- **D-08-01-004:** `converted_booking_id ON DELETE SET NULL` — preserves lead record if the resulting booking is later deleted
- **D-08-01-005:** `ASG_ORG_ID` env var for hardcoded org routing — public form submissions have no authenticated user, so the server-side org UUID is injected at deploy time

## Deviations from Plan

None - plan executed exactly as written.

Note: `115_lead_capture_tables.sql` was already present in the repository from a prior commit (`972bf08`) that bundled the migration with the emergency alert system changes. The file content matches the plan spec exactly. Task 2 (.env.local.example) was executed fresh.

## Issues Encountered
- Migration file `115_lead_capture_tables.sql` was already committed in `972bf08` (emergency alert commit). File content matched plan spec exactly — no changes required. Task 1 recorded that commit hash as the task commit.

## User Setup Required
None - no external service configuration required for the migration itself.

For production deployment, the following env vars must be set in `.env.local` (see `.env.local.example`):
- `SUPABASE_SERVICE_ROLE_KEY` — found in Supabase Dashboard > Project Settings > API
- `ASG_ORG_ID` — run `SELECT id FROM organizations WHERE name ILIKE '%apex%' LIMIT 1`

## Next Phase Readiness
- Both tables are ready for API routes (plan 08-02) to write via service role
- Admin leads inbox (plan 08-03) can read via org-scoped SELECT policies
- All 7 indexes support efficient admin queries (filter by org, status, date range, quote reference)
- Wave 2 plans (08-02 and 08-03) can execute in parallel — no inter-dependency

---
*Phase: 08-lead-capture*
*Completed: 2026-02-17*
