# Summary: 27-01 BrandingContext + Root Layout Integration

**Status:** Complete
**Duration:** ~3 min

## What was built

1. **BrandingProvider context** (`web/contexts/branding-context.tsx`) — client component providing org branding via React context + CSS custom property injection. XSS defence validates hex colour before injecting into `<style>` tag. Exports `BrandingProvider`, `useBranding()`, `Branding` type, `DEFAULT_BRANDING`.

2. **Root layout integration** (`web/app/layout.tsx`) — reads `x-org-*` headers server-side, passes branding to BrandingProvider wrapping all children. Static metadata replaced with `generateMetadata()` producing dynamic tab titles: `[Company Name] — SiteMedic` for org portals, `SiteMedic — Professional Paramedics...` for apex.

3. **Auth layout cleanup** (`web/app/(auth)/layout.tsx`) — removed redundant `--org-primary` inline style injection (now handled at root level by BrandingProvider).

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0cdedae | feat | Create branding context with BrandingProvider and useBranding hook |
| 92ebe76 | feat | Wire BrandingProvider into root layout with dynamic tab title |
| 7590d36 | refactor | Remove redundant --org-primary injection from auth layout |

## Deviations

None.
