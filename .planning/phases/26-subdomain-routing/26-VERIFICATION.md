---
status: human_needed
---

# Phase 26 Verification: Subdomain Routing

## Phase Goal
Each org on Growth or Enterprise tier is accessible at `slug.sitemedic.co.uk`. The Next.js middleware securely extracts the subdomain, resolves the org, and injects `x-org-*` headers that all SSR pages consume. The branded login page shows the org's own identity to unauthenticated visitors.

## Must-Haves Verification

### ROUTE-01: Org accessible at slug.sitemedic.co.uk
- [x] `NEXT_PUBLIC_ROOT_DOMAIN` env var exists in `.env.local.example` — confirmed at line 28
- [x] `extractSubdomain()` parses `apex.sitemedic.co.uk` → `'apex'` — confirmed in `middleware.ts:27-51`
- [x] Vercel wildcard domain setup documented in plan checkpoint
- **Human needed:** Vercel wildcard domain `*.sitemedic.co.uk` and DNS CNAME must be configured

### ROUTE-02: Middleware extracts subdomain, injects x-org-* headers
- [x] `extractSubdomain()` helper exists — `middleware.ts:27`
- [x] Service-role org lookup by slug with joined branding query — `middleware.ts:74-86`
- [x] Headers injected: `x-org-id`, `x-org-slug`, `x-org-tier`, `x-org-company-name`, `x-org-primary-colour`, `x-org-logo-url`, `x-org-tagline` — `middleware.ts:96-113`
- [x] Unknown slug redirects to apex root — `middleware.ts:88-92`

### ROUTE-03: Incoming x-org-* headers stripped (CVE-2025-29927 mitigation)
- [x] All 7 x-org-* headers stripped at top of `updateSession()` before any processing — `middleware.ts:63-65`
- [x] Header stripping uses `requestHeaders.delete()` on each header individually

### ROUTE-04: Branded login page
- [x] Login page reads x-org-* headers via `next/headers` — `login/page.tsx:15-21`
- [x] Org company name displayed in card title — `login-form.tsx:174`
- [x] Org logo displayed when configured — `login-form.tsx:168-172`
- [x] SiteMedic defaults on apex domain — `page.tsx:17-20` fallback values
- [x] "Powered by SiteMedic" footer on subdomain pages — `login-form.tsx:154,222`

### Success Criteria
1. **apex.sitemedic.co.uk/login shows Apex branding** — Code verified: middleware resolves slug, injects branding headers, login page reads them. **Human needed:** Must test with actual DNS or /etc/hosts entry
2. **Forged x-org-id header does not inject false org context** — Verified: all x-org-* headers stripped at `middleware.ts:63-65` before being re-set
3. **Unknown slug redirects to apex root** — Verified: `middleware.ts:88-92` returns `NextResponse.redirect()` to root domain
4. **Cookie domain not widened** — Verified: no `domain` attribute set on cookies anywhere in `web/lib/supabase/`. Documentation comment at `middleware.ts:14-17`

### Additional Checks
- [x] Signout route uses request origin (not hardcoded) — `signout/route.ts:16-19`
- [x] Middleware matcher allows `/login` through for subdomain branding
- [x] Existing auth flow preserved (public routes, role redirects, org_id check)
- [x] Dynamic import of `@supabase/supabase-js` (only loaded when subdomain detected)

## Human Verification Checklist

The following items require manual testing:

- [ ] **DNS:** Configure Vercel wildcard domain `*.sitemedic.co.uk` and DNS CNAME — or test locally with `/etc/hosts` entry `127.0.0.1 apex.localhost`
- [ ] **Subdomain login:** Visit `apex.localhost:30500/login` and verify Apex branding appears (company name, not "SiteMedic")
- [ ] **Apex login:** Visit `localhost:30500/login` and verify SiteMedic defaults still show
- [ ] **Unknown slug:** Visit `notexist.localhost:30500` and verify redirect to `localhost:30500/`
- [ ] **Magic link:** Send a magic link from subdomain login page and verify callback returns to same subdomain
- [ ] **Signout:** Sign out from subdomain and verify redirect stays on subdomain `/login`

## Score: 4/4 must-haves verified in code

All requirements verified in codebase. Human testing needed for end-to-end DNS + browser verification.
