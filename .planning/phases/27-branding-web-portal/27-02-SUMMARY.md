# Summary: 27-02 Dashboard Layout Rebrand

**Status:** Complete
**Duration:** ~1 min

## What was built

Dashboard sidebar header now shows org branding instead of hardcoded "SiteMedic" / "Dashboard":
- Company name from `x-org-company-name` header (fallback: "SiteMedic")
- Org logo when `x-org-logo-url` present; initials fallback in org-primary coloured square
- Tagline from `x-org-tagline` header (fallback: "Dashboard")
- No `<img>` rendered when logo URL is empty

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 422f4cb | feat | Rebrand dashboard sidebar with org company name, logo, tagline |

## Deviations

None.
