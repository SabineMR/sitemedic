---
phase: 40-comms-docs-foundation
plan: 01
subsystem: database
tags: [postgres, rls, supabase, messaging, documents, multi-tenant, triggers]

# Dependency graph
requires:
  - phase: 00-organizations
    provides: organizations table, get_user_org_id() function, is_platform_admin() function, update_updated_at_column() trigger
  - phase: 00-medics
    provides: medics table for FK references
provides:
  - 7 database tables for messaging and document management
  - org_id-scoped RLS on all tables with platform admin bypass
  - Default document categories (Insurance, DBS, Qualification, ID, Other) per org
  - Auto-seeding trigger for new organizations
affects: [41-messaging-ui, 42-offline-sync, 43-realtime-push, 44-broadcast, 45-document-upload, 46-expiry-tracking, 47-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(SELECT get_user_org_id()) wrapper pattern for RLS query plan caching"
    - "Denormalized org_id on child tables to avoid JOIN-based RLS performance overhead"
    - "Soft-delete via deleted_at column with RLS filter hiding deleted rows from org users"
    - "Circular FK (documents.current_version_id -> document_versions.id) with deferred constraint via separate ALTER TABLE"
    - "CROSS JOIN + ON CONFLICT seeding pattern for existing data"
    - "AFTER INSERT trigger on organizations for auto-seeding related lookup data"

key-files:
  created:
    - "supabase/migrations/143_comms_docs_schema.sql"
  modified:
    - "FEATURES.md"

key-decisions:
  - "Used (SELECT get_user_org_id()) wrapper in all RLS policies for query plan caching — improvement over existing project convention"
  - "Denormalized org_id on messages, message_recipients, document_versions to avoid JOIN-based RLS"
  - "Messages SELECT policy includes deleted_at IS NULL filter — soft-deleted messages hidden from org users but visible to platform admin"
  - "conversation_read_status policies are user-scoped (user_id = auth.uid() + org_id check)"
  - "Partial unique index on conversations(org_id, medic_id) WHERE type = 'direct' ensures one direct thread per org+medic"

patterns-established:
  - "RLS wrapper: (SELECT get_user_org_id()) for plan caching on all v5.0 tables"
  - "5-policy pattern per table: SELECT/INSERT/UPDATE/DELETE for org users + ALL for platform admin"
  - "Denormalized org_id on child tables: avoids JOIN in RLS USING clause"
  - "Default category seeding: trigger on organizations INSERT + CROSS JOIN for existing rows"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 40 Plan 01: Comms & Docs Foundation Schema Summary

**7 org-scoped tables (conversations, messages, message_recipients, conversation_read_status, document_categories, documents, document_versions) with 35 RLS policies, 18 indexes, auto-seeded document categories, and denormalized org_id for JOIN-free RLS**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T21:58:37Z
- **Completed:** 2026-02-19T22:01:38Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created single migration (143) with all 7 v5.0 foundation tables
- 35 RLS policies enforcing org_id isolation using (SELECT get_user_org_id()) wrapper
- Platform admin bypass (is_platform_admin()) on every table
- 18 indexes covering org_id lookups and composite query patterns (conversation ordering, message threading, document filtering)
- Default document categories (Insurance, DBS, Qualification, ID, Other) seeded for all existing orgs
- AFTER INSERT trigger on organizations auto-seeds categories for new orgs
- Soft-delete on messages with RLS-level filtering (deleted_at IS NULL)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 143 — all tables, RLS, indexes, triggers, seeding** - `6e143b7` (feat)

## Files Created/Modified
- `supabase/migrations/143_comms_docs_schema.sql` - Complete v5.0 foundation schema: 7 tables, 35 RLS policies, 18 indexes, 5 triggers, default category seeding
- `FEATURES.md` - Updated v5.0 architecture notes with actual table names, denormalization rationale, migration status table

## Decisions Made
- Used `(SELECT get_user_org_id())` wrapper in all RLS policies for query plan caching — existing project uses bare `get_user_org_id()` but plan specified the wrapper pattern as an improvement
- Denormalized org_id on child tables (messages, message_recipients, document_versions) to avoid expensive JOINs in RLS policy evaluation
- Messages SELECT policy includes `AND deleted_at IS NULL` so soft-deleted messages are hidden from org users but remain visible to platform admins
- conversation_read_status policies are doubly scoped: `user_id = auth.uid()` AND `org_id = (SELECT get_user_org_id())` — users can only see/modify their own read status
- Partial unique index `WHERE type = 'direct'` on conversations ensures one direct conversation thread per org+medic pair while allowing multiple broadcast conversations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration must be applied to production database when ready.

## Next Phase Readiness
- All 7 tables ready for Plan 02 (storage bucket + Edge Function for file upload)
- All 7 tables ready for Phase 41 (messaging UI) — conversations, messages, message_recipients, conversation_read_status provide complete messaging data layer
- document_categories, documents, document_versions provide complete document management data layer for Phase 45
- Migration 143 should be added to the pending production migrations list

---
*Phase: 40-comms-docs-foundation*
*Completed: 2026-02-19*
