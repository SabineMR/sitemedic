# Phase 27: Branding — Web Portal — Verification

**Verified:** 2026-02-18
**Status:** passed

## Must-Haves Verification

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | BrandingProvider exists with useBranding() and CSS custom property | ✓ | `web/contexts/branding-context.tsx` exports BrandingProvider, useBranding(), Branding type, DEFAULT_BRANDING |
| 2 | Root layout reads x-org-* headers and wraps in BrandingProvider | ✓ | `web/app/layout.tsx` reads 5 headers, passes to BrandingProvider |
| 3 | Dynamic tab title with company name | ✓ | generateMetadata() returns title template `%s — ${companyName}` with em dash |
| 4 | CSS custom property injected at root level | ✓ | BrandingProvider renders `<style>:root { --org-primary: ${hex} }</style>` |
| 5 | Hex colour validated before injection (XSS defence) | ✓ | `/^#[0-9a-fA-F]{6}$/` regex gate, fallback to #2563eb |
| 6 | Dashboard sidebar shows org company name, logo, tagline | ✓ | `web/app/(dashboard)/layout.tsx` reads headers, shows logo/initials + name + tagline |
| 7 | Admin sidebar shows org company name, logo, tagline | ✓ | `web/app/admin/layout.tsx` uses useBranding(), conditional logo/initials |
| 8 | All blue-600/blue-700 replaced in admin layout | ✓ | 0 matches for blue-600/blue-700/blue-500 in admin/layout.tsx |
| 9 | Active nav uses var(--org-primary) | ✓ | `bg-[color:var(--org-primary)]` replaces gradient |
| 10 | User avatar uses var(--org-primary) | ✓ | `bg-[color:var(--org-primary)]` replaces gradient |
| 11 | Loading spinners use var(--org-primary) | ✓ | `border-[color:var(--org-primary)]` replaces border-blue-600 |
| 12 | No broken images when logo URL empty | ✓ | Conditional `<img>` render in both layouts; initials fallback |
| 13 | Auth layout cleaned (no redundant injection) | ✓ | Headers import removed, inline --org-primary style removed |
| 14 | No client-side branding fetch | ✓ | All branding from SSR headers via middleware; no /api/branding endpoint |

**Score:** 14/14 must-haves verified

## Success Criteria (from ROADMAP.md)

1. ✓ Portal header shows org company name + logo — SSR from x-org-* headers
2. ✓ Accent colour matches org config — CSS custom property from org_branding.primary_colour_hex
3. ✓ Null branding → SiteMedic defaults — DEFAULT_BRANDING provides all fallbacks
4. ✓ Tab title "[Company Name] — SiteMedic" — generateMetadata() with em dash template

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| BRAND-03 | Org branding applied to web portal | ✓ Complete |
| BRAND-06 | Branding resolved server-side via x-org-* headers | ✓ Complete |

## Human Verification Checklist

- [ ] Visit apex subdomain portal — org name, logo, and accent colour visible
- [ ] Visit apex domain (no subdomain) — SiteMedic defaults shown
- [ ] Change primary_colour_hex in org_branding → hard refresh shows new colour
- [ ] Tab title shows "[Company Name] — SiteMedic" on subdomain portal
- [ ] No broken images when org has no logo configured
- [ ] Network tab: no /api/branding requests on page load

---

*Verified: 2026-02-18*
