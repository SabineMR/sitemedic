---
phase: 33-event-posting-discovery
plan: 03
status: complete
started: 2026-02-19
completed: 2026-02-19
---

# Plan 33-03 Summary: Event Discovery for Medics

## What Was Built

1. **React Query Hooks (events.ts)** — `useMarketplaceEvents` with full filter params (status, type, role, lat/lng, radius, date range, pagination) and `useMarketplaceEvent` for single event fetch

2. **Browse Events Page (page.tsx)** — List/map toggle, auto-detect company owner vs individual medic, automatic location setup for medics, pagination, loading skeletons, empty state

3. **EventListRow** — Dense 12-column grid: event name + type badge, date range with multi-day count, staffing summary (truncated with +N), budget range, approximate location with haversine distance, deadline countdown with urgency highlighting, quote count

4. **EventFilters** — Dual search modes: company owners get Google Places area search + UK region dropdown (12 regions with lat/lng centers), individual medics get "Near me" radius search (10-150 miles). Common filters: event type, role, date range

5. **EventMap** — Google Maps integration with event markers, InfoWindow popups (name, type, dates, detail link), radius circle overlay, auto-fit bounds. Uses existing `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

6. **Event Detail Page** — Full event info with approximate location ONLY (location_display, NOT exact address/postcode). Shows schedule table, staffing requirements, equipment, budget. Quote button disabled with Phase 34 note. Breadcrumb navigation

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `4bda2c9` | feat(33-03): add event discovery browse page with filters and list view |
| 2 | `555e8da` | feat(33-03): add event detail page and Google Maps view component |

## Files Created

- `web/lib/queries/marketplace/events.ts`
- `web/app/marketplace/events/layout.tsx`
- `web/app/marketplace/events/page.tsx`
- `web/components/marketplace/events/EventListRow.tsx`
- `web/components/marketplace/events/EventFilters.tsx`
- `web/components/marketplace/events/EventMap.tsx`
- `web/app/marketplace/events/[id]/page.tsx`

## Key Decisions

- **Approximate location only** — Event detail page shows `location_display` (town/city + area) only; exact address revealed after quoting
- **Dual search modes** — Company owners search by city/region; individual medics search by radius from profile location
- **Google Maps via Script** — Follows existing QuoteBuilder pattern with `next/script` and raw Google Maps API (no @react-google-maps/api)
- **Haversine client-side** — Distance calculation done in EventListRow using coordinates from API response
