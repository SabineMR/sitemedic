---
phase: 40-comms-docs-foundation
plan: 02
subsystem: database
tags: [supabase-storage, rls, typescript, types, storage-buckets, org-scoped, multi-tenant]

# Dependency graph
requires:
  - phase: 40-comms-docs-foundation-01
    provides: 7 foundation tables (conversations, messages, message_recipients, conversation_read_status, document_categories, documents, document_versions), get_user_org_id() function, is_platform_admin() function
provides:
  - Private storage bucket "medic-documents" (10MB, PDF/JPEG/PNG/DOC/DOCX) with org-scoped RLS
  - Private storage bucket "message-attachments" (10MB, PDF/JPEG/PNG/DOC/DOCX) with org-scoped RLS
  - TypeScript interfaces for all 7 v5.0 tables
  - Union types for enums (ConversationType, MessageType, MessageStatus, DocumentStatus)
  - Convenience types for UI patterns (ConversationWithUnread, MessageWithSender, DocumentWithVersion, BroadcastReadSummary)
affects: [41-messaging-ui, 42-offline-sync, 43-realtime-push, 44-broadcast, 45-document-upload, 46-expiry-tracking, 47-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(storage.foldername(name))[1] = (SELECT get_user_org_id())::text for org-scoped storage RLS"
    - "FOR ALL platform admin bypass policy per storage bucket"
    - "Separate TypeScript types file per feature domain (comms.types.ts alongside database.types.ts)"

key-files:
  created:
    - "supabase/migrations/144_comms_docs_storage.sql"
    - "web/types/comms.types.ts"
  modified: []

key-decisions:
  - "Used (SELECT get_user_org_id())::text in storage RLS — matching wrapper pattern from migration 143 for consistency"
  - "INSERT policies require auth.uid() IS NOT NULL for upload — explicit auth check beyond org scoping"
  - "Platform admin uses FOR ALL policy instead of per-operation — single policy covers all CRUD operations"
  - "TypeScript types in separate comms.types.ts file — avoids conflicts with existing database.types.ts"
  - "String union types (not TypeScript enums) — matches existing project convention in database.types.ts"

patterns-established:
  - "Storage path convention: {org_id}/{entity_id}/{category_slug}/{filename} for documents"
  - "Storage path convention: {org_id}/{conversation_id}/{filename} for attachments"
  - "5-policy storage RLS pattern: INSERT/SELECT/UPDATE/DELETE (org-scoped) + ALL (platform admin)"
  - "Separate .types.ts file per feature domain"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 40 Plan 02: Storage Buckets & TypeScript Types Summary

**2 private storage buckets (medic-documents, message-attachments) with org-scoped RLS via foldername path, plus TypeScript interfaces for all 7 v5.0 tables with union types and convenience types**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T22:05:19Z
- **Completed:** 2026-02-19T22:07:09Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Created migration 144 with 2 private storage buckets (medic-documents, message-attachments) each with 10MB limit and PDF/JPEG/PNG/DOC/DOCX allowed MIME types
- 10 storage RLS policies: 4 org-scoped (INSERT/SELECT/UPDATE/DELETE) + 1 platform admin (ALL) per bucket
- Path-based org isolation using `(storage.foldername(name))[1] = (SELECT get_user_org_id())::text`
- TypeScript interfaces for all 7 v5.0 tables matching migration 143 column definitions exactly
- 4 union types for database enums (ConversationType, MessageType, MessageStatus, DocumentStatus)
- 4 convenience types for common UI patterns (ConversationWithUnread, MessageWithSender, DocumentWithVersion, BroadcastReadSummary)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 144 — storage buckets and storage RLS policies** - `1348094` (feat)
2. **Task 2: Create TypeScript type definitions for all v5.0 tables** - `938622d` (feat)

## Files Created/Modified
- `supabase/migrations/144_comms_docs_storage.sql` - 2 private storage buckets with 10 RLS policies (org-scoped + platform admin bypass)
- `web/types/comms.types.ts` - 7 table interfaces, 4 union types, 4 convenience types for v5.0 comms & docs

## Decisions Made
- Used `(SELECT get_user_org_id())::text` in storage RLS — matching the wrapper pattern established in migration 143 for query plan caching consistency
- INSERT policies include explicit `auth.uid() IS NOT NULL` check — belt-and-suspenders authentication verification beyond org scoping
- Platform admin policies use `FOR ALL` instead of per-operation — single policy covers INSERT/SELECT/UPDATE/DELETE, reducing policy count (matches established project pattern)
- TypeScript types placed in separate `web/types/comms.types.ts` — avoids modifying existing `database.types.ts` and potential merge conflicts
- Used string union types (`'direct' | 'broadcast'`) instead of TypeScript enums — matches existing project convention in `database.types.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration 144 must be applied to production database when ready (alongside migration 143 from Plan 01).

## Next Phase Readiness
- Storage buckets ready for Phase 45 (document upload UI) — medic-documents bucket provides file storage layer
- Storage buckets ready for Phase 47 (message attachments) — message-attachments bucket provides attachment storage
- TypeScript types ready for all subsequent v5.0 phases — type-safe data access for conversations, messages, documents
- Convenience types (ConversationWithUnread, MessageWithSender, DocumentWithVersion) ready for Phase 41 (messaging UI) and Phase 45 (document UI)
- Phase 40 foundation complete: schema (143) + storage (144) + types provide complete data layer for v5.0

---
*Phase: 40-comms-docs-foundation*
*Completed: 2026-02-19*
