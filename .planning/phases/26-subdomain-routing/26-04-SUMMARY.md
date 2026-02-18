# Plan 26-04 Summary: Auth Cookie Scope Verification & Local Dev Testing

## Status: Complete

## What was built
- Fixed signout route (`web/app/api/auth/signout/route.ts`) to use request origin instead of hardcoded `NEXT_PUBLIC_SITE_URL` — signing out at `apex.sitemedic.co.uk` now redirects to `apex.sitemedic.co.uk/login`, not the apex domain
- Verified cookie scope: `@supabase/ssr` does NOT set explicit cookie domain — browser defaults to exact hostname, ensuring session isolation between org subdomains
- Cookie scope documentation already added to middleware in Plan 26-02 (comment block at top of file)
- Verified auth flow preservation: all public routes, auth redirects, and org_id checks work unchanged after middleware rewrite

## Commits
| Hash | Message |
|------|---------|
| 7d5e776 | fix(26-04): fix signout route to preserve subdomain origin |

## Files Modified
- `web/app/api/auth/signout/route.ts` — use request origin for redirect

## Deviations
- None

## Verification Notes
- No `domain` attribute set on cookies anywhere in `web/lib/supabase/` — confirmed by grep
- `setAll()` in middleware passes `options` from Supabase which includes `path: '/'` but no `domain`
- Middleware matcher already allows `/login` through (not in exclusion list)
- All auth flows (unauthenticated redirect, authenticated redirect, org_id check, setup route) preserved in rewritten middleware
