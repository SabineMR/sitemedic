# Phase 27: Branding — Web Portal — Research

**Researched:** 2026-02-18
**Status:** Complete

## Codebase Analysis

### Current Layout Architecture

**Root Layout** (`web/app/layout.tsx`):
- Server component (no 'use client')
- Wraps everything in `OrgProvider` (client component from `web/contexts/org-context.tsx`)
- Static `export const metadata` with hardcoded "Apex Safety Group" title
- This is the ideal place to add BrandingProvider — it's a server component that can read headers and pass props to a client component provider

**Dashboard Layout** (`web/app/(dashboard)/layout.tsx`):
- Server component — can read `next/headers` directly
- Uses shadcn/ui `<Sidebar>`, `<SidebarHeader>`, etc.
- Hardcoded: `<h2>SiteMedic</h2>` and `<p>Dashboard</p>` in SidebarHeader
- No colour customisation — uses default shadcn theme
- Simple text replacement needed + optional logo

**Admin Layout** (`web/app/admin/layout.tsx`):
- Client component (`'use client'`) — **cannot** read `next/headers`
- Custom dark sidebar (`bg-gray-800/50`)
- 6 hardcoded blue-600/blue-700 references:
  1. Loading spinner: `border-blue-600` (line 105, 117)
  2. Brand icon gradient: `bg-gradient-to-br from-blue-600 to-blue-700` (line 244)
  3. Active nav gradient: `bg-gradient-to-r from-blue-600 to-blue-700` + `shadow-blue-500/20` (line 265)
  4. Active badge fallback: `bg-blue-500` (line 282)
  5. User avatar gradient: `bg-gradient-to-br from-blue-600 to-blue-700` (line 303)
- Brand area: 40x40 gradient square with "SM" text + "SiteMedic" heading + "Admin Panel" subtitle
- Must use `useBranding()` context hook to get branding values (can't read headers)

**Auth Layout** (`web/app/(auth)/layout.tsx`):
- Server component — already reads `x-org-primary-colour` header
- Injects `--org-primary` CSS custom property via inline `style` attribute
- This will become redundant once BrandingProvider in root layout handles it

### Middleware Headers Available
From `web/lib/supabase/middleware.ts`, these 7 headers are injected for subdomain requests:
- `x-org-id`, `x-org-slug`, `x-org-tier`
- `x-org-company-name`, `x-org-primary-colour`, `x-org-logo-url`, `x-org-tagline`

For apex/non-subdomain requests, these headers are absent (deleted at top of middleware).

### Key Technical Decisions

**CSS Custom Property Strategy:**
- BrandingProvider injects `<style>` tag setting `:root { --org-primary: #hex; }`
- Tailwind pattern: `bg-[color:var(--org-primary)]` for backgrounds
- Hover/active: `brightness-110` filter instead of gradient pair (single variable can't make a gradient)
- Shadow: use neutral shadow (`shadow-gray-500/20`) instead of `shadow-blue-500/20` (can't use CSS var in Tailwind shadow)
- Auth layout's existing inline `--org-primary` injection will be removed (root-level handles it)

**XSS Defence:**
- Colour value injected into `<style>` tag — must validate hex format before injection
- Regex: `/^#[0-9a-fA-F]{6}$/` — reject anything else, use default `#2563eb`
- DB has CHECK constraint on `primary_colour_hex` but defence in depth needed

**Tab Title Strategy:**
- Convert root layout's static `metadata` export to `generateMetadata()` async function
- Read `x-org-company-name` header
- Use Next.js title template: `{ template: '%s — CompanyName', default: 'CompanyName — SiteMedic' }`
- Default (no org): preserve current SiteMedic title

**Logo Display:**
- When `logoUrl` is present: `<img src={logoUrl} alt={companyName} className="max-h-10 w-auto object-contain" />`
- When no logo: show first 2 characters of company name in coloured square (dynamic initials)
- Never render `<img>` with empty/falsy src — conditional render only

### Component Hierarchy

```
RootLayout (server) — reads headers → BrandingProvider(branding={...})
  └─ BrandingProvider (client) — provides context + <style> tag
       ├─ (auth)/layout → login page (already branded from Phase 26)
       ├─ (dashboard)/layout (server) — reads headers directly for SSR text
       └─ admin/layout (client) — uses useBranding() hook
```

## Files Affected

| File | Action | Why |
|------|--------|-----|
| `web/contexts/branding-context.tsx` | CREATE | BrandingProvider + useBranding() + CSS custom property |
| `web/app/layout.tsx` | MODIFY | Read headers, wrap in BrandingProvider, generateMetadata() |
| `web/app/(auth)/layout.tsx` | MODIFY | Remove redundant inline --org-primary injection |
| `web/app/(dashboard)/layout.tsx` | MODIFY | Replace "SiteMedic"/"Dashboard" with org values, add logo |
| `web/app/admin/layout.tsx` | MODIFY | Replace blue-600/700 with var(--org-primary), logo swap, company name |

---

*Research completed: 2026-02-18*
