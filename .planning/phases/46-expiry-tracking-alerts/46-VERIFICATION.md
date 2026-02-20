---
phase: 46-expiry-tracking-alerts
verified: 2026-02-20T18:10:00Z
status: passed
score: 3/3 must-haves verified
---

# Phase 46: Expiry Tracking & Alerts Verification Report

**Phase Goal:** Documents show colour-coded status badges based on expiry proximity, medics and admins receive progressive email alerts as documents approach expiry, and org admins have a bulk view of all documents expiring across their organisation in the next 30 days
**Verified:** 2026-02-20T18:10:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every document displays a status badge: green "Current" (>30d), amber "Expiring Soon" (<=30d), red "Expired" (<0d) | VERIFIED | `ExpiryBadge` component in `web/components/documents/document-list.tsx` (lines 21-51, medic dark theme) and `web/components/documents/admin-document-view.tsx` (lines 22-29, admin light theme). Both compute `daysUntil` from expiry_date, render green/amber/red badges with correct threshold logic: `<0` = Expired (red), `<=30` = Expiring Soon (amber/yellow), `>30` = Current (green). Used on every document row (line 178 in document-list.tsx, line 162 in admin-document-view.tsx). Dashboard page also has `ExpiryStatusBadge` at lines 36-57 with matching logic. |
| 2 | Progressive email alerts sent to medic and org admin at 30/14/7/1 days before expiry, each stating document, medic, and expiry date | VERIFIED | Edge Function `supabase/functions/document-expiry-checker/index.ts` (429 lines) processes `REMINDER_STAGES = [30, 14, 7, 1]` (line 30). For each stage: calls `get_documents_expiring_in_days` RPC (line 62-65), deduplicates via `document_expiry_reminders` table (lines 86-100), groups by medic (lines 122-163), sends digest email per medic via `sendMedicDigestEmail` (line 180). Admin digests sent at `ADMIN_STAGES = [14, 7, 1]` (line 33) via `sendAdminDigestEmail` (line 342). Email templates in `email-templates.ts` (445 lines) include document category, file name, expiry date, days remaining, and medic name in both medic and admin templates. Escalating urgency subjects: CRITICAL (1d), URGENT (7d), Action Required (14d), Reminder (30d). Deduplication audit table in migration 155 prevents duplicate alerts. |
| 3 | Org admin can access bulk expiry dashboard showing all documents expiring in next 30 days, sortable by expiry date, filterable by category | VERIFIED | Dashboard page at `web/app/(dashboard)/admin/document-expiry/page.tsx` (307 lines) with 3 summary cards (Expired/red, Expiring Soon/amber, Current/green). Tabbed data table: "30 Days" (default, `daysWindow=30`), "All Expiring" (`daysWindow=365`), "Expired" (`includeExpired=true`). Category filter via `Select` dropdown populated by `useDocumentCategories` hook. Documents sorted by `days_remaining` ascending (most urgent first) in `fetchExpiringDocuments` (line 152 of query hooks). Table columns: Medic Name, Document Category, File Name, Expiry Date, Days Remaining, Status Badge. Navigation item "Document Expiry" with `FileWarning` icon added to `DashboardNav.tsx` (line 104-107) linking to `/admin/document-expiry`. |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/155_document_expiry_reminders.sql` | Audit table, RPC, status update, pg_cron | VERIFIED (211 lines) | `document_expiry_reminders` table with RLS, `get_documents_expiring_in_days` RPC joining documents->document_versions via current_version_id->medics->document_categories, `mark_expired_documents` function, pg_cron at '0 8 * * *' using Vault secrets |
| `supabase/functions/document-expiry-checker/index.ts` | Daily cron Edge Function | VERIFIED (429 lines) | 4 reminder stages, deduplication via audit table, medic grouping for digest, admin digest at critical stages, mark_expired_documents call, error handling per stage/medic/org |
| `supabase/functions/document-expiry-checker/email-templates.ts` | Medic + admin digest email templates | VERIFIED (445 lines) | `sendMedicDigestEmail` and `sendAdminDigestEmail` exports, escalating urgency (blue/amber/red), document table in HTML, CTA buttons, Resend with dev mode fallback |
| `web/lib/queries/admin/document-expiry.ts` | TanStack Query hooks | VERIFIED (291 lines) | `useExpiringDocuments`, `useDocumentExpirySummary`, `useDocumentCategories` hooks, org-scoped via `useRequireOrg`, client-side date computation with `differenceInDays` |
| `web/app/(dashboard)/admin/document-expiry/page.tsx` | Bulk expiry dashboard page | VERIFIED (307 lines) | Summary cards, tabbed table (30d/all/expired), category filter, `ExpiryStatusBadge` component, `DaysRemainingCell` with colour coding, loading/empty states |
| `web/components/dashboard/DashboardNav.tsx` | Navigation with Document Expiry item | VERIFIED (145 lines) | "Document Expiry" item at line 104-107 with `FileWarning` icon, href `/admin/document-expiry` |
| `web/components/documents/document-list.tsx` | ExpiryBadge on medic documents | VERIFIED (248 lines) | `ExpiryBadge` component (lines 21-51) with green/amber/red badges, used on every document row |
| `web/components/documents/admin-document-view.tsx` | ExpiryBadge on admin document view | VERIFIED (223 lines) | `ExpiryBadge` component (lines 22-29) using shadcn Badge, same threshold logic |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Migration 155 (pg_cron) | Edge Function | `net.http_post` to `/functions/v1/document-expiry-checker` | WIRED | Line 168: `|| '/functions/v1/document-expiry-checker'` with Vault secrets for auth |
| Edge Function index.ts | email-templates.ts | `import { sendMedicDigestEmail, sendAdminDigestEmail }` | WIRED | Line 22-27: imports both email functions plus types |
| Edge Function index.ts | document_expiry_reminders table | `.from('document_expiry_reminders')` for dedup + logging | WIRED | 4 occurrences: lines 88, 199, 277, 355 (dedup check + insert for medic and admin) |
| Edge Function index.ts | mark_expired_documents RPC | `supabase.rpc('mark_expired_documents')` | WIRED | Line 396: called after all stages complete |
| Dashboard page | Query hooks | `import { useExpiringDocuments, useDocumentExpirySummary, useDocumentCategories }` | WIRED | Lines 14-17 import, lines 130/133/140 use all three hooks |
| Query hooks | Supabase documents table | `.from('documents')` with joins | WIRED | Lines 72, 168: queries with org-scoped filter, joins to medics/categories/versions |
| DashboardNav | Dashboard page | `href: '/admin/document-expiry'` | WIRED | Line 105: navigation item links to dashboard route |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DOC-06: Documents show status badges (Current/green, Expiring Soon/amber, Expired/red) | SATISFIED | None -- ExpiryBadge in document-list.tsx, admin-document-view.tsx, and dashboard page |
| DOC-07: Progressive expiry alerts sent to medic and admin (30/14/7/1 days before expiry) | SATISFIED | None -- Edge Function with 4 stages, medic digest, admin digest at 14/7/1, deduplication |
| DOC-10: Org admin sees bulk expiry view -- all documents expiring in next 30 days across all medics | SATISFIED | None -- Dashboard at /admin/document-expiry with summary cards, tabbed table, category filter |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `web/app/(dashboard)/admin/document-expiry/page.tsx` | 231 | `placeholder="All Categories"` | Info | Legitimate UI placeholder text for Select component, not a stub pattern |

No blocker or warning anti-patterns found.

### Human Verification Required

### 1. Visual Badge Colours
**Test:** Navigate to a medic's document list. Verify documents with expiry dates >30 days show a green "Current" badge, <=30 days show amber "Expiring Soon", and past-date show red "Expired".
**Expected:** Three distinct colour-coded badges matching the threshold logic.
**Why human:** Tailwind class rendering and visual colour perception cannot be verified programmatically.

### 2. Dashboard Page Load Performance
**Test:** Navigate to /admin/document-expiry from the sidebar. Measure time to first meaningful paint.
**Expected:** Page loads within 2 seconds with summary cards and table visible.
**Why human:** Performance measurement requires real browser rendering.

### 3. Tab Switching and Category Filtering
**Test:** On the document expiry dashboard, switch between "30 Days", "All Expiring", and "Expired" tabs. Select a specific category from the filter dropdown.
**Expected:** Table contents change based on tab selection and category filter. Empty state shown when no matches.
**Why human:** Interactive state changes and data reactivity need human verification.

### 4. Email Template Rendering
**Test:** Trigger the document-expiry-checker Edge Function manually with test data. Inspect the email HTML output.
**Expected:** Emails render with correct urgency colours, document table, CTA buttons, and medic/document/expiry information.
**Why human:** Email HTML rendering varies across clients and requires visual inspection.

### 5. Cron Job Activation
**Test:** After deploying migration 155 to Supabase, verify the pg_cron job is scheduled.
**Expected:** `SELECT * FROM cron.job WHERE jobname = 'document-expiry-checker';` returns one row with schedule '0 8 * * *'.
**Why human:** Requires database access and deployed environment.

### Gaps Summary

No gaps found. All three success criteria are fully implemented:

1. **Status badges** -- ExpiryBadge components exist in both medic portal (dark theme) and admin portal (light theme) document views, plus a matching ExpiryStatusBadge in the dashboard. All use correct thresholds: >30d = green Current, <=30d = amber Expiring Soon, <0 = red Expired.

2. **Progressive email alerts** -- Complete infrastructure: migration 155 with audit table and RPC functions, Edge Function processing 4 stages (30/14/7/1 days) with deduplication, medic digest emails, admin org-wide digests at critical stages (14/7/1), escalating urgency in email templates, and automated expired status marking. Dev mode fallback ensures testability without Resend API key.

3. **Bulk expiry dashboard** -- Full dashboard page at /admin/document-expiry with summary cards (3 counts), tabbed data table (30 Days/All Expiring/Expired), category filter dropdown, sorted by days remaining (most urgent first), and navigation sidebar item with FileWarning icon.

---

_Verified: 2026-02-20T18:10:00Z_
_Verifier: Claude (gsd-verifier)_
