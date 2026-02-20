---
phase: 37-company-accounts
plan: 01
subsystem: database, api
tags: [postgres, rls, triggers, typescript, zod, react-query, jose, jwt, resend, date-fns]

# Dependency graph
requires:
  - phase: 32-foundation
    provides: marketplace_companies table, medic_commitments, auth.uid() RLS pattern
  - phase: 34-quoting
    provides: marketplace_quotes table, staffing_plan JSONB structure
  - phase: 36-ratings
    provides: average_rating/review_count denormalized columns, company aggregate trigger pattern
provides:
  - company_roster_medics junction table (many-to-many company/medic)
  - RLS policies for roster CRUD (company admin, medic view, platform admin, public active)
  - validate_quote_roster_membership trigger on marketplace_quotes
  - update_company_roster_aggregations trigger for roster_size
  - Denormalized roster_size and insurance_status on marketplace_companies
  - 7 API routes for roster CRUD + invitation workflow + company profile
  - TypeScript types for all roster entities
  - Zod validation schemas for all roster operations
  - React Query hooks (useCompanyRoster, useCompanyProfile)
  - Medic availability checking utilities
affects: [37-02 (roster UI), 37-03 (assignment), 34.1 (direct jobs roster integration)]

# Tech tracking
tech-stack:
  added: [jose 6.1.3]
  patterns: [JWT invitation workflow, soft-delete for roster removal, fire-and-forget email with dev fallback]

key-files:
  created:
    - supabase/migrations/156_company_roster_medics.sql
    - web/lib/marketplace/roster-types.ts
    - web/lib/marketplace/roster-schemas.ts
    - web/lib/marketplace/medic-availability.ts
    - web/app/api/marketplace/roster/route.ts
    - web/app/api/marketplace/roster/[id]/route.ts
    - web/app/api/marketplace/roster/invite/route.ts
    - web/app/api/marketplace/roster/accept/route.ts
    - web/app/api/marketplace/companies/[id]/profile/route.ts
    - web/lib/queries/marketplace/roster.ts
  modified:
    - FEATURES.md

key-decisions:
  - "Soft-delete for roster removal (status=inactive, left_at=now) preserves audit trail and historical quote references"
  - "jose library for JWT invitation tokens (Edge-compatible, no jsonwebtoken)"
  - "v_medic_id loop variable in trigger to avoid column name ambiguity"
  - "Medic can belong to multiple company rosters simultaneously (multi-company freelance support)"
  - "Invitation token 7-day expiry with company_id + email in JWT payload"
  - "Fire-and-forget Resend email with console.log dev fallback (never blocks API)"

patterns-established:
  - "JWT invitation workflow: sign with jose, verify on accept, link medic record"
  - "Soft-delete pattern for roster: status=inactive + left_at instead of DELETE"
  - "Company profile with denormalized aggregates + limited team preview (no private details)"

# Metrics
duration: 16min
completed: 2026-02-20
---

# Phase 37 Plan 01: Roster Data Layer & API Summary

**Company roster junction table with RLS, triggers, 7 API routes (CRUD + JWT invitation + profile), TypeScript types, Zod schemas, and React Query hooks**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-20T18:12:14Z
- **Completed:** 2026-02-20T18:29:11Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- company_roster_medics junction table with 4 RLS policies, 3 triggers, and 4 indexes
- validate_quote_roster_membership trigger ensures named medics in quotes belong to active roster
- Full invitation workflow: JWT token generation (jose), email via Resend, token verification on accept
- Company profile API with denormalized aggregations and team preview
- Complete TypeScript type system, Zod validation schemas, and React Query hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and trigger functions** - `a0760e2` (feat)
2. **Task 2: TypeScript types, schemas, API routes, hooks** - `8f831f1` + `e1a0293` (feat)

Note: Task 2 code was auto-committed by `pnpm add jose` (8f831f1), FEATURES.md committed separately (e1a0293).

## Files Created/Modified
- `supabase/migrations/156_company_roster_medics.sql` - Junction table, RLS, triggers, indexes, ALTER marketplace_companies
- `web/lib/marketplace/roster-types.ts` - CompanyRosterMedic, CompanyProfileDisplay, RosterInvitation, status labels
- `web/lib/marketplace/roster-schemas.ts` - Zod schemas: rosterAddSchema, rosterInviteSchema, rosterUpdateSchema, rosterAcceptSchema
- `web/lib/marketplace/medic-availability.ts` - isMedicAvailableOnDate, getAvailableRosterMedics (date-fns)
- `web/app/api/marketplace/roster/route.ts` - GET list + POST add roster endpoints
- `web/app/api/marketplace/roster/[id]/route.ts` - PATCH update + DELETE soft-remove endpoints
- `web/app/api/marketplace/roster/invite/route.ts` - POST invitation with jose JWT signing + Resend email
- `web/app/api/marketplace/roster/accept/route.ts` - POST accept invitation with jose JWT verification
- `web/app/api/marketplace/companies/[id]/profile/route.ts` - GET company profile with team preview
- `web/lib/queries/marketplace/roster.ts` - useCompanyRoster, useCompanyProfile React Query hooks
- `FEATURES.md` - Updated with Phase 37 roster management documentation

## Decisions Made
- **Soft-delete for roster removal**: Sets status='inactive' + left_at instead of deleting rows. Preserves audit trail and prevents breaking historical quote references that link to roster medics.
- **jose for JWT**: Chose jose (v6.1.3) over jsonwebtoken because it's Edge-compatible and ESM-native. Consistent with the plan's recommendation.
- **v_medic_id loop variable**: Used `v_medic_id` instead of `medic_id` in the validate_quote_roster_membership trigger to avoid PostgreSQL column name ambiguity, as specified in the plan.
- **Multi-company membership**: A medic can belong to multiple company rosters simultaneously, reflecting UK freelance medic reality. UNIQUE constraint is on (company_id, medic_id), not just medic_id.
- **7-day invitation expiry**: JWT tokens for roster invitations expire in 7 days. Payload contains company_id + email + type for validation on accept.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed jose dependency**
- **Found during:** Task 2 (API route creation)
- **Issue:** jose package not installed, needed for JWT invitation token signing/verification
- **Fix:** Ran `pnpm add jose` (v6.1.3)
- **Files modified:** web/package.json, web/pnpm-lock.yaml
- **Verification:** Import succeeds, TypeScript compilation passes
- **Committed in:** 8f831f1

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Essential for JWT invitation workflow. No scope creep.

## Issues Encountered
- The `pnpm add jose` command triggered an auto-commit (8f831f1) that included all newly created Task 2 files. This was caused by a concurrent agent process. The files were committed correctly but with a generic commit message rather than the planned atomic Task 2 commit message. FEATURES.md update was committed separately (e1a0293).

## User Setup Required
None - no external service configuration required. JWT_SECRET env var has a dev fallback. RESEND_API_KEY is optional (falls back to console.log in dev).

## Next Phase Readiness
- Roster data layer complete, ready for Plan 02 (Roster Management UI) and Plan 03 (Assignment & Profile)
- Migration 156 needs to be applied to production (added to pending todos)
- All API routes follow existing marketplace patterns (auth, RLS, error handling)
- React Query hooks ready for UI integration

---
*Phase: 37-company-accounts*
*Completed: 2026-02-20*
