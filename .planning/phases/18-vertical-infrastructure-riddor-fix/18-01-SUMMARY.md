---
phase: 18-vertical-infrastructure-riddor-fix
plan: 01
subsystem: database
tags: [watermelondb, sqlite, supabase, schema-migration, vertical, riddor, gps]

# Dependency graph
requires:
  - phase: 17-v1.1-final-polish
    provides: stable v1.1 schema (WatermelonDB v3, Supabase migrations 1–123)
provides:
  - WatermelonDB schema v4 with vertical infrastructure columns
  - Migration step from v3 to v4 (safe for existing device installs)
  - Treatment model fields: eventVertical, verticalExtraFields, bookingId
  - NearMiss model fields: gpsLat, gpsLng
  - Supabase migration 124 with vertical columns + compliance_score_history table
affects: [19-motorsport-pdf, 20-football-forms, 21-construction-enhancements, 22-vertical-dispatch, 23-compliance-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WatermelonDB schema versioning: all new columns isOptional: true to protect existing device installs"
    - "Supabase ADD COLUMN IF NOT EXISTS for idempotent migrations"
    - "verticalExtraFields stored as raw JSON string in WatermelonDB (TEXT); parsed at call site"

key-files:
  created:
    - supabase/migrations/124_vertical_schema_v4.sql
  modified:
    - src/database/schema.ts
    - src/database/migrations.ts
    - src/database/models/Treatment.ts
    - src/database/models/NearMiss.ts

key-decisions:
  - "All new WatermelonDB columns are isOptional: true — required for safe migration of existing device installs without data loss"
  - "verticalExtraFields uses @text decorator (not @json) in Treatment model — raw JSON string, parsed at call site to avoid decorator coupling to vertical-specific types"
  - "compliance_score_history created in migration 124 (not deferred to Phase 23) — table must exist before Phase 23 analytics can write to it"
  - "booking_id in Supabase uses UUID REFERENCES bookings(id) ON DELETE SET NULL — treatments survive booking deletion"

patterns-established:
  - "Vertical columns pattern: event_vertical TEXT + vertical_extra_fields JSONB on treatments table"
  - "GPS pattern: gps_lat/gps_lng as DOUBLE PRECISION on incident tables"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 18 Plan 01: Vertical Infrastructure Schema v4 Summary

**WatermelonDB schema bumped to v4 with vertical context columns on treatments (event_vertical, vertical_extra_fields, booking_id) and GPS columns on near_misses (gps_lat, gps_lng), plus Supabase migration 124 with compliance_score_history table**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T02:47:47Z
- **Completed:** 2026-02-18T02:50:07Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments

- WatermelonDB schema bumped from v3 to v4 with 5 new optional columns across two tables
- Migration step `toVersion: 4` added covering both `treatments` and `near_misses` with `isOptional: true` on all new columns — safe for existing device installs
- `Treatment` TypeScript model extended with `eventVertical?`, `verticalExtraFields?`, and `bookingId?` fields
- `NearMiss` TypeScript model extended with `gpsLat?` and `gpsLng?` number fields
- Supabase migration 124 created with 5 `ADD COLUMN IF NOT EXISTS` statements and `compliance_score_history` table with RLS

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump WatermelonDB schema to v4 and add migration step** - `7c63a04` (feat)
2. **Task 2: Update Treatment and NearMiss models with new field decorators** - `0b85265` (feat)
3. **Task 3: Write Supabase SQL migration 124** - `f63c128` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/database/schema.ts` — Version bumped 3→4; 3 columns added to treatments, 2 to near_misses
- `src/database/migrations.ts` — toVersion: 4 step added with addColumns for both tables
- `src/database/models/Treatment.ts` — eventVertical?, verticalExtraFields? (@text), bookingId? added
- `src/database/models/NearMiss.ts` — gpsLat?, gpsLng? (number) added
- `supabase/migrations/124_vertical_schema_v4.sql` — 5 ADD COLUMN IF NOT EXISTS + compliance_score_history table + RLS

## Decisions Made

- **All new WatermelonDB columns `isOptional: true`** — Required for safe migration of existing device installs. Without this, pre-migration records would have null for these columns and WatermelonDB would throw on read.
- **`verticalExtraFields` uses `@text` not `@json`** — Avoids coupling the decorator to a specific TypeScript type. The raw JSON string is parsed at the call site using `JSON.parse()` which keeps the model agnostic of vertical-specific data shapes.
- **`compliance_score_history` created in migration 124** — The table must exist before Phase 23 analytics writes scores to it. Creating it here avoids a dependency on Phase 23 to be planned before it can run.
- **`booking_id` uses `ON DELETE SET NULL`** — Treatments must survive if a booking is deleted (audit trail). The link becomes null but the treatment record is preserved.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `web/lib/invoices/pdf-generator.ts` were present before this plan and are unrelated to any database schema changes.

## User Setup Required

None — no external service configuration required. The Supabase SQL migration must be applied to the production database when deploying Phase 18.

## Next Phase Readiness

- Schema v4 is in place — all Phase 18 plans (18-02 through 18-07) can now safely read/write `event_vertical`, `vertical_extra_fields`, `booking_id`, `gps_lat`, `gps_lng`
- RIDDOR detector (18-02) can check `treatment.eventVertical` to gate RIDDOR logic per vertical
- Supabase migration 124 must be applied to production before any backend vertical features go live
- No blockers for continuing Phase 18

---
*Phase: 18-vertical-infrastructure-riddor-fix*
*Completed: 2026-02-18*
