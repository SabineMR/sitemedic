# 28-03 Summary: Email Template Branding

## Status: Complete

## What Was Done

### Task 1 — EmailBranding type & template updates
- Created `web/lib/email/types.ts` with `EmailBranding` interface (camelCase) and `DEFAULT_EMAIL_BRANDING` constant
- Updated 3 React Email templates to accept `branding: EmailBranding` prop:
  - `booking-confirmation-email.tsx` — branded header (logo or company name), dynamic accent colour, tier-conditional "Powered by SiteMedic" footer
  - `medic-assignment-email.tsx` — same pattern
  - `booking-received-email.tsx` — same pattern
- Commit: `27a49e1`

### Task 2 — Wire branding into email sending routes
- `web/app/api/email/booking-confirmation/route.ts`:
  - Extended clients query to include `org_id`
  - Added parallel fetch of `org_branding` + `organizations` (subscription_tier)
  - Constructed `EmailBranding` with logo URL, accent colour, tier-gated showPoweredBy via `hasFeature()`
  - Passed `branding` to both `BookingConfirmationEmail` and `MedicAssignmentEmail` render calls
  - Updated `from` fields from hardcoded "ASG Bookings" / "Apex Safety Group" to `${branding.companyName}`
- `web/lib/email/send-booking-received.ts`:
  - Same branding fetch pattern (org_branding + organizations parallel query)
  - Passed `branding` to `BookingReceivedEmail`
  - Updated `from` field to `${branding.companyName} Bookings`
- `supabase/functions/_shared/email-templates.ts`:
  - Added `InvoiceEmailBranding` interface + `DEFAULT_INVOICE_BRANDING` constant
  - Made `sendInvoiceEmail` accept optional `branding` parameter (backwards-compatible)
  - Updated invoice email HTML: dynamic header colour, optional logo, branded button colour, `${company_name} Team` sign-off, conditional "Powered by SiteMedic"
  - Updated `from` and `subject` to use `branding.company_name`
- Commit: `fbd4856`

## Key Decisions
- `showPoweredBy` is tier-gated: `!hasFeature(tier, 'white_label')` — growth+ hides it
- Logo URL pattern: `${SUPABASE_URL}/storage/v1/object/public/org-logos/${logo_path}`
- Platform alert emails (payoutFailure, cashFlowAlert) intentionally NOT branded — they are SiteMedic platform alerts, not org-facing

## Files Modified
- `web/lib/email/types.ts` (created)
- `web/lib/email/templates/booking-confirmation-email.tsx`
- `web/lib/email/templates/medic-assignment-email.tsx`
- `web/lib/email/templates/booking-received-email.tsx`
- `web/app/api/email/booking-confirmation/route.ts`
- `web/lib/email/send-booking-received.ts`
- `supabase/functions/_shared/email-templates.ts`
