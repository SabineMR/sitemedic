---
phase: 32-foundation-schema-registration
plan: 03
subsystem: ui, api
tags: [nextjs, supabase, cqc-api, resend, edge-function, admin-verification, marketplace, compliance]

# Dependency graph
requires:
  - phase: 32-01
    provides: "marketplace_companies table, compliance_documents table, compliance-documents storage bucket, TypeScript types, CQC client, compliance utilities"
provides:
  - "Admin verification queue page at /platform/verification"
  - "Admin company detail page at /platform/verification/{id} with document preview and admin actions"
  - "VerifiedBadge reusable component for marketplace verification status display"
  - "Admin action library: approveCompany, rejectCompany, requestMoreInfo, suspendCompany"
  - "POST /api/marketplace/verify endpoint for admin verification actions + CQC re-check"
  - "CQC daily check Edge Function (cqc-verify) for automated CQC and document expiry monitoring"
  - "Platform admin sidebar now includes Verification nav link"
affects:
  - 32-04 (admin verification integration testing)
  - 33-event-creation (verified badge reusable on marketplace profiles)
  - 34-quoting-matching (can_submit_quotes gate enforced by admin verification)
  - 35-payments (suspension workflow impacts active marketplace bookings)

# Tech tracking
tech-stack:
  added: []
  patterns: [service-role client for admin actions bypassing RLS, signed URL document preview, Edge Function with dual-purpose checks]

key-files:
  created:
    - web/components/marketplace/VerifiedBadge.tsx
    - web/lib/marketplace/admin-actions.ts
    - web/app/platform/verification/page.tsx
    - web/app/platform/verification/[id]/page.tsx
    - web/app/api/marketplace/verify/route.ts
    - supabase/functions/cqc-verify/index.ts
  modified:
    - web/app/platform/layout.tsx

key-decisions:
  - "Admin actions use service-role Supabase client because platform admin has org_id=NULL, RLS would block direct writes to marketplace tables"
  - "Document preview uses 1-hour signed URLs from compliance-documents storage bucket"
  - "CQC Edge Function combines both CQC status checks and document expiry monitoring in a single function for operational simplicity"
  - "CQC API requests rate-limited at 50ms intervals to respect API limits"
  - "Active bookings flagged for admin review on suspension (NOT auto-cancelled per CONTEXT decision)"

patterns-established:
  - "Marketplace admin action pattern: API route validates platform_admin role then calls admin-actions lib functions which use service-role client"
  - "Verification badge pattern: VerifiedBadge component maps VerificationStatus to icon + color + label, reusable across admin and public-facing pages"
  - "Dual-purpose Edge Function: single scheduled function handles multiple compliance check types (CQC + document expiry)"

# Metrics
duration: 11min
completed: 2026-02-19
---

# Phase 32 Plan 03: Admin Verification Queue and CQC Monitoring Summary

**Admin verification queue with approve/reject/request-info workflow, VerifiedBadge component, and daily CQC + document expiry Edge Function**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-19T20:42:34Z
- **Completed:** 2026-02-19T20:53:56Z
- **Tasks:** 2 auto + 1 checkpoint
- **Files created:** 6
- **Files modified:** 1

## Accomplishments
- Built admin verification queue listing pending marketplace companies sorted oldest-first (FIFO) with tab filters, search, and status badges
- Built company detail page showing full company info, CQC status, compliance documents with signed URL preview, and approve/reject/request-info actions
- Created admin action library with email notifications using existing Resend pattern for all status changes
- Created CQC daily check Edge Function handling both CQC registration status checks and document expiry monitoring
- Added Verification nav link to platform admin sidebar
- Created reusable VerifiedBadge component for marketplace verification status display

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin verification queue and detail page** - `f187616` (feat)
2. **Task 2: Create CQC daily check Edge Function** - `cab9be3` (feat)

Note: The API route (web/app/api/marketplace/verify/route.ts) was committed as part of Task 2 content but a parallel session also committed an equivalent version in `a45b965`.

## Files Created/Modified
- `web/components/marketplace/VerifiedBadge.tsx` - Reusable badge component mapping VerificationStatus to icon/color/label (sm/md/lg sizes)
- `web/lib/marketplace/admin-actions.ts` - Server-side admin functions: approveCompany, rejectCompany, requestMoreInfo, suspendCompany with service-role client and email notifications
- `web/app/platform/verification/page.tsx` - Admin verification queue with tab filters (Pending/Info Requested/All), search, table with CQC auto-verified badge and document count
- `web/app/platform/verification/[id]/page.tsx` - Company detail page with company info, CQC verification, compliance documents table with signed URL viewer, and admin action forms
- `web/app/api/marketplace/verify/route.ts` - POST endpoint handling approve/reject/request_info/cqc_recheck actions with platform_admin auth check
- `supabase/functions/cqc-verify/index.ts` - Edge Function: PART 1 checks CQC status for all active companies (50ms rate limit), PART 2 checks document expiry and sends 30-day warnings
- `web/app/platform/layout.tsx` - Added ShieldCheck import and Verification nav item to platform admin sidebar

## Decisions Made
- Used service-role client pattern (matching web/app/api/platform/organizations/activate/route.ts) for all admin actions since platform admin has org_id=NULL
- Document signed URLs set to 1-hour expiry for security while allowing sufficient review time
- Combined CQC and document expiry checks in a single Edge Function (cqc-verify) rather than separate functions, reducing operational complexity
- CQC API rate limiting at 50ms per request stays well within the 2000 req/min partner limit
- Suspension of companies flags active marketplace bookings for admin review (console.warn) but does NOT auto-cancel bookings, per CONTEXT decision that human judgement is needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- A parallel session had already committed the API route file (`web/app/api/marketplace/verify/route.ts`) in commit `a45b965`. The version written by this session was identical, so no conflict occurred.

## User Setup Required
None - no external service configuration required. CQC API is public and free. RESEND_API_KEY is already configured from previous phases.

## Next Phase Readiness
- Admin verification queue ready for testing at /platform/verification
- CQC Edge Function ready for pg_cron scheduling (`SELECT cron.schedule('cqc-daily-check', '0 6 * * *', $$...$$)`)
- VerifiedBadge component ready for reuse on marketplace profile pages in future phases
- All admin actions send email notifications via existing Resend integration

---
*Phase: 32-foundation-schema-registration*
*Completed: 2026-02-19*
