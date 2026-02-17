# Phase 13: UX Polish & Missing States

**Milestone:** v1.1
**Priority:** MEDIUM
**Status:** Pending planning

## Problem

Several pages show plain text "Loading..." with no skeleton loaders causing layout shift and poor perceived performance. The geofence form requires manual lat/lng entry — no map picker. RIDDOR drafts have no auto-save (data loss risk), no audit trail, and no photo gallery.

## Goal

Polish the UX across data-heavy pages with skeleton loaders, make geofence creation visual, wire geofence exit alerts, and complete the RIDDOR incident workflow.

## Gaps Closed

- No skeleton loaders: `/dashboard/treatments`, `/dashboard/workers`, `/platform/organizations`, `/admin/command-center`
- Geofence: manual lat/lng only — no visual map point picker
- Geofence: no exit alerts when medic leaves boundary
- Geofence: no coverage analytics (% of booking sites covered)
- RIDDOR: no draft auto-save (data loss on page refresh)
- RIDDOR: no audit trail of status changes
- RIDDOR: no photo gallery in incident detail view

## Key Files

- `web/app/(dashboard)/treatments/page.tsx` — just text loading state
- `web/app/(dashboard)/workers/page.tsx` — just text loading state
- `web/app/platform/organizations/page.tsx` — basic loading state
- `web/app/admin/command-center/page.tsx` — "Loading command center..." text
- `web/app/admin/geofences/page.tsx` — manual lat/lng entry (no map)
- `web/app/(dashboard)/riddor/page.tsx` — no auto-save, no audit trail
- `web/app/(dashboard)/riddor/[id]/page.tsx` — no photo gallery

## Planned Tasks

1. **13-01:** Skeleton loaders — add `<Skeleton>` components to treatments, workers, platform/organizations, and command-centre pages; match the shape of actual data rows
2. **13-02:** Geofence map picker — replace lat/lng text inputs with interactive Leaflet map (click to place centre, drag to resize radius circle); show existing geofences as reference
3. **13-03:** Geofence exit alerts — when `useMedicLocationsStore` receives a ping, check if medic is within their assigned geofences; if not, upsert `medic_alerts` row of type `geofence_failure`
4. **13-04:** RIDDOR polish — auto-save draft every 30s (debounced, silent), audit trail section in detail view (status changes with timestamp + actor), photo gallery grid in incident detail

## Success Criteria

1. Treatments page shows 6 skeleton rows during fetch — no layout shift
2. Geofence "Add" page has a map — click to place centre, drag to resize radius
3. Medic stepping outside geofence triggers alert in command centre within 60 seconds
4. RIDDOR draft survives a page refresh (auto-save working)
5. RIDDOR detail shows "Status changed: draft → submitted by Kai Jensen at 14:32"
