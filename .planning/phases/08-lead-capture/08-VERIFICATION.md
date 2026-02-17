---
phase: 08-lead-capture
verified: 2026-02-17T12:00:00Z
status: passed
score: 13/13 must-haves verified
---

# Phase 08: Lead Capture & Data Persistence — Verification Report

**Phase Goal:** Persist contact form and quote builder submissions to the database so no lead is lost and admins can follow up.
**Verified:** 2026-02-17T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | contact_submissions table exists with all required columns and RLS | VERIFIED | `supabase/migrations/116_lead_capture_tables.sql` — CREATE TABLE with all 13 columns, RLS enabled, 6 policies |
| 2 | quote_submissions table exists with TEXT[] special_requirements and converted_booking_id FK | VERIFIED | Same migration — `special_requirements TEXT[]`, `converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL` |
| 3 | No anon INSERT policy — service role is the insert mechanism | VERIFIED | Only two INSERT policies in migration, both `WITH CHECK (is_platform_admin())` — no anon/authenticated INSERT |
| 4 | Contact form API writes to DB before sending email, returns 500 on DB fail | VERIFIED | `web/app/api/contact/submit/route.ts` — supabase insert at line 48, 500 return at line 63, email fire-and-forget at line 87 |
| 5 | Quote form API writes to DB before sending email, returns 500 on DB fail | VERIFIED | `web/app/api/quotes/submit/route.ts` — supabase insert at line 63, 500 return at line 87, email fire-and-forget at line 123 |
| 6 | Both API routes use service-role client, not session-based | VERIFIED | Both routes define `getServiceRoleClient()` using `SUPABASE_SERVICE_ROLE_KEY`, called directly before insert |
| 7 | Admin can navigate to /admin/submissions from sidebar | VERIFIED | `web/app/admin/layout.tsx` line 173 — `href: '/admin/submissions'` with name 'Leads' |
| 8 | Submissions page has two tabs: Contact and Quotes | VERIFIED | `web/app/admin/submissions/page.tsx` — `activeTab` state, two tab buttons, conditional render of ContactSubmissionsTable / QuoteSubmissionsTable |
| 9 | Admin can change lead status inline via dropdown | VERIFIED | Both table components render Select dropdowns with `onStatusChange` wired to `useUpdateSubmissionStatus().mutate()` |
| 10 | Data refreshes via 60-second polling | VERIFIED | `web/lib/queries/admin/submissions.ts` — `refetchInterval: 60_000` on both `useContactSubmissions` and `useQuoteSubmissions` |
| 11 | Quote submissions table has a Convert to Booking button | VERIFIED | `web/components/admin/quote-submissions-table.tsx` — `handleConvertToBooking` builds URLSearchParams, `router.push('/admin/bookings/new?...')`, Button rendered in QuoteRow |
| 12 | useSearchParams pre-fills booking form from URL params | VERIFIED | `web/app/admin/bookings/new/page.tsx` — `searchParams.get('clientEmail')`, `searchParams.get('siteAddress')`, `searchParams.get('shiftDate')`, `confinedSpace: searchParams.get('confinedSpace') === '1'` |
| 13 | Suspense boundary wraps form component using useSearchParams | VERIFIED | `NewBookingPage` wraps `<NewBookingForm>` in `<Suspense>` at line 312 |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/116_lead_capture_tables.sql` | Both tables, indexes, RLS | VERIFIED | 170 lines — 2 tables, 7 indexes, 12 RLS policies, RLS enabled on both |
| `web/.env.local.example` | SUPABASE_SERVICE_ROLE_KEY and ASG_ORG_ID | VERIFIED | Line 42: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`, Line 47: `ASG_ORG_ID=your-asg-org-uuid-here` |
| `web/app/api/contact/submit/route.ts` | Service-role insert, DB-first, fire-and-forget email | VERIFIED | 103 lines — full implementation, `getServiceRoleClient()` defined and used |
| `web/app/api/quotes/submit/route.ts` | Service-role insert, DB-first, fire-and-forget email, quote ref | VERIFIED | 139 lines — full implementation, `getServiceRoleClient()` defined and used, returns `quoteRef` |
| `web/app/admin/submissions/page.tsx` | Two-tab submissions CRM page | VERIFIED | 71 lines — tab switcher state, both table components rendered conditionally |
| `web/lib/queries/admin/submissions.ts` | useContactSubmissions, useQuoteSubmissions, useUpdateSubmissionStatus | VERIFIED | 151 lines — all 3 hooks exported with full Supabase queries and 60s polling |
| `web/components/admin/contact-submissions-table.tsx` | Table with search, status filter, inline status change | VERIFIED | 233 lines — search, status filter, ContactRow with Select dropdown |
| `web/components/admin/quote-submissions-table.tsx` | Table with Convert to Booking button, inline status | VERIFIED | 270 lines — search, status filter, QuoteRow with Select + Convert button |
| `web/app/admin/bookings/new/page.tsx` | Suspense-wrapped form with searchParams pre-fill | VERIFIED | 320 lines — useSearchParams, clientEmail/siteAddress/shiftDate/confinedSpace/traumaSpecialist pre-fill, Suspense boundary |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `web/app/api/contact/submit/route.ts` | `contact_submissions` table | `getServiceRoleClient().from('contact_submissions').insert(...)` | VERIFIED | Line 48 — insert with all fields, blocking await, error check returns 500 |
| `web/app/api/quotes/submit/route.ts` | `quote_submissions` table | `getServiceRoleClient().from('quote_submissions').insert(...)` | VERIFIED | Line 63 — insert with all fields including `special_requirements` array, blocking await |
| `web/components/admin/contact-submissions-table.tsx` | `useContactSubmissions` | import + `const { data: submissions } = useContactSubmissions()` | VERIFIED | Line 11 import, Line 39 usage, data rendered in table rows |
| `web/components/admin/quote-submissions-table.tsx` | `useQuoteSubmissions` | import + `const { data: submissions } = useQuoteSubmissions()` | VERIFIED | Line 13 import, Line 43 usage, data rendered in table rows |
| `web/components/admin/quote-submissions-table.tsx` | `/admin/bookings/new` | `router.push('/admin/bookings/new?...')` with URLSearchParams | VERIFIED | Lines 72–79 — email, siteAddress, shiftDate, confinedSpace, traumaSpecialist, specialNotes params passed |
| `web/app/admin/submissions/page.tsx` | Both table components | `import + conditional render based on activeTab` | VERIFIED | Lines 13–14 imports, Lines 63–67 conditional render |
| Admin sidebar | `/admin/submissions` | Layout navItem `href: '/admin/submissions'` | VERIFIED | `web/app/admin/layout.tsx` line 173 |
| `web/lib/queries/admin/submissions.ts` | `useUpdateSubmissionStatus` | mutation calls `supabase.from(table).update(...)` | VERIFIED | Lines 133–139 — update with org_id defense in depth, invalidates both query caches on settle |

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| No lead lost — all form submissions persisted to DB | SATISFIED | DB insert is blocking; 500 returned on failure; email is fire-and-forget |
| Admins can follow up on leads | SATISFIED | CRM page at /admin/submissions with status change, search, filter |
| Contact submissions persisted with org scope | SATISFIED | `org_id` FK to `organizations`, service role writes via `ASG_ORG_ID` env var |
| Quote submissions persisted with full field set | SATISFIED | All QuoteBuilder fields mapped, `special_requirements TEXT[]`, `converted_booking_id` FK |
| Admin can convert quote to booking with data pre-fill | SATISFIED | Convert button builds URL params, bookings/new page reads them via useSearchParams |
| RLS prevents cross-org data leakage | SATISFIED | Org-scoped SELECT policies use `get_user_org_id()`; service role bypasses for inserts |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `contact-submissions-table.tsx` | 85, 95 | HTML input `placeholder` attribute | Info | Legitimate UI — not a code stub |
| `quote-submissions-table.tsx` | 100, 110 | HTML input `placeholder` attribute | Info | Legitimate UI — not a code stub |
| `contact-submissions-table.tsx` | 46 | `return []` in useMemo | Info | Legitimate empty-state guard when submissions is undefined |
| `quote-submissions-table.tsx` | 50 | `return []` in useMemo | Info | Legitimate empty-state guard when submissions is undefined |

No blockers or warnings found. All pattern matches are legitimate UI/guard code.

---

## Human Verification Required

### 1. Contact Form End-to-End Submission

**Test:** Submit the /contact page form with valid data.
**Expected:** Row appears in Supabase `contact_submissions` table AND admin receives email notification.
**Why human:** Cannot verify Resend email delivery or live Supabase insert without running the app against real env vars.

### 2. Quote Builder End-to-End Submission

**Test:** Complete and submit the quote builder form.
**Expected:** Row appears in `quote_submissions` table, admin receives email, confirmation screen shows quote reference (e.g., QT-AB12).
**Why human:** Cannot verify real DB write or email delivery programmatically.

### 3. Admin CRM — Status Change Persistence

**Test:** In /admin/submissions, change a lead's status via the inline dropdown.
**Expected:** Status updates immediately in the UI and persists on page refresh.
**Why human:** Requires live Supabase session with org-scoped RLS to confirm UPDATE succeeds.

### 4. Convert to Booking Pre-Fill Flow

**Test:** Click "Convert to Booking" on a quote submission in /admin/submissions.
**Expected:** /admin/bookings/new opens with Client Email, Site Address, Date, and checkboxes pre-filled from the quote data.
**Why human:** URL param construction and form state initialization require browser interaction to confirm visually.

### 5. 60-Second Polling in Live Environment

**Test:** Open /admin/submissions, submit a new contact form from another tab, wait up to 60 seconds.
**Expected:** New submission appears in the table without a manual page refresh.
**Why human:** Real-time polling behavior requires a live environment to observe.

---

## Gaps Summary

No gaps found. All 13 must-haves are verified. The phase goal is achieved:

- **DB schema** (`116_lead_capture_tables.sql`): Both tables created with correct columns, TEXT[] for special_requirements, converted_booking_id FK with ON DELETE SET NULL, RLS enabled with org-scoped and platform-admin policies, no anon INSERT.
- **API routes**: Both routes use service-role clients, persist to DB as the blocking first action, return 500 on DB failure, send email as fire-and-forget.
- **Admin CRM** (`/admin/submissions`): Two-tab page with full contact and quote tables, inline status change, 60-second polling, Convert to Booking with URL-param pre-fill.
- **Pre-fill** (`/admin/bookings/new`): useSearchParams reads all specified params, `confinedSpace === '1'` maps correctly to boolean, Suspense boundary wraps the form component.

Five items are flagged for human verification (email delivery, live DB writes, polling behavior) — none are code gaps, all are environmental integration tests.

---

_Verified: 2026-02-17T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
