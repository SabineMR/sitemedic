# Phase 14: Compliance, Exports & Medic Portal

**Milestone:** v1.1
**Priority:** MEDIUM/LOW
**Status:** Pending planning

## Problem

Multiple backend systems produce data that users cannot extract or act on: certifications expire silently in the UI (backend cron fires but no UI alert), IR35 has a form and API but shows no results, contracts have an amendment trail that is invisible, and payslips can only be viewed — not downloaded.

## Goal

Enable data export across all key record types, surface compliance status that already exists in the database, and complete the medic portal.

## Gaps Closed

- Payslip PDF: view-only, no download button
- No export: RIDDOR reports (PDF), timesheets (CSV), booking history (CSV), invoice history (CSV)
- Certification expiry: backend cron sends emails but no UI warning on medic profile
- IR35 assessment: form exists, API exists, results never displayed to medic
- Contract: version history invisible, amendment trail invisible, milestone completion not tracked in UI

## Key Files

- `web/app/medic/payslips/page.tsx` — payslip list (add download)
- `web/app/(dashboard)/riddor/page.tsx` — RIDDOR list (add export)
- `web/app/admin/timesheets/page.tsx` — timesheets (add export)
- `web/app/admin/bookings/page.tsx` — bookings (add export)
- `web/app/admin/revenue/page.tsx` — invoices (add export)
- `web/app/medic/profile/page.tsx` — medic profile (add cert warnings, IR35 status)
- `web/app/api/medics/ir35-assessment/route.ts` — IR35 API (results exist, not displayed)
- `web/app/(dashboard)/contracts/[id]/page.tsx` — contract detail (add version history, milestone tracker)
- `web/lib/utils/export-pdf.ts` — PDF export utility (extend for RIDDOR)
- `web/lib/utils/export-csv.ts` — CSV export utility (extend for timesheets, invoices)

## Planned Tasks

1. **14-01:** Payslip PDF download — generate signed Supabase Storage URL for payslip PDF; add download button in medic portal
2. **14-02:** Export buttons for RIDDOR (PDF), timesheets (CSV), booking history (CSV), invoice history (CSV) — reuse existing `export-pdf.ts` and `export-csv.ts` utilities
3. **14-03:** Certification expiry UI — yellow banner on medic profile page when any cert expires within 30 days; red banner within 7 days; link to renewal
4. **14-04:** IR35 status display — show current determination (`self_employed` / `umbrella` / `inside_ir35`), last assessed date, last 3 assessment history on medic profile
5. **14-05:** Contract completeness — version history tab (all PDF versions with download links), amendment trail (all status transitions with actor + timestamp), milestone payment tracker (per-milestone completion status)

## Success Criteria

1. Medic downloads their December 2025 payslip as a PDF in 2 clicks
2. Admin exports all RIDDOR incidents for Q1 2026 as a formatted PDF
3. Medic profile shows yellow banner "CSCS expires in 18 days — Renew now"
4. IR35 section shows "Self-employed — last assessed 2026-01-15"
5. Contract detail shows 3 versions: v1 (draft), v2 (amended), v3 (signed)
