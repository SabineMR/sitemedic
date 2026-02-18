---
phase: 24-db-foundation
plan: 04
subsystem: database
tags: [supabase, storage, rls, postgres, migrations, org-logos]

# Dependency graph
requires:
  - phase: 24-db-foundation
    provides: helper functions is_org_admin(), is_platform_admin(), get_user_org_id() used in RLS policies

provides:
  - Public Supabase Storage bucket 'org-logos' for org branding assets
  - 7 RLS policies: org-scoped writes, unrestricted platform admin writes, public read
  - File size limit (2MB) and MIME type allowlist enforcement at bucket level

affects:
  - phase: 31 (org_branding.logo_path references this bucket)
  - phase: 28 (PDF Edge Functions embed logos via stable public URLs)
  - phase: 26 (white-label portal headers load org logos)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public storage bucket for assets that appear in PDFs/emails (avoid signed URL expiry)"
    - "Org-scoped folder prefix: <org_id>/<filename> enforced by foldername()[1] RLS check"
    - "Dual-policy pattern: separate policies for org admins (folder-scoped) and platform admins (unrestricted)"
    - "1-indexed Postgres array access: (storage.foldername(name))[1] NOT [0]"

key-files:
  created:
    - supabase/migrations/134_org_logos_bucket.sql
  modified: []

key-decisions:
  - "Public bucket chosen because logos appear in PDFs rendered by Edge Functions and transactional emails where signed URLs expire mid-use"
  - "Separate platform admin policies (no folder restriction) because platform admin org_id is NULL in JWT — a folder check would always block them"
  - "1-indexed array access: (storage.foldername(name))[1] — Postgres arrays are 1-indexed, not 0-indexed"
  - "2 MB file size limit enforced at bucket level — sufficient for all web-optimised logo formats"
  - "MIME allowlist: png/jpeg/jpg/svg+xml/webp — covers all common logo formats, blocks non-image uploads"

patterns-established:
  - "Storage bucket RLS: always create separate INSERT/SELECT/UPDATE/DELETE policies (not combined) for clarity"
  - "Platform admin storage policies omit folder checks — their org_id is NULL"
  - "ON CONFLICT (id) DO NOTHING makes bucket creation idempotent for re-runs"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 24 Plan 04: Org Logos Bucket Summary

**Public 'org-logos' Supabase Storage bucket with 2MB/image-MIME limits and 7 org-scoped RLS policies (org admins folder-restricted, platform admins unrestricted, anonymous public read)**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-18T07:50:27Z
- **Completed:** 2026-02-18T07:51:34Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created migration 134 with public `org-logos` bucket (2MB limit, 5 image MIME types)
- Implemented all 7 RLS policies: 2 INSERT, 1 SELECT, 2 UPDATE, 2 DELETE
- Org admins restricted to `<their_org_id>/` folder prefix via `(storage.foldername(name))[1]`
- Platform admins granted unrestricted write access (no folder check — their org_id is NULL in JWT)
- Public SELECT allows unauthenticated logo access for PDFs and emails

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 134_org_logos_bucket.sql** - `96a8d20` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `supabase/migrations/134_org_logos_bucket.sql` - Public org-logos bucket with 7 org-scoped RLS policies, 2MB limit, image MIME allowlist

## Decisions Made

- **Public bucket**: Logos appear in PDFs (Edge Function rendered) and transactional emails. Signed URLs expire mid-render/send — a public bucket with RLS-controlled writes is the correct pattern here.
- **Separate platform admin policies**: Platform admin users have `NULL` org_id in their JWT claims. A folder check like `(storage.foldername(name))[1] = get_user_org_id()::text` would evaluate to `NULL = NULL` which is `false` in SQL, permanently blocking platform admin uploads. Separate policies without folder restriction fix this.
- **1-indexed array**: Postgres arrays are 1-indexed. `(storage.foldername(name))[1]` returns the first path segment (the org_id). Using `[0]` would return NULL.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Bucket creation runs automatically when the migration is applied to Supabase.

## Next Phase Readiness

- `org-logos` bucket ready for use by Phase 31 (org_branding.logo_path)
- Bucket path convention established: `<org_id>/<filename>` (e.g. `abc-123/logo.png`)
- Phase 28 PDF Edge Functions can reference logos via stable public URLs (no signed URL management needed)

---
*Phase: 24-db-foundation*
*Completed: 2026-02-18*
