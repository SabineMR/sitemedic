---
phase: 29-org-onboarding-flow
verified: 2026-02-18T23:45:00Z
status: passed
score: 5/5 must-haves verified
human_verification:
  - test: "Complete full signup flow end-to-end in Stripe test mode"
    expected: "Select a plan on /signup, enter details, receive magic link, click link, get redirected to Stripe Checkout, complete test payment, land on /onboarding with processing spinner then confirmed state"
    why_human: "Involves cross-service redirects (Supabase magic link, Stripe Checkout), real browser navigation, and webhook timing that cannot be verified structurally"
  - test: "Verify pending activation queue updates after checkout"
    expected: "After a new org completes Stripe Checkout, the platform admin /platform/organizations page shows the org in the amber Pending Activation section with company name, tier badge, signup date, and Stripe Dashboard link"
    why_human: "Requires real Stripe webhook to fire and Supabase data to be written, then UI refresh to show the new entry"
  - test: "Activate an org and verify welcome email delivery"
    expected: "Click Activate on a pending org, enter a subdomain slug for Growth/Enterprise, see success toast, org disappears from pending queue, welcome email arrives at org admin email with login URL, plan name, and getting-started guide"
    why_human: "Email delivery through Resend, email content rendering, and branding application require visual human verification"
  - test: "Verify branding wizard saves data in pending state"
    expected: "While on /onboarding/branding (before activation), upload a logo, pick a colour, set company name, click Save. Data persists on page reload. After activation, branding appears in the portal."
    why_human: "File upload to Supabase Storage, colour picker interaction, and visual branding rendering need human testing"
  - test: "Verify middleware routing for pending vs active orgs"
    expected: "A pending-onboarding org user navigating to /admin is redirected to /onboarding. After activation, the same user navigating to /onboarding is redirected to /admin."
    why_human: "Middleware redirection depends on real session state and database onboarding_completed flag which changes at activation time"
---

# Phase 29: Org Onboarding Flow Verification Report

**Phase Goal:** A new medic business can discover SiteMedic, select a subscription plan, pay online via Stripe Checkout, and arrive at a post-payment branding setup wizard -- all without manual Sabine involvement until the platform admin activation step. Platform admin sees a pending activation queue and triggers the welcome email on approval.

**Verified:** 2026-02-18T23:45:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New user can select plan, complete Stripe Checkout, and land on post-payment page confirming pending activation -- no manual steps | VERIFIED | Signup page (712 lines) has 4-step flow: plan selection with 3 tier cards -> details form -> magic link email -> creating-org step that calls POST /api/billing/checkout which creates org+branding+membership+Stripe Customer+Checkout Session. Post-checkout redirect goes to /onboarding with session_id. Onboarding page polls /api/billing/checkout-status every 3s until subscription confirmed. |
| 2 | Platform admin dashboard shows pending org in activation queue with tier, Stripe link, and signup timestamp | VERIFIED | Platform organizations page (516 lines) queries `organizations` where `onboarding_completed=false AND subscription_status IS NOT NULL`, displays amber-themed pending section with company name (from org_branding join), TierBadge component, signup date formatted, Stripe Dashboard customer link, slug input for Growth/Enterprise, and Activate button. |
| 3 | Platform admin can activate org, assign slug, and trigger welcome email; after activation subscription_status is active and users can log in | VERIFIED | Activation API route (246 lines) validates platform_admin role, validates slug format (regex), checks slug uniqueness, sets onboarding_completed=true (and slug for Growth/Enterprise), fetches org admin profile+email, calls sendWelcomeEmail(). subscription_status was already set to 'active' by billing webhook at checkout.session.completed. Middleware redirects completed orgs from /onboarding to /admin. |
| 4 | New org admin receives welcome email with login URL (including subdomain), plan name, and getting-started guide, using org branding or SiteMedic defaults | VERIFIED | Welcome email template (226 lines) is a full React Email component with branded header (optional logo), plan info box (plan name + login URL), 3-step getting-started guide, CTA button using branding primaryColour. send-welcome.ts (86 lines) fetches org_branding, constructs subdomain login URL for Growth/Enterprise or default site URL for Starter, builds logo URL from storage, renders template via Resend. Fire-and-forget error handling. |
| 5 | Post-payment branding wizard allows logo upload, primary colour, company name before activation; data persists to org_branding in pending state | VERIFIED | Branding page (395 lines) loads existing org_branding on mount, provides company name input, hex colour picker with visual preview and XSS regex validation, tagline input, logo upload (PNG/JPEG/SVG, max 2MB) to org-logos Supabase Storage bucket with upsert, updates existing org_branding row. Works while onboarding_completed=false. Middleware allows /onboarding/* routes for pending orgs. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/app/api/billing/checkout/route.ts` | Stripe Checkout Session creation with org provisioning | VERIFIED (250 lines, no stubs, wired from signup page) | Creates org, org_branding, membership, user metadata, Stripe Customer, Checkout Session with metadata.org_id |
| `web/app/api/billing/checkout-status/route.ts` | Subscription status polling endpoint | VERIFIED (101 lines, no stubs, wired from onboarding page) | Reads org subscription state via service-role, returns status/tier/isPending for polling |
| `web/app/(auth)/signup/page.tsx` | Multi-step signup with plan selection | VERIFIED (712 lines, no stubs, calls /api/billing/checkout) | 4-step flow: plan cards -> details form -> magic link -> creating-org with Stripe redirect |
| `web/app/onboarding/layout.tsx` | Wizard layout for onboarding pages | VERIFIED (33 lines, adequate for layout, wraps children) | Dark gradient, SiteMedic header, centered max-w-2xl content |
| `web/app/onboarding/page.tsx` | Post-payment success with polling | VERIFIED (195 lines, no stubs, polls /api/billing/checkout-status) | Polls every 3s, shows processing->confirmed states, links to branding setup |
| `web/app/onboarding/branding/page.tsx` | Branding setup wizard | VERIFIED (395 lines, no stubs, writes to org_branding and org-logos storage) | Company name, colour picker, tagline, logo upload with validation and preview |
| `web/app/api/platform/organizations/activate/route.ts` | Platform admin activation endpoint | VERIFIED (246 lines, no stubs, imports sendWelcomeEmail, wired from platform page) | Validates admin, slug format+uniqueness, sets onboarding_completed=true, sends welcome email |
| `web/app/platform/organizations/page.tsx` | Pending activation queue UI | VERIFIED (516 lines, no stubs, calls /api/platform/organizations/activate) | Amber-themed pending section, tier badges, Stripe links, slug input, Activate button with loading state |
| `web/lib/email/send-welcome.ts` | Welcome email sender | VERIFIED (86 lines, no stubs, imported by activation route) | Service-role client, fetches branding, builds login URL with subdomain, renders template via Resend, fire-and-forget |
| `web/lib/email/templates/welcome-email.tsx` | Welcome email React Email template | VERIFIED (226 lines, no stubs, imported by send-welcome.ts) | Branded header, plan info, getting-started guide, CTA button with accent colour |
| `web/lib/supabase/middleware.ts` | Onboarding routing gate | VERIFIED (264 lines, onboarding block at lines 222-261) | Separate onboarding check block, redirects pending orgs to /onboarding, completed orgs to /admin, legacy orgs unaffected via ?? true |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| signup/page.tsx | /api/billing/checkout | fetch POST (line 174) | WIRED | Sends tier, orgName, contactEmail; redirects to session.url |
| checkout/route.ts | stripe server lib | import stripe (line 23) | WIRED | stripe.checkout.sessions.create() at line 229 |
| checkout/route.ts | organizations table | supabase insert (line 141-154) | WIRED | Service-role insert with onboarding_completed=false |
| checkout/route.ts | org_branding table | supabase insert (line 165-170) | WIRED | Non-fatal insert with company_name |
| onboarding/page.tsx | /api/billing/checkout-status | fetch GET (lines 39, 68) | WIRED | Polls every 3s with setInterval, clears on subscription confirmed |
| checkout-status/route.ts | organizations table | supabase select (lines 70-76) | WIRED | Reads subscription_status, tier, onboarding_completed |
| onboarding/branding/page.tsx | org_branding table | supabase update (line 199-202) | WIRED | Updates company_name, colour, tagline, logo_path |
| onboarding/branding/page.tsx | org-logos storage | supabase storage upload (line 172-177) | WIRED | Upsert with content type |
| platform/organizations/page.tsx | /api/platform/organizations/activate | fetch POST (line 187) | WIRED | Sends orgId and slug |
| activate/route.ts | send-welcome.ts | import sendWelcomeEmail (line 19) | WIRED | Called at line 221 with orgId, email, name, slug, planName |
| send-welcome.ts | welcome-email.tsx | import WelcomeEmail (line 14) | WIRED | Renders template with org branding props |
| send-welcome.ts | resend lib | import resend (line 13) | WIRED | resend.emails.send() at line 73 |
| middleware.ts | /onboarding redirect | onboarding_completed check (lines 237-259) | WIRED | DB query for dashboard/onboarding routes, redirects based on flag |
| auth/callback/route.ts | /signup?step=creating-org | next param redirect (line 88) | WIRED | Reads ?next= param, redirects after code exchange |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| SUB-02: New business can sign up and complete Stripe Checkout end-to-end | SATISFIED | Signup page with plan selection -> Stripe Checkout via API -> post-payment onboarding page |
| SUB-04: Platform admin sees pending activation queue, can activate and assign slug | SATISFIED | Amber pending queue on /platform/organizations, Activate button calls activation API |
| ONBOARD-01: Public signup page at /signup with plan selection | SATISFIED | 4-step signup page with 3-tier plan cards, details form, magic link auth |
| ONBOARD-02: Post-payment setup wizard with logo, colour, company name | SATISFIED | /onboarding/branding page with full branding form, logo upload to Supabase Storage |
| ONBOARD-03: Platform admin receives notification and can activate from panel | PARTIALLY SATISFIED | Activation panel with queue exists and works. However, there is no email notification to the platform admin when a new org signs up -- admin discovers new orgs by checking the queue. The success criteria for Phase 29 do not require admin email notification (they focus on the queue UI), so this is acceptable for phase completion. |
| ONBOARD-04: Welcome email with login URL, subdomain, getting-started guide | SATISFIED | React Email template with branded header, subdomain login URL, plan info, 3-step guide, CTA button |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any phase 29 artifact |

### Human Verification Required

### 1. End-to-End Signup Flow (Stripe Test Mode)

**Test:** Visit /signup, select a plan, fill in details, complete magic link auth, go through Stripe Checkout with test card 4242424242424242
**Expected:** After payment, land on /onboarding showing "Processing Your Payment..." then "Payment Confirmed" with plan name. Link to branding setup visible.
**Why human:** Cross-service redirects (Supabase magic link email, Stripe Checkout hosted page), webhook timing, real browser session management

### 2. Pending Activation Queue Updates

**Test:** After a test signup completes, log in as platform admin and visit /platform/organizations
**Expected:** New org appears in amber "Pending Activation" section with company name, tier badge (Starter/Growth/Enterprise), signup date, Stripe Dashboard link
**Why human:** Requires Stripe webhook to actually fire, data to be written to DB, and UI to render from live data

### 3. Activation with Welcome Email

**Test:** On /platform/organizations, enter a subdomain slug for a Growth/Enterprise org, click Activate
**Expected:** Success toast, org disappears from pending queue, welcome email arrives at org admin's email address with their login URL (subdomain), plan name, getting-started guide, and branded CTA button
**Why human:** Email delivery via Resend, email content correctness, branding rendering in email client

### 4. Branding Wizard in Pending State

**Test:** As a pending org admin, navigate to /onboarding/branding. Upload a logo, pick a primary colour, set company name, save. Reload page.
**Expected:** All saved data persists. Logo preview shows. Colour picker reflects saved hex. After activation by platform admin, branding appears in the org portal.
**Why human:** File upload to Supabase Storage, visual colour picker, persistence across page reload, branding rendering post-activation

### 5. Middleware Routing

**Test:** As a pending org admin, try navigating directly to /admin. As an activated org admin, try navigating to /onboarding.
**Expected:** Pending org redirected from /admin to /onboarding. Activated org redirected from /onboarding to /admin.
**Why human:** Depends on real session state, database flag, and middleware execution timing

### Gaps Summary

No structural gaps found. All 11 artifacts exist, are substantive (3,024 total lines across all files), contain no stubs or TODOs, and are properly wired to each other. The complete flow chain is verified:

1. `/signup` page -> calls POST `/api/billing/checkout` -> creates org+branding+membership -> Stripe Checkout Session
2. Stripe Checkout -> webhook sets subscription_status=active -> `/onboarding` page polls `/api/billing/checkout-status` until confirmed
3. `/onboarding/branding` page -> updates org_branding with logo/colour/name while in pending state
4. `/platform/organizations` page -> shows pending queue -> calls POST `/api/platform/organizations/activate` -> sets onboarding_completed=true -> sends welcome email
5. Middleware gates pending orgs to /onboarding, redirects activated orgs to /admin

One minor note: ONBOARD-03 requirement mentions "receives an email notification" for platform admin on new signup, which is not implemented. However, this is not in the Phase 29 success criteria (which focus on the queue UI). The platform admin discovers pending orgs via the dashboard queue, which satisfies the phase's stated success criteria.

---

*Verified: 2026-02-18T23:45:00Z*
*Verifier: Claude (gsd-verifier)*
