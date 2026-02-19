---
phase: 33-event-posting-discovery
plan: 01
status: complete
started: 2026-02-19
completed: 2026-02-19
---

# Plan 33-01 Summary: Event Database Schema & API Routes

## What Was Built

Created the database foundation and API layer for marketplace event posting and discovery:

1. **SQL Migration (145_marketplace_events.sql)** — 3 tables with PostGIS spatial queries:
   - `marketplace_events`: Full event details with GEOGRAPHY(POINT, 4326) for radius queries, status workflow (draft/open/closed/cancelled/awarded), quote tracking (has_quotes/quote_count), JSONB equipment
   - `event_days`: Multi-day support with per-day date and time ranges
   - `event_staffing_requirements`: Per-day or all-days staffing roles for qualification-based discovery filtering

2. **TypeScript Types (event-types.ts)** — Interfaces mirroring SQL schema with human-readable label maps for EventType, StaffingRole, EquipmentItem, EventStatus, IndoorOutdoor

3. **Zod Validation Schemas (event-schemas.ts)** — Per-step wizard schemas (basicInfo, scheduling, staffing) plus combined eventFormSchema, and separate pre/post-quote update schemas enforcing EVNT-05 edit restrictions

4. **API Routes (3 files):**
   - `events/route.ts`: POST (create with days + staffing + equipment, draft support) + GET (list with status/type/location/role filters, pagination)
   - `events/[id]/route.ts`: GET (single event with nested data) + PUT (update with has_quotes edit restrictions)
   - `events/[id]/close/route.ts`: POST (close/cancel with TODO for Phase 38 notifications)

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `62043f0` | feat(33-01): create marketplace events migration (tables, RLS, indexes) |
| 2 | `c4ec3ee` | feat(33-01): add event TypeScript types and Zod validation schemas |
| 3 | `0e11c92` | feat(33-01): add event CRUD API routes with edit restrictions |

## Key Decisions

- PostGIS extension for GEOGRAPHY columns and ST_DWithin radius queries
- auth.uid()-based RLS (NOT get_user_org_id) — marketplace is cross-org
- 9 RLS policies (3 per table): poster manage own, verified companies browse open, platform admin full
- GIST spatial index on location_coordinates for performant radius queries
- Separate pre/post-quote update schemas enforce EVNT-05 edit restrictions at API level

## Deviations

None — executed as planned.

## Files Created

- `supabase/migrations/145_marketplace_events.sql`
- `web/lib/marketplace/event-types.ts`
- `web/lib/marketplace/event-schemas.ts`
- `web/app/api/marketplace/events/route.ts`
- `web/app/api/marketplace/events/[id]/route.ts`
- `web/app/api/marketplace/events/[id]/close/route.ts`
