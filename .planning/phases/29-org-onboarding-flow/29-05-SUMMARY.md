---
phase: 29-org-onboarding-flow
plan: 05
subsystem: email
tags: [react-email, resend, welcome-email, branding, onboarding]
dependency_graph:
  requires: [24-02, 28-01]
  provides: [sendWelcomeEmail, WelcomeEmail-template]
  affects: [29-04]
tech_stack:
  added: []
  patterns: [fire-and-forget-email, service-role-supabase-client, react-email-branding]
file_tracking:
  created:
    - web/lib/email/templates/welcome-email.tsx
    - web/lib/email/send-welcome.ts
  modified:
    - FEATURES.md
decisions: []
metrics:
  duration: ~4 min
  completed: 2026-02-18
---

# Phase 29 Plan 05: Welcome Email Template & Sender Summary

React Email welcome template with org branding (logo, primary colour) and fire-and-forget sender using service-role Supabase client for org_branding lookup and subdomain login URL construction.

## What Was Built

### Welcome Email Template (`web/lib/email/templates/welcome-email.tsx`)
- React Email component matching existing `booking-received-email.tsx` style patterns
- **WelcomeEmailProps** interface: `orgAdmin.name`, `org.companyName`, `org.planName`, `org.loginUrl`, optional `branding.primaryColour` and `branding.logoUrl`
- Sections: branded header (optional logo), "Welcome to SiteMedic" heading, greeting, plan info, details box (plan + login URL), 3-step getting-started guide, CTA button, footer
- CTA button uses `branding.primaryColour` or defaults to `#2563eb`
- Falls back to SiteMedic defaults when no branding configured

### Welcome Email Sender (`web/lib/email/send-welcome.ts`)
- `sendWelcomeEmail({ orgId, orgAdminEmail, orgAdminName, slug?, planName })` exported
- Creates service-role Supabase client (same pattern as billing webhook) — not request-context client
- Fetches `org_branding` (company_name, primary_colour_hex, logo_path) for the org
- Builds login URL: subdomain for Growth/Enterprise (`https://{slug}.{ROOT_DOMAIN}/login`) or default site URL
- Constructs logo URL from Supabase Storage public bucket if logo_path exists
- Renders template via `@react-email/components` `render()` and sends via Resend
- Fire-and-forget: catches all errors, logs them, never throws

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

No new decisions required.

## Verification Results

- TypeScript compilation: no errors in either new file (3 pre-existing errors in unrelated files)
- Template exports default React component with correct prop types
- Sender exports `sendWelcomeEmail` with correct signature
- Fire-and-forget pattern matches existing `sendBookingReceivedEmail`
- No database schema changes

## Next Phase Readiness

- **29-04 (Org Activation Route)** can now import `sendWelcomeEmail` from `@/lib/email/send-welcome` and call it after activating an org
- Template is self-contained — no runtime dependencies beyond `@react-email/components` (already installed) and Resend client (already configured)
