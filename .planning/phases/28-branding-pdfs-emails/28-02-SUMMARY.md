---
phase: 28-branding-pdfs-emails
plan: 02
status: complete
started: 2026-02-18
completed: 2026-02-18
---

# 28-02 Summary: Roll Out PDF Branding to Remaining 7 Functions

## What Was Done

### Task 1: Brand the 6 @react-pdf PDF functions
**Commit:** `427fed8`

Applied the branding pattern from `generate-weekly-report` (28-01 pilot) to all 6 remaining @react-pdf PDF functions:

**Index files updated (org_id resolution + branding fetch):**
- `riddor-f2508-generator/index.ts` — added `org_id` to riddor_incidents select
- `generate-payslip-pdf/index.ts` — added `org_id` to medics select (branding optional when org_id missing)
- `fa-incident-generator/index.ts` — added `org_id` to treatments select; passes branding to both FAPlayerDocument and FASpectatorDocument
- `motorsport-incident-generator/index.ts` — added `org_id` to treatments select
- `event-incident-report-generator/index.ts` — org_id already in select, added branding fetch
- `motorsport-stats-sheet-generator/index.ts` — added `org_id` to bookings select

**Document components updated (7 total):**
- `F2508Document.tsx` — BrandedPdfHeader("F2508 RIDDOR Report"), BrandedPdfFooter
- `PayslipDocument.tsx` — BrandedPdfHeader("Payslip"), BrandedPdfFooter
- `FAPlayerDocument.tsx` — BrandedPdfHeader("FA Match Day Injury Report"), BrandedPdfFooter
- `FASpectatorDocument.tsx` — BrandedPdfHeader("SGSA Medical Incident Report"), BrandedPdfFooter
- `MotorsportIncidentDocument.tsx` — BrandedPdfHeader("Motorsport Incident Report"), BrandedPdfFooter
- `PurpleGuideDocument.tsx` — BrandedPdfHeader("Incident Report"), BrandedPdfFooter
- `MotorsportStatsDocument.tsx` — BrandedPdfHeader("Medical Statistics Sheet"), BrandedPdfFooter

All components accept `branding?: OrgBranding` and `logoSrc?: string | null` props with fallback to original hardcoded headers when branding is undefined.

### Task 2: Brand the invoice HTML template PDF
**Commit:** `27ef864`

The invoice PDF uses an HTML template (not @react-pdf), so branding was injected directly into the HTML:
- Added `fetchOrgBranding` import and call using existing `userOrgId` from JWT
- Updated `generateInvoiceHTML()` signature to accept `OrgBranding` parameter
- Replaced standalone `<div class="title">INVOICE</div>` with branded header: optional logo image, company name styled with accent colour, "Invoice" subtitle
- Added accent-coloured bottom border to header
- Added conditional "Powered by SiteMedic" footer link for starter tier

## Deviations
- None. All changes followed the plan exactly.

## Key Decisions
- Made `branding` optional (with `?`) in document component props to maintain backward compatibility for functions where org_id might not be available (e.g., payslips for medics without org_id)
- Used `fetchLogoAsDataUri` for @react-pdf functions (Deno rendering needs data URIs) but standard URL for invoice HTML template (rendered in browser where remote URLs work)

## Files Modified
- `supabase/functions/riddor-f2508-generator/index.ts`
- `supabase/functions/riddor-f2508-generator/F2508Document.tsx`
- `supabase/functions/generate-payslip-pdf/index.ts`
- `supabase/functions/generate-payslip-pdf/components/PayslipDocument.tsx`
- `supabase/functions/fa-incident-generator/index.ts`
- `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx`
- `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx`
- `supabase/functions/motorsport-incident-generator/index.ts`
- `supabase/functions/motorsport-incident-generator/MotorsportIncidentDocument.tsx`
- `supabase/functions/event-incident-report-generator/index.ts`
- `supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx`
- `supabase/functions/motorsport-stats-sheet-generator/index.ts`
- `supabase/functions/motorsport-stats-sheet-generator/MotorsportStatsDocument.tsx`
- `supabase/functions/generate-invoice-pdf/index.ts`
