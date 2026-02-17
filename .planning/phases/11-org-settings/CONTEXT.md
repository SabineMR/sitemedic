# Phase 11: Organisation Settings

**Milestone:** v1.1
**Priority:** MEDIUM
**Status:** Pending planning

## Problem

Key business configuration values are hardcoded in source files. Multi-tenant organisations cannot customise their own rates and rules without a code deployment.

## Goal

Move all organisation-specific configuration into a database-backed settings system with an admin UI to manage it.

## Gaps Closed

- `baseRate: 42` hardcoded in `booking-form.tsx:84`
- `DEFAULT_RADIUS = 200` hardcoded in `geofences/page.tsx:27`
- Urgency premiums `[0, 20, 50, 75]` hardcoded in `bookings/create/route.ts:111`
- Admin email fallback hardcoded — no per-org admin email

## Key Files

- `web/components/booking/booking-form.tsx:84` — `baseRate: 42`
- `web/app/admin/geofences/page.tsx:27` — `DEFAULT_RADIUS = 200`
- `web/app/api/bookings/create/route.ts:111` — `validUrgencyPremiums = [0, 20, 50, 75]`
- `web/app/admin/settings/page.tsx` — admin settings page (extend this)
- `web/lib/booking/pricing.ts` — pricing calculation (needs to read from DB)

## Planned Tasks

1. **11-01:** `org_settings` migration — table with `base_rate`, `geofence_default_radius`, `urgency_premiums` (JSONB), `admin_email`, `net30_eligible`, `credit_limit`; seed with current hardcoded defaults
2. **11-02:** Admin settings page at `/admin/settings` — form for all configurable values with validation
3. **11-03:** Wire booking pricing + geofence creation + urgency premium validation to read from `org_settings` (remove all hardcoded values)

## Success Criteria

1. Admin changes base rate from £42 to £45 in settings — new bookings use £45
2. Geofence "Add" pre-fills radius with org's configured default
3. Settings page validates: base rate > 0, radius 50–5000m, at least one urgency premium tier
