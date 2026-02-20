---
phase: 46-expiry-tracking-alerts
plan: 01
subsystem: database, infra
tags: [pg_cron, pg_net, resend, deno, edge-function, email, expiry, compliance, vault]

# Dependency graph
requires:
  - phase: 40-comms-docs-foundation
    provides: documents, document_versions, document_categories tables with RLS
  - phase: 45-document-upload-profile-storage
    provides: document upload flow and expiry badges on UI
provides:
  - document_expiry_reminders audit table for deduplication and compliance proof
  - get_documents_expiring_in_days RPC function for querying expiring documents
  - mark_expired_documents function for automated status updates
  - pg_cron daily job at 08:00 UTC for document expiry checking
  - document-expiry-checker Edge Function with digest email delivery
  - Medic and admin digest email templates with escalating urgency
affects: [46-02-bulk-expiry-dashboard, 47-ios-document-expiry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Document expiry digest email pattern (group by medic, one email per threshold)"
    - "Admin org-wide digest at critical stages only (14/7/1 days)"
    - "Deduplication via (document_version_id, days_before, recipient_type) composite index"

key-files:
  created:
    - supabase/migrations/155_document_expiry_reminders.sql
    - supabase/functions/document-expiry-checker/index.ts
    - supabase/functions/document-expiry-checker/email-templates.ts
  modified:
    - FEATURES.md

key-decisions:
  - "Daily digest format (not per-document emails) -- one email per medic per threshold"
  - "Admin digest at critical stages only (14/7/1 days, not 30) to reduce noise"
  - "Deduplication tracks document_version_id -- new version upload naturally avoids stale alerts"
  - "mark_expired_documents sets status='expired' (informational, no blocking)"
  - "Admin email resolution: profiles.role='site_manager' first, org_settings.admin_email fallback"
  - "pg_cron at 08:00 UTC (8am GMT / 9am BST -- within morning 8-9am UK year-round)"

patterns-established:
  - "Document expiry digest: group by medic_id, send single email with document table"
  - "Admin org-wide digest: group by org_id then medic, separate email to site_manager"
  - "Recipient type tracking: 'medic' vs 'admin' in reminders table for independent dedup"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 46 Plan 01: Document Expiry Alert Infrastructure Summary

**Progressive document expiry alerts via pg_cron + Edge Function with medic daily digest (30/14/7/1 days), admin org-wide digest (14/7/1 days), deduplication audit table, and automated expired status marking**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T17:39:06Z
- **Completed:** 2026-02-20T17:43:43Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 1

## Accomplishments
- Migration 155 with document_expiry_reminders audit table, two RPC functions, and daily pg_cron job
- Edge Function that processes 4 reminder stages with deduplication, medic grouping, and admin digest at critical stages
- Digest email templates with escalating urgency (blue -> amber -> red) and dev mode fallback
- Automated document status marking to 'expired' for past-due documents

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 155 with audit table, RPC, status update, and pg_cron job** - `358b811` (feat)
2. **Task 2: Create document-expiry-checker Edge Function with digest email templates** - `a8fea38` (feat)

## Files Created/Modified
- `supabase/migrations/155_document_expiry_reminders.sql` - Audit table, get_documents_expiring_in_days RPC, mark_expired_documents function, pg_cron daily job
- `supabase/functions/document-expiry-checker/index.ts` - Daily cron Edge Function with 4 reminder stages, deduplication, medic/admin digest grouping
- `supabase/functions/document-expiry-checker/email-templates.ts` - sendMedicDigestEmail and sendAdminDigestEmail with escalating urgency and Resend dev mode fallback
- `FEATURES.md` - Added Phase 46 Plan 01 document expiry alert infrastructure feature documentation

## Decisions Made
- **Daily digest format:** One email per medic per threshold (not one email per document). Follows CONTEXT.md requirement.
- **Admin digest at critical stages only:** 14/7/1 days (not 30) to reduce noise. Admin has the bulk dashboard for early visibility.
- **Deduplication by document_version_id:** Tracks version-specific alerts. New version upload means old version's expiry is no longer queried -- natural deduplication without cancellation logic.
- **mark_expired_documents:** Sets status='expired' for past-due documents. Informational only (no blocking). Enables server-side queries on expired status.
- **Admin email resolution:** profiles table with role='site_manager' first, org_settings.admin_email as fallback. Covers both standard and custom admin configurations.
- **pg_cron at 08:00 UTC:** 8am GMT / 9am BST -- satisfies "morning 8-9am UK" requirement year-round regardless of DST.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The pg_cron job and Edge Function will activate automatically when deployed. Resend emails require RESEND_API_KEY to be configured (already noted in pending todos). Dev mode fallback operates without it.

**Note:** Migration 155 needs to be applied to production (add to pending migration list).

## Next Phase Readiness
- Alert infrastructure complete, ready for Plan 02 (bulk expiry dashboard UI)
- document_expiry_reminders table provides audit data for dashboard queries
- get_documents_expiring_in_days RPC can also be used by dashboard for server-side queries
- mark_expired_documents ensures document status is accurate for dashboard display

---
*Phase: 46-expiry-tracking-alerts*
*Completed: 2026-02-20*
