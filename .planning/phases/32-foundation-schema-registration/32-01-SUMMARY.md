---
phase: 32-foundation-schema-registration
plan: 01
subsystem: database
tags: [postgresql, supabase, rls, btree_gist, exclusion-constraint, storage, cqc-api, typescript, marketplace]

# Dependency graph
requires:
  - phase: 00001_organizations
    provides: "organizations table (FK target for marketplace_companies.org_id)"
  - phase: 002_business_operations
    provides: "medics table (FK target for medic_commitments.medic_id), bookings table (ALTER for source column), clients table (ALTER for marketplace_enabled), update_updated_at_column() trigger function"
  - phase: 101_migrate_to_platform_admin
    provides: "is_platform_admin() helper function used in RLS policies"
provides:
  - "marketplace_companies table with CQC fields, Stripe Connect, verification workflow"
  - "medic_commitments table with EXCLUSION constraint for double-booking prevention"
  - "compliance_documents table with document_type discriminator and review workflow"
  - "compliance-documents private storage bucket (10MB, PDF/image/DOC)"
  - "bookings.source column discriminating 'direct' vs 'marketplace'"
  - "clients.marketplace_enabled flag"
  - "TypeScript interfaces: MarketplaceCompany, ComplianceDocument, MedicCommitment, CQCProvider"
  - "CQC API client: verifyCQCProvider() with error handling"
  - "Compliance utilities: isDocumentExpired(), getExpiringDocuments(), hasAllRequiredDocuments()"
affects:
  - 32-02 (company registration wizard uses types + CQC client)
  - 32-03 (document upload uses compliance_documents table + storage bucket)
  - 32-04 (admin verification queue queries marketplace_companies)
  - 33-event-creation (events reference marketplace tables)
  - 34-quoting-matching (medic_commitments EXCLUSION prevents double-booking)
  - 35-payments (Stripe Connect columns on marketplace_companies)

# Tech tracking
tech-stack:
  added: [btree_gist extension]
  patterns: [user_id-based RLS for marketplace (not org_id), EXCLUSION constraint for temporal overlap prevention, private storage bucket with company-folder-scoped RLS]

key-files:
  created:
    - supabase/migrations/140_marketplace_foundation.sql
    - supabase/migrations/141_compliance_documents.sql
    - supabase/migrations/142_marketplace_storage_bucket.sql
    - web/lib/marketplace/types.ts
    - web/lib/marketplace/cqc-client.ts
    - web/lib/marketplace/compliance.ts
  modified: []

key-decisions:
  - "RLS policies use auth.uid() and is_platform_admin() — NOT get_user_org_id() — marketplace is cross-org by design"
  - "EXCLUSION USING GIST on medic_commitments(medic_id, time_range) prevents same-medic overlapping commitments at the database level"
  - "Storage bucket RLS uses JOIN to marketplace_companies to verify folder ownership by company admin"
  - "CQC client uses cache: no-store (standard) instead of next: { revalidate: 0 } (Next.js extension) for TypeScript strict compatibility"

patterns-established:
  - "Marketplace user_id-based RLS: all marketplace tables use auth.uid() for ownership, is_platform_admin() for admin access"
  - "Compliance document storage: {company_id}/{document_type}/{filename} folder convention with company-admin-scoped RLS"
  - "EXCLUSION constraint pattern: btree_gist + TSRANGE for temporal overlap prevention"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 32 Plan 01: Marketplace Foundation Summary

**PostgreSQL marketplace schema with btree_gist EXCLUSION constraints, user_id-based RLS, private compliance storage bucket, CQC API client, and TypeScript type library**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T20:34:39Z
- **Completed:** 2026-02-19T20:38:07Z
- **Tasks:** 3
- **Files created:** 6

## Accomplishments
- Created marketplace_companies table with full CQC verification workflow, Stripe Connect columns, and bidirectional org crossover link
- Created medic_commitments table with PostgreSQL EXCLUSION constraint preventing same-medic overlapping time ranges (race condition prevention)
- Created compliance_documents table with document_type discriminator, expiry tracking, and admin review workflow
- Created private compliance-documents storage bucket with company-folder-scoped RLS
- Built TypeScript type library mirroring all SQL schemas exactly
- Built CQC API client with comprehensive error handling (404, non-200, network failures)
- Built compliance utility functions for expiry checking and required-document validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create marketplace foundation migration** - `96291c6` (feat)
2. **Task 2: Create compliance documents migration and storage bucket** - `3246b19` (feat)
3. **Task 3: Create TypeScript types, CQC client, and compliance utilities** - `99ada95` (feat)

## Files Created/Modified
- `supabase/migrations/140_marketplace_foundation.sql` - marketplace_companies + medic_commitments tables, bookings.source column, clients.marketplace_enabled flag, RLS policies, EXCLUSION constraint, indexes
- `supabase/migrations/141_compliance_documents.sql` - compliance_documents table with document_type CHECK, expiry tracking, review workflow, RLS policies, indexes
- `supabase/migrations/142_marketplace_storage_bucket.sql` - Private compliance-documents storage bucket with owner-only + admin RLS (4 policies)
- `web/lib/marketplace/types.ts` - TypeScript interfaces for MarketplaceCompany, ComplianceDocument, MedicCommitment, CQCProvider, CQCVerificationResult, and union types
- `web/lib/marketplace/cqc-client.ts` - CQC API client with verifyCQCProvider() function
- `web/lib/marketplace/compliance.ts` - Compliance utilities: isDocumentExpired(), getExpiringDocuments(), hasAllRequiredDocuments(), REQUIRED_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS

## Decisions Made
- RLS policies use `auth.uid()` and `is_platform_admin()` only — no `get_user_org_id()` usage in any marketplace migration (cross-org by design, as decided in v4.0 architecture)
- Used `cache: 'no-store'` instead of `next: { revalidate: 0 }` in CQC client for TypeScript strict mode compatibility — both achieve the same no-caching behavior
- Storage bucket folder convention `{company_id}/{document_type}/{filename}` enables company-scoped RLS via JOIN to marketplace_companies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript compilation error in CQC client**
- **Found during:** Task 3 (TypeScript types and CQC client)
- **Issue:** `next: { revalidate: 0 }` is a Next.js-specific extension of `RequestInit` not recognized by TypeScript strict mode
- **Fix:** Changed to standard `cache: 'no-store'` which achieves the same no-caching behavior
- **Files modified:** web/lib/marketplace/cqc-client.ts
- **Verification:** `npx tsc --noEmit --strict` compiles without errors
- **Committed in:** 99ada95 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial fix for TypeScript compatibility. No scope creep.

## Issues Encountered
None beyond the auto-fixed TypeScript compilation issue.

## User Setup Required
None - no external service configuration required. CQC API is public and free.

## Next Phase Readiness
- All marketplace tables, types, and utilities ready for Phase 32 Plans 02-04
- Registration wizard (32-02) can import types from `web/lib/marketplace/types.ts` and use CQC client
- Document upload (32-03) can use compliance_documents table and storage bucket
- Admin verification (32-04) can query marketplace_companies with verification_status filters
- Migrations 140, 141, 142 need to be applied to production database when ready

---
*Phase: 32-foundation-schema-registration*
*Completed: 2026-02-19*
