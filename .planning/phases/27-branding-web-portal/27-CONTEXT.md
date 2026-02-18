# Phase 27: Branding — Web Portal - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply org brand identity (logo, accent colour, company name) across the dashboard and admin portal. All branding resolved server-side via x-org-* headers from Phase 26 middleware — no client-side branding fetches, no flash of unbranded content. Browser tab title shows "[Company Name] — SiteMedic".

</domain>

<decisions>
## Implementation Decisions

### Colour depth
- Replace hardcoded `blue-600`/`blue-700` in the admin sidebar with `var(--org-primary)` — this covers:
  - Active nav item background (currently `bg-gradient-to-r from-blue-600 to-blue-700`)
  - Brand icon background (currently `bg-gradient-to-br from-blue-600 to-blue-700`)
  - User avatar background (same gradient)
  - Loading spinner border (currently `border-blue-600`)
  - Active indicator shadow (currently `shadow-blue-500/20`)
- For gradients: use solid `var(--org-primary)` with opacity variants (e.g., `bg-[color:var(--org-primary)]` + `hover:brightness-110`) instead of from/to gradients — a single colour variable cannot produce a gradient pair
- Dashboard layout sidebar header: replace "SiteMedic" text with org company name
- DO NOT change shadcn/ui's built-in `primary` colour in the design system — that stays as the SiteMedic blue. Only the sidebar accent elements get rebranded
- Form buttons, links, and UI components outside the sidebar keep the default shadcn primary colour

### Logo display rules
- Admin sidebar brand area: replace "SM" text icon with org logo `<img>` when `x-org-logo-url` is present
- Logo constrained to `max-h-10 w-auto` (40px height, natural width) inside the existing 40x40 container
- If logo is wider than 40px at 40px height: use `object-contain` to fit within a max-w-[120px] area — the brand section can flex wider
- If no logo configured: show first 2 characters of company name in the existing gradient square (dynamic "SM" → "AS" for Apex Safety)
- Dashboard layout sidebar: same pattern — org logo or company name initials
- No favicon replacement in this phase (complex, minimal UX value)

### SiteMedic defaults
- Default colour: `#2563eb` (Tailwind blue-600) — used when `x-org-primary-colour` header is empty
- Default company name: "SiteMedic" — used when `x-org-company-name` header is empty
- Default logo: none (show "SM" initials) — used when `x-org-logo-url` header is empty
- Default tagline: "Admin Panel" for admin layout, "Dashboard" for dashboard layout
- No broken image placeholders: only render `<img>` when logo URL is truthy
- The existing portal design IS the SiteMedic default — orgs with no branding see exactly what exists today

### Claude's Discretion
- Exact `<style>` tag placement for CSS custom property injection
- Whether to derive a secondary/hover colour from the primary (e.g., darken by 10%) or use opacity
- Loading skeleton colour matching
- Exact BrandingProvider component API (props interface, context shape)
- How to handle the admin layout being a client component (it uses hooks) while needing SSR branding props

</decisions>

<specifics>
## Specific Ideas

- The admin layout sidebar is a dark theme (`bg-gray-800/50`) — the org accent colour needs to work on dark backgrounds. Most brand colours will look fine on dark; edge case of very light colours (e.g., `#FFFFFF`) can be handled by ensuring minimum contrast
- Two separate layouts need rebranding: dashboard layout (server component, shadcn/ui Sidebar) and admin layout (client component, custom sidebar). Both read from the same BrandingProvider
- The `bg-[color:var(--org-primary)]` Tailwind pattern is the correct approach — Tailwind JIT cannot construct class names from runtime strings (confirmed in research)
- Tab title format: `[Company Name] — SiteMedic` (em dash, not hyphen)

</specifics>

<deferred>
## Deferred Ideas

- Favicon replacement per org — adds complexity with no significant UX value for v3.0
- Custom font selection per org — deferred to v3.1 (XBRAND-01)
- Dark/light mode toggle per org — not in v3.0 scope

</deferred>

---

*Phase: 27-branding-web-portal*
*Context gathered: 2026-02-18*
