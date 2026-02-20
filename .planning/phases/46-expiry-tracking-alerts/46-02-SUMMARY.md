---
phase: 46-expiry-tracking-alerts
plan: 02
subsystem: ui
tags: [tanstack-query, next.js, supabase, dashboard, expiry, date-fns, shadcn]

# Dependency graph
requires:
  - phase: 40-comms-docs-foundation
    provides: documents, document_versions, document_categories tables and RLS
  - phase: 45-document-upload-profile-storage
    provides: ExpiryBadge component pattern, document upload API, admin document view
provides:
  - TanStack Query hooks for document expiry data (useExpiringDocuments, useDocumentExpirySummary, useDocumentCategories)
  - Bulk expiry dashboard page at /admin/document-expiry
  - DashboardNav updated with Document Expiry item
affects: [47-notification-preferences]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Org-scoped TanStack Query hooks with client-side date computation for expiry status"
    - "Admin dashboard page with summary cards, tabbed data table, and category filter"

key-files:
  created:
    - web/lib/queries/admin/document-expiry.ts
    - web/app/(dashboard)/admin/document-expiry/page.tsx
  modified:
    - web/components/dashboard/DashboardNav.tsx
    - FEATURES.md

key-decisions:
  - "Documents without expiry dates (null) excluded from dashboard -- only time-bound documents shown"
  - "Three tab views: 30-day window (default), all expiring (365d), expired only"
  - "Status badges use light theme colours for admin dashboard (red/amber/green with 50-opacity backgrounds)"
  - "Category filter uses slug-based matching from useDocumentCategories hook"

patterns-established:
  - "Admin expiry dashboard pattern: summary cards + tabbed table + category filter"
  - "Client-side date computation with differenceInDays for expiry status classification"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 46 Plan 02: Bulk Document Expiry Dashboard Summary

**TanStack Query hooks for org-scoped document expiry data with bulk dashboard page featuring summary cards, tabbed table (30d/all/expired), category filter, and colour-coded status badges**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T17:37:32Z
- **Completed:** 2026-02-20T17:41:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Three TanStack Query hooks (useExpiringDocuments, useDocumentExpirySummary, useDocumentCategories) with org-scoped filtering via useRequireOrg
- Bulk expiry dashboard at /admin/document-expiry with summary cards showing expired/expiring-soon/current counts
- Tabbed data table with 30 Days, All Expiring, and Expired views plus category filter dropdown
- Status badges and days-remaining indicators with colour-coded urgency (red/amber/green)
- DashboardNav updated with "Document Expiry" item using FileWarning icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hooks for document expiry data** - `2f57eef` (feat)
2. **Task 2: Create bulk expiry dashboard page and add navigation item** - `37f24f5` (feat)

## Files Created/Modified
- `web/lib/queries/admin/document-expiry.ts` - TanStack Query hooks: useExpiringDocuments, useDocumentExpirySummary, useDocumentCategories with server functions for Supabase queries
- `web/app/(dashboard)/admin/document-expiry/page.tsx` - Bulk expiry dashboard page with summary cards, tabbed data table, category filter, status badges
- `web/components/dashboard/DashboardNav.tsx` - Added Document Expiry nav item with FileWarning icon
- `FEATURES.md` - Added Phase 46 Plan 02 documentation

## Decisions Made
- Documents with null expiry_date are excluded from the dashboard (only time-bound documents are shown)
- Three tab views: 30-day default window, all expiring (365-day window), and expired-only
- Status badges use light theme admin dashboard colours (not dark medic portal theme)
- Category filter uses slug-based matching via useDocumentCategories hook (5-minute stale time since categories rarely change)
- FileWarning icon chosen for nav item (triangle with exclamation mark, appropriate for expiry tracking)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bulk expiry dashboard is ready for use by org admins
- Phase 46 Plan 01 (email alerts infrastructure) can be built independently
- Phase 47 (notification preferences) can reference the expiry dashboard for admin compliance overview

---
*Phase: 46-expiry-tracking-alerts*
*Completed: 2026-02-20*
