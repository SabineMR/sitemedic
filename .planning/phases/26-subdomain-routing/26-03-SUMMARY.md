# Plan 26-03 Summary: Branded Login Page

## Status: Complete

## What was built
- Extracted login form to `web/app/(auth)/login/login-form.tsx` client component with `LoginBranding` props interface
- Converted `web/app/(auth)/login/page.tsx` to server component that reads `x-org-*` headers via `next/headers`
- Login page on subdomain shows: org company name (title), org tagline (subtitle), org logo (above title when configured), "Powered by SiteMedic" footer
- Login page on apex domain shows: "SiteMedic" title, "Site Manager Dashboard" subtitle (unchanged from before)
- Updated auth layout to inject `--org-primary` CSS custom property from `x-org-primary-colour` header
- No client-side branding fetch — all resolved server-side from middleware headers

## Commits
| Hash | Message |
|------|---------|
| 1064d71 | feat(26-03): branded login page with subdomain org branding |

## Files Modified
- `web/app/(auth)/login/login-form.tsx` — new client component with branding props
- `web/app/(auth)/login/page.tsx` — converted to server component
- `web/app/(auth)/layout.tsx` — reads x-org-primary-colour, injects CSS custom property

## Deviations
- None — implemented exactly as planned
