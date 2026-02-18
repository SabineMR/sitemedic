# Plan 26-02 Summary: Middleware Subdomain Extraction & Header Injection

## Status: Complete

## What was built
- `extractSubdomain()` helper that parses subdomain from host header (handles apex, www, Vercel preview, localhost dev)
- Security header stripping: all `x-org-*` headers deleted at top of `updateSession()` before any processing (CVE-2025-29927 mitigation)
- Service-role org lookup using `@supabase/supabase-js` with dynamic import (only loaded when subdomain detected)
- Single joined query: `organizations` + `org_branding` in one DB call
- Header injection: `x-org-id`, `x-org-slug`, `x-org-tier`, `x-org-company-name`, `x-org-primary-colour`, `x-org-logo-url`, `x-org-tagline`
- Logo URL constructed from `logo_path` via Supabase Storage public URL pattern
- Unknown subdomain redirect to apex domain root
- Middleware matcher verified — `/login` passes through for subdomain branding
- Cookie scope documented — `@supabase/ssr` does not set explicit domain, ensuring per-subdomain session isolation

## Commits
| Hash | Message |
|------|---------|
| 0dfbf1b | feat(26-02): add subdomain extraction and org header injection to middleware |

## Files Modified
- `web/lib/supabase/middleware.ts` — full subdomain routing implementation

## Deviations
- None — implemented exactly as planned

## Technical Notes
- Dynamic import of `@supabase/supabase-js` inside the subdomain block avoids bundling the full client when not needed (apex domain requests skip entirely)
- `org_branding` join returns object (single row via UNIQUE constraint), but defensive `Array.isArray` check added since Supabase joins can return arrays
- All existing auth flow (getUser, public routes, role redirects, org_id check) preserved unchanged
