# Phase 10: Real-Time Operations Polish

**Milestone:** v1.1
**Priority:** HIGH
**Status:** Pending planning

## Problem

Three critical operational gaps in the live command centre and payment flow:
1. Medic location pings show no names or booking context (explicit TODO in code)
2. Payment failures leave users completely stuck — no retry, no support path
3. The alert system has 9 defined alert types but none are actionable

## Goal

Make the command centre actually usable in a live shift: admins know who each dot on the map is, can act on every alert, and users can recover from payment failures without calling support.

## Gaps Closed

- `useMedicLocationsStore.ts:153` — TODO: Fetch medic name and booking details from joined query
- Command centre map shows anonymous pings with no context
- Payment failure has no retry button or support contact
- `dismissal_notes` / `resolution_notes` fields exist in alert state but no UI to fill them
- Alert system: no bulk dismiss, no suggested actions per type, no auto-escalation, no sound toggle
- Command centre contact button disabled with no fallback when `medicPhone` is null

## Key Files

- `web/stores/useMedicLocationsStore.ts:153` — the TODO location
- `web/stores/useMedicAlertsStore.ts` — alert state (dismissal_notes, resolution_notes defined)
- `web/app/admin/command-center/page.tsx` — command centre UI (disabled contact button)
- `web/components/admin/MedicTrackingMap.tsx` — map markers (no medic context)
- `web/components/admin/AlertPanel.tsx` — alert panel (no notes, no bulk actions)
- `web/components/booking/payment-form.tsx` — payment form (no retry on failure)

## Planned Tasks

1. **10-01:** Fix `useMedicLocationsStore` — join medic name, photo, booking site, shift times to each ping
2. **10-02:** Update `MedicTrackingMap` markers — show medic name + shift on hover/tap
3. **10-03:** Payment failure UX — retry button, "Contact Support" mailto, reference number display
4. **10-04:** Alert panel — `dismissal_notes` input on dismiss, `resolution_notes` input on resolve, bulk dismiss for non-critical
5. **10-05:** Alert system — suggested action per alert type, auto-escalation after 15 min, command centre fallback when `medicPhone` null

## Success Criteria

1. Command centre shows "Kai Jensen — Royal Exchange Site, 07:00-15:00" on map marker
2. Payment failure page has a working retry button that re-attempts the same payment intent
3. Dismissing an alert prompts for a note and logs it to `medic_alerts` table
4. Unacknowledged `geofence_failure` alert escalates to red pulsing state after 15 minutes
