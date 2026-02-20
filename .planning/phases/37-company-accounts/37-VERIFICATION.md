---
phase: 37-company-accounts
verified: 2026-02-20T18:51:52Z
status: gaps_found
score: 3/5 must-haves verified
gaps:
  - truth: "Company profiles display company name, roster size, average rating, total events completed, and insurance status"
    status: partial
    reason: "CompanyProfileCard shows company name, roster size, rating, insurance, and coverage -- but does NOT display 'total events completed' (4th stat is Coverage instead)"
    artifacts:
      - path: "web/components/marketplace/roster/CompanyProfileCard.tsx"
        issue: "4-stat grid shows Team Size, Rating, Insurance, Coverage -- no 'total events completed' stat"
      - path: "web/app/api/marketplace/companies/[id]/profile/route.ts"
        issue: "API does not return total_events_completed -- no such column on marketplace_companies"
      - path: "supabase/migrations/156_company_roster_medics.sql"
        issue: "Migration did not add total_events_completed column to marketplace_companies"
    missing:
      - "ALTER TABLE marketplace_companies ADD COLUMN total_events_completed INTEGER DEFAULT 0"
      - "Trigger or aggregation function to count completed bookings per company"
      - "Include total_events_completed in company profile API response"
      - "Replace Coverage stat (4th slot) with Events Completed in CompanyProfileCard, or add a 5th stat"
  - truth: "Company admin can manage medic availability and qualifications within the roster"
    status: partial
    reason: "MedicAvailabilityModal exists (271 lines, fully implemented) but is ORPHANED -- never imported or rendered anywhere in the app. The Edit button on RosterMedicCard is a stub that only shows toast.info('Edit functionality coming soon'). Admin cannot edit qualifications, title, or availability from the UI."
    artifacts:
      - path: "web/components/marketplace/roster/RosterMedicCard.tsx"
        issue: "Line 244-246: Edit button onClick only calls toast.info('Edit functionality coming soon') -- stub"
      - path: "web/components/marketplace/roster/MedicAvailabilityModal.tsx"
        issue: "Component exists with full implementation (PATCH API calls, date pickers, clear button) but is never imported or rendered by any other file"
    missing:
      - "Wire Edit button on RosterMedicCard to open an edit flow (title, qualifications, hourly rate editing)"
      - "Wire MedicAvailabilityModal into the roster management page or RosterMedicCard"
      - "Import and render MedicAvailabilityModal in RosterMedicCard or roster page"
---

# Phase 37: Company Accounts Verification Report

**Phase Goal:** Medic companies can manage a roster of individual medics, assign specific medics to events when quoting, and display rich company profiles -- individual medics cannot bid independently on the marketplace (companies only)
**Verified:** 2026-02-20T18:51:52Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Company admin can add individual medics to their roster -- each with their own profile, certifications, and ratings | VERIFIED (with note) | AddMedicModal (339 lines) with live search + POST to roster API. InviteMedicModal (248 lines) with email + JWT invitation. Qualifications displayed per medic. Individual medic ratings not shown but ratings are company-level by design (Phase 36). |
| 2 | Company admin can assign specific medic(s) from their roster to events when quoting (named staff option from Phase 34) | VERIFIED | StaffingPlanSection (357 lines) wired to RosterMedicPicker (197 lines). Named medics flow uses real roster data with qualification filtering and availability indicators. Free-text fallback for edge cases. Quote roster validation trigger enforces roster membership at DB level. |
| 3 | Company profiles display company name, roster size, average rating, total events completed, and insurance status | FAILED (partial) | CompanyProfileCard shows 4 stats: Team Size, Rating, Insurance, Coverage. Missing "total events completed" -- no DB column, no API field, no UI element. Coverage shown instead. |
| 4 | Company admin can manage medic availability and qualifications within the roster | FAILED (partial) | MedicAvailabilityModal fully implemented (271 lines) with date pickers, reason field, PATCH API -- but ORPHANED (never imported/rendered). Edit button on RosterMedicCard is a stub: toast.info('Edit functionality coming soon'). PATCH API route works correctly. |
| 5 | Roster changes are reflected in the company's quoting capabilities (e.g. removing a paramedic from roster means fewer paramedic-qualified staff available for quotes) | VERIFIED | validate_quote_roster_membership trigger prevents naming non-active-roster medics in quotes. update_company_roster_aggregations trigger keeps roster_size in sync. RosterMedicPicker only shows active roster medics. Soft-delete (status=inactive) removes from picker. |

**Score:** 3/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/156_company_roster_medics.sql` | Junction table, RLS, triggers, indexes | VERIFIED | 250 lines. 4 RLS policies, 3 triggers, 4 indexes, ALTER marketplace_companies for roster_size + insurance_status |
| `web/lib/marketplace/roster-types.ts` | TypeScript types for roster entities | VERIFIED | 138 lines. CompanyRosterMedic, CompanyProfileDisplay, TeamMemberPreview, RosterInvitation, status labels |
| `web/lib/marketplace/roster-schemas.ts` | Zod validation schemas | VERIFIED | 113 lines. 4 schemas: rosterAdd, rosterInvite, rosterUpdate, rosterAccept |
| `web/lib/marketplace/medic-availability.ts` | Availability checking utilities | VERIFIED | 95 lines. isMedicAvailableOnDate, getAvailableRosterMedics with date-fns |
| `web/lib/marketplace/company-profile.ts` | Display utilities | VERIFIED | 120 lines. formatCompanyProfile, getInsuranceBadgeColor, getVerificationBadgeLabel, formatMemberSince |
| `web/app/api/marketplace/roster/route.ts` | GET list + POST add | VERIFIED | 203 lines. Auth, company admin check, Supabase join, status filter, Zod validation |
| `web/app/api/marketplace/roster/[id]/route.ts` | PATCH update + DELETE soft-remove | VERIFIED | 184 lines. Auth, ownership check, soft-delete pattern |
| `web/app/api/marketplace/roster/invite/route.ts` | POST invitation with JWT + email | VERIFIED | 193 lines. jose SignJWT, duplicate check, Resend email with dev fallback |
| `web/app/api/marketplace/roster/accept/route.ts` | POST accept with JWT verify | VERIFIED | 161 lines. jose jwtVerify, medic record linking, conflict handling |
| `web/app/api/marketplace/companies/[id]/profile/route.ts` | GET company profile | VERIFIED | 110 lines. Denormalized aggregations, team preview (5 medics) |
| `web/lib/queries/marketplace/roster.ts` | React Query hooks | VERIFIED | 87 lines. useCompanyRoster, useCompanyProfile with staleTime/gcTime |
| `web/stores/useCompanyRosterStore.ts` | Zustand UI state store | VERIFIED | 117 lines. statusFilter, searchTerm, modal open/close, selectedMedicId |
| `web/app/(dashboard)/dashboard/marketplace/roster/page.tsx` | Roster management page | VERIFIED | 232 lines. Company detection, filter tabs, search, roster grid, modals |
| `web/components/marketplace/roster/RosterList.tsx` | Roster grid with loading/empty states | VERIFIED | 105 lines. 3-col grid, skeleton cards, empty state with CTAs |
| `web/components/marketplace/roster/RosterMedicCard.tsx` | Medic card with actions | PARTIAL (stub) | 287 lines. Status badges, qualifications, availability, remove -- but Edit button is stub |
| `web/components/marketplace/roster/AddMedicModal.tsx` | Search and add existing medics | VERIFIED | 339 lines. ILIKE search, selection, optional title/qualifications, POST |
| `web/components/marketplace/roster/InviteMedicModal.tsx` | Email invitation modal | VERIFIED | 248 lines. Email input, validation, POST to invite API, 7-day expiry note |
| `web/app/(dashboard)/dashboard/marketplace/roster/accept/page.tsx` | Invitation acceptance page | VERIFIED | 163 lines. JWT processing, Suspense boundary, success/error/no-token states |
| `web/app/(dashboard)/dashboard/marketplace/company/[id]/page.tsx` | Company profile page | VERIFIED | 158 lines. CompanyProfileCard, MeetTheTeam, CompanyRatingsSummary |
| `web/components/marketplace/roster/CompanyProfileCard.tsx` | Stats card | PARTIAL | 122 lines. Shows 4 stats but missing "total events completed" |
| `web/components/marketplace/roster/MeetTheTeam.tsx` | Team preview section | VERIFIED | 129 lines. Up to 6 medics, qualification badges, "+X more", manage link |
| `web/components/marketplace/roster/MedicAvailabilityModal.tsx` | Date-range availability modal | ORPHANED | 271 lines. Fully implemented but never imported/rendered by any component |
| `web/components/marketplace/roster/RosterMedicPicker.tsx` | Medic picker for quotes | VERIFIED | 197 lines. Qualification filter, exclusion, availability dots |
| `web/components/marketplace/quote-submission/StaffingPlanSection.tsx` | Staffing plan (modified) | VERIFIED | 357 lines. RosterMedicPicker wired, free-text fallback, companyId auto-detection |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| RosterPage | GET /api/marketplace/roster | useCompanyRoster React Query hook | WIRED | Fetches roster with status filter, renders via RosterList |
| AddMedicModal | POST /api/marketplace/roster | fetch() with JSON body | WIRED | Search, select, add with Zod validation, cache invalidation |
| InviteMedicModal | POST /api/marketplace/roster/invite | fetch() with JSON body | WIRED | Email, title, qualifications sent, cache invalidation |
| AcceptPage | POST /api/marketplace/roster/accept | fetch() with JWT token | WIRED | Token from URL params, success/error states |
| RosterMedicCard | DELETE /api/marketplace/roster/[id] | fetch() with DELETE method | WIRED | Soft-remove with confirmation dialog, cache invalidation |
| CompanyProfilePage | GET /api/marketplace/companies/[id]/profile | useCompanyProfile React Query hook | WIRED | Formats profile, renders CompanyProfileCard + MeetTheTeam |
| StaffingPlanSection | RosterMedicPicker | import + render | WIRED | Detects companyId, renders picker, handles selection |
| RosterMedicPicker | GET /api/marketplace/roster | useCompanyRoster('active') | WIRED | Filters by qualification, excludes selected, availability dots |
| RosterMedicCard | Edit Flow | onClick handler | NOT WIRED | Edit button is stub: toast.info('Edit functionality coming soon') |
| MedicAvailabilityModal | PATCH /api/marketplace/roster/[id] | fetch() with JSON body | WIRED internally | Modal works but is ORPHANED -- never mounted in any parent |
| validate_quote_roster_membership | marketplace_quotes | BEFORE INSERT OR UPDATE trigger | WIRED | Rejects quotes with non-roster named medics at DB level |
| update_company_roster_aggregations | marketplace_companies.roster_size | AFTER INSERT OR UPDATE OR DELETE trigger | WIRED | Recalculates active roster count |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| RosterMedicCard.tsx | 245-246 | `// Edit functionality - placeholder for now` + `toast.info('Edit functionality coming soon')` | BLOCKER | Prevents admin from editing medic details (title, qualifications, availability) from the roster card |
| MedicAvailabilityModal.tsx | (entire file) | ORPHANED -- never imported | BLOCKER | Fully implemented component (271 lines) that is never rendered; admin cannot set medic availability from UI |

### Human Verification Required

### 1. Roster Management Flow
**Test:** Log in as a company admin, navigate to /dashboard/marketplace/roster, add a medic, invite another by email
**Expected:** Medic appears in roster grid with status badges, invitation email sent
**Why human:** Full user flow with auth, database writes, and email delivery

### 2. Company Profile Display
**Test:** Navigate to /dashboard/marketplace/company/{companyId} and inspect the stats grid
**Expected:** Company name, verified badge, team size, rating, insurance status displayed correctly
**Why human:** Visual layout verification

### 3. Quote Staffing Picker
**Test:** Create a new quote, select "Named Medics" mode, verify roster picker appears
**Expected:** Active roster medics shown with availability dots, can select and add to staffing plan
**Why human:** Multi-component interaction flow

### 4. Invitation Acceptance
**Test:** Click an invitation link with a valid JWT token while logged in
**Expected:** Roster membership activated, success message shown
**Why human:** JWT token generation and verification flow

### Gaps Summary

Two gaps block full goal achievement:

**Gap 1: Missing "total events completed" on company profile (Truth #3).** The CompanyProfileCard displays 4 stats -- Team Size, Rating, Insurance, Coverage -- but the success criteria requires "total events completed." No database column, API field, or UI element exists for this metric. This requires adding a denormalized column to marketplace_companies and a trigger or calculation to count completed bookings.

**Gap 2: Edit/Availability management is not wired in the UI (Truth #4).** The MedicAvailabilityModal is fully implemented (271 lines with date pickers, PATCH calls, and clear functionality) but is never imported or rendered by any component. The Edit button on RosterMedicCard is a stub that shows "Edit functionality coming soon." The PATCH API route works correctly, but the UI has no way to invoke it. This means a company admin cannot change a medic's title, qualifications, hourly rate, or availability from the roster management page.

Both gaps have the infrastructure in place (API routes work, modal component is built) but lack the final wiring to make the functionality accessible to users.

---

_Verified: 2026-02-20T18:51:52Z_
_Verifier: Claude (gsd-verifier)_
