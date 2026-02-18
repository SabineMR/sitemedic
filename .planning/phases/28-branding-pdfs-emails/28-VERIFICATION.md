---
phase: 28-branding-pdfs-emails
status: passed
verified: 2026-02-18
---

# Phase 28 Verification: Branding — PDFs & Emails

## Must-Have Checks

### 1. All 8 PDF Edge Functions fetch org branding before rendering
**PASS** — `fetchOrgBranding` is imported and called in all 8 index files:
- generate-weekly-report/index.tsx
- generate-invoice-pdf/index.ts
- riddor-f2508-generator/index.ts
- generate-payslip-pdf/index.ts
- fa-incident-generator/index.ts
- motorsport-incident-generator/index.ts
- event-incident-report-generator/index.ts
- motorsport-stats-sheet-generator/index.ts

### 2. All 7 @react-pdf document components use BrandedPdfHeader/BrandedPdfFooter
**PASS** — `BrandedPdfHeader` found in all 7 components + shared Header.tsx:
- F2508Document.tsx, PayslipDocument.tsx, FAPlayerDocument.tsx, FASpectatorDocument.tsx
- MotorsportIncidentDocument.tsx, PurpleGuideDocument.tsx, MotorsportStatsDocument.tsx
- generate-weekly-report/components/Header.tsx

### 3. Invoice HTML template uses org branding
**PASS** — `generateInvoiceHTML(data, branding)` accepts OrgBranding, renders company name + optional logo in header, conditional "Powered by SiteMedic" in footer.

### 4. No hardcoded "Apex Safety" in any of the 8 PDF functions
**PASS** — Grep returns 0 matches across all 8 PDF function directories.

### 5. "SiteMedic" only appears in conditional "Powered by" paths
**PASS** — All remaining "SiteMedic" references in the 8 PDF functions are:
- `showPoweredBySiteMedic()` function calls (conditional, tier-based)
- `branding?.company_name || 'SiteMedic'` fallbacks in document author metadata
- `'Powered by SiteMedic'` conditional text

### 6. All 4 email templates accept EmailBranding prop
**PASS** — `EmailBranding` type imported in:
- booking-confirmation-email.tsx
- medic-assignment-email.tsx
- booking-received-email.tsx
- Invoice email in `_shared/email-templates.ts` (InvoiceEmailBranding)

### 7. Email sending routes fetch org branding
**PASS** — Both routes fetch from `org_branding` table:
- web/app/api/email/booking-confirmation/route.ts
- web/lib/email/send-booking-received.ts

### 8. No hardcoded "Apex Safety" or "ASG" in email routes
**PASS** — Grep returns 0 matches in web/app/api/email/.

## Success Criteria Assessment

| Criterion | Status |
|-----------|--------|
| Weekly PDF shows org logo in header | PASS |
| All 8 PDF functions fetch org_branding | PASS |
| Booking confirmation email shows org branding | PASS |
| All email templates have branding prop | PASS |

## Known Out-of-Scope Items

The following Edge Functions still have hardcoded branding but were **not in the Phase 28 plan scope** (8 PDF functions + 4 email templates):

1. **generate-weekly-report/email.ts** — The email body that accompanies the weekly PDF still has "SiteMedic" (the PDF itself is branded)
2. **certification-expiry-checker/email-templates.ts** — "Apex Safety Group Ltd" in compliance notification emails
3. **send-contract-email/index.ts** — "SiteMedic" and "SiteMedic Ltd" in contract emails
4. **generate-contract-pdf** — "SiteMedic Ltd" as legal party name (arguably correct for contracts)

These can be addressed in a future phase or todo.

## Result: PASSED
