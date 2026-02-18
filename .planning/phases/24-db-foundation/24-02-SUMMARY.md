---
phase: 24-db-foundation
plan: 02
subsystem: database
tags: [postgres, rls, migration, supabase, row-level-security, white-label, branding]

# Dependency graph
requires:
  - phase: 24-db-foundation-01
    provides: Next.js CVE patched — stable dev environment for migration authoring
  - phase: 11-02
    provides: org_settings table pattern (migration 118) used as canonical template

provides:
  - org_branding table with org_id FK (CASCADE), logo_path, primary_colour_hex, company_name, tagline
  - NULL-safe hex CHECK constraint on primary_colour_hex (#RRGGBB format enforced)
  - idx_org_branding_org index on org_id
  - Backfill: every existing org gets a row with company_name from organizations.name
  - 5 RLS policies: org SELECT, org admin UPDATE, platform admin SELECT/INSERT/UPDATE

affects:
  - phase-27-white-label-portal
  - phase-28-pdf-reports
  - phase-29-branded-emails
  - phase-30-branding-admin-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "org-scoped RLS with is_org_admin() for UPDATE: org users read-only, admins can mutate"
    - "NULL-safe CHECK constraint pattern: col IS NULL OR col ~ 'pattern'"
    - "Backfill INSERT using ON CONFLICT DO NOTHING for idempotent re-runs"
    - "organizations.name carried into child table at migration time for pre-populated display"

key-files:
  created:
    - supabase/migrations/132_org_branding.sql
  modified: []

key-decisions:
  - "Org admins can UPDATE their own branding row (unlike org_settings where only platform admins mutate) — branding is self-service"
  - "primary_colour_hex allows NULL: IS NULL OR regex pattern avoids constraint violation on initial empty rows"
  - "company_name pre-populated from organizations.name at migration time — avoids empty state for all existing orgs"
  - "No DELETE policy for org users — only platform admins manage row lifecycle (same as org_settings convention)"
  - "uuid_generate_v4() used (not gen_random_uuid()) — project convention"

patterns-established:
  - "Org admin UPDATE RLS: USING (org_id = get_user_org_id() AND is_org_admin()) WITH CHECK (same)"
  - "NULL-safe column CHECK: col IS NULL OR col ~ '^pattern$'"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 24 Plan 02: Org Branding Migration Summary

**org_branding table created with hex-validated primary colour, backfill from organizations.name, and self-service org-admin UPDATE policy alongside full platform-admin access**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-18T07:49:38Z
- **Completed:** 2026-02-18T07:50:43Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Created `supabase/migrations/132_org_branding.sql` (153 lines) following the migration 118 (org_settings) pattern
- org_branding table with 6 data columns + timestamps: logo_path, primary_colour_hex (NULL-safe hex CHECK), company_name, tagline, org_id FK (CASCADE), id
- Backfill INSERT selects `id, name FROM organizations` and maps name to company_name — every existing org has a pre-populated display name
- 5 RLS policies: org user SELECT, org admin UPDATE (with is_org_admin()), platform admin SELECT/INSERT/UPDATE

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 132_org_branding.sql** - `712c3b6` (feat)

**Plan metadata:** _(pending — docs commit below)_

## Files Created/Modified

- `supabase/migrations/132_org_branding.sql` - org_branding table, index, backfill, RLS policies (153 lines)

## Decisions Made

- **Org admins can UPDATE (not just SELECT):** Unlike org_settings (platform-admin-only write), branding is a self-service feature — org admins should be able to configure their own logo, colour, and tagline without platform intervention. Policy scoped with `is_org_admin()` guard.
- **NULL-safe CHECK on primary_colour_hex:** All backfilled rows start with NULL for logo/colour/tagline — the constraint must allow NULL to avoid violating the check on insert. Pattern: `primary_colour_hex IS NULL OR primary_colour_hex ~ '^#[0-9A-Fa-f]{6}$'`.
- **company_name pre-populated from organizations.name:** Avoids an empty state for all 50+ existing orgs. They immediately have a usable display name in white-label contexts without any admin action required.
- **ON CONFLICT DO NOTHING:** Makes backfill idempotent — re-running migration or applying to a partially-seeded database is safe.
- **No DELETE policy for org users:** Matches migration 118 convention — row lifecycle is managed only by platform admins.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration file is ready to apply via `supabase db push` or Supabase dashboard.

## Next Phase Readiness

- Migration 132 ready to apply — org_branding table will exist with backfilled data for all existing orgs
- Phase 24-03 (migration 133_subscription_tiers) can proceed immediately
- Phases 27-30 (portal, PDFs, emails, branding UI) all depend on this table existing — foundation is in place
- No blockers

---
*Phase: 24-db-foundation*
*Completed: 2026-02-18*
