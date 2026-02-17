---
phase: 07-certification-tracking
plan: 01
subsystem: database
tags: [postgresql, jsonb, gin-index, rpc, typescript, certification-tracking]

# Dependency graph
requires:
  - phase: 02-mobile-core
    provides: medics table with certifications JSONB column
provides:
  - GIN index on medics.certifications for fast JSONB queries
  - certification_reminders audit table with RLS
  - PostgreSQL RPC functions for expiry queries (get_certifications_expiring_in_days, get_certification_summary_by_org, get_expired_cert_count_by_org)
  - TypeScript types for certification tracking (Certification, CertificationStatus, ReminderStage, etc.)
  - Foundation for progressive reminder system (30/14/7/1 day stages)
affects: [07-02-expiry-checker, 07-03-dashboard-ui, compliance-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSONB GIN indexing for flexible schema with fast queries"
    - "Audit trail table pattern for compliance tracking"
    - "PostgreSQL RPC functions as data layer for complex queries"
    - "Progressive reminder stages configuration"

key-files:
  created:
    - supabase/migrations/031_certification_tracking.sql
    - web/types/certification.types.ts
  modified: []

key-decisions:
  - "Use JSONB with GIN index instead of separate certifications table - better performance for low cardinality (~5 certs per medic)"
  - "certification_reminders table provides audit trail and prevents duplicate emails - critical for compliance"
  - "Progressive reminder stages: 30/14/7/1 days before expiry - matches construction industry urgency requirements"
  - "RPC functions return formatted data (e.g., expiry_date_formatted, renewal_url) - reduces client-side processing"

patterns-established:
  - "Pattern: JSONB certification storage with GIN indexing - extract with jsonb_array_elements in RPC functions"
  - "Pattern: Audit trail tables for compliance - prevents duplicates, provides regulatory proof"
  - "Pattern: STABLE RPC functions for query optimization - database can cache query plans"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 7 Plan 01: Certification Tracking Foundation Summary

**JSONB certification tracking with GIN indexing, audit trail table, and 3 PostgreSQL RPC functions for expiry queries**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-17T00:35:13Z
- **Completed:** 2026-02-17T00:37:16Z
- **Tasks:** 2
- **Files modified:** 2 (created)

## Accomplishments
- GIN index on medics.certifications enables fast JSONB queries for expiry checking
- certification_reminders audit table with RLS prevents duplicate emails and provides compliance audit trail
- 3 PostgreSQL RPC functions: get_certifications_expiring_in_days (for cron job), get_certification_summary_by_org (for dashboard), get_expired_cert_count_by_org (for compliance score)
- TypeScript types file establishes shared interfaces between database, Edge Functions, and UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Create certification tracking migration** - `1ce3e4b` (feat)
   - GIN index, certification_reminders table with RLS, 3 RPC functions
   - Includes renewal URLs for CSCS, CPCS, IPAF, PASMA, Gas Safe certification bodies

2. **Task 2: Create TypeScript certification types** - `d466be3` (feat)
   - UK_CERT_TYPES constant, Certification interface, CertificationStatus type
   - REMINDER_STAGES config, CertificationSummary, ExpiringCertification, CertificationReminder
   - CERT_RENEWAL_URLS mapping

## Files Created/Modified

- `supabase/migrations/031_certification_tracking.sql` - Database infrastructure: GIN index, certification_reminders table with (medic_id, cert_type, days_before, sent_at) composite index, 3 RPC functions (get_certifications_expiring_in_days, get_certification_summary_by_org, get_expired_cert_count_by_org)
- `web/types/certification.types.ts` - TypeScript types: Certification interface matching JSONB schema, CertificationStatus for UI states, ReminderStage and REMINDER_STAGES config (30/14/7/1 days), CertificationSummary, ExpiringCertification, CertificationReminder, CERT_RENEWAL_URLS

## Decisions Made

1. **JSONB with GIN index vs separate table:** Chose JSONB array with GIN indexing for certifications. Rationale: Low cardinality (~5 certs per medic), flexible schema for future cert types, GIN index provides fast queries without JOIN overhead. Separate table only beneficial for high cardinality or complex relationships.

2. **certification_reminders audit table:** Essential for compliance and preventing duplicates. Composite index on (medic_id, cert_type, days_before, sent_at) enables efficient duplicate checking. resend_message_id field provides delivery tracking. RLS ensures org-scoped access.

3. **Progressive reminder stages:** 30/14/7/1 days before expiry sequence matches construction industry urgency requirements (compressed vs healthcare's 90/60/30/15/7). Each stage escalates recipients (medic → medic+manager → medic+manager+admin) and urgency (info → warning → critical).

4. **RPC functions return formatted data:** Functions return expiry_date_formatted ('DD Mon YYYY'), renewal_url CASE statement, and days_remaining calculation. Reduces client-side processing, ensures consistent formatting, provides single source of truth for renewal URLs.

5. **STABLE function marking:** All 3 RPC functions marked as STABLE (not VOLATILE). Rationale: Functions don't modify data, output depends only on input parameters and current date. Enables PostgreSQL query plan caching and optimization.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Migration file and TypeScript types created successfully with no compilation errors.

## User Setup Required

None - no external service configuration required. This plan only creates database infrastructure and TypeScript types.

## Next Phase Readiness

**Ready for Plan 02 (certification-expiry-checker Edge Function):**
- RPC function get_certifications_expiring_in_days() ready for daily cron job
- certification_reminders table ready for audit trail inserts
- TypeScript types (ExpiringCertification, ReminderStage, REMINDER_STAGES) ready for import in Edge Function

**Ready for Plan 03 (certification dashboard UI):**
- RPC function get_certification_summary_by_org() ready for dashboard queries
- TypeScript types (CertificationSummary, CertificationStatus) ready for UI components
- GIN index ensures fast dashboard loading with >500 medics

**Ready for compliance score integration:**
- RPC function get_expired_cert_count_by_org() replaces hardcoded 0 in compliance calculations

**No blockers.** All foundation infrastructure in place for certification tracking feature development.

---
*Phase: 07-certification-tracking*
*Completed: 2026-02-17*
