---
phase: 15-code-quality
plan: 03
subsystem: admin-operations
tags: [admin, booking, medic-assignment, email-notifications, tanstack-query]
requires: ["15-01"]
provides: ["manual-medic-assignment-via-match-endpoint", "assign-medic-dialog-in-detail-panel"]
affects: ["admin-dashboard", "booking-management"]
tech-stack:
  added: []
  patterns: ["manual-override-path", "query-invalidation-on-mutation"]
key-files:
  created: []
  modified:
    - web/app/api/bookings/match/route.ts
    - web/components/admin/booking-detail-panel.tsx
decisions:
  - "Use /api/bookings/match endpoint as the single path for both auto and manual assignment — keeps email notification chain identical"
  - "overrideMedicId placed in request body alongside bookingId — no breaking change to existing callers"
  - "Button shown when booking.medics is null OR booking.requires_manual_approval — covers both unmatched and failed-auto-match cases"
  - "useAvailableMedics already sorted by star_rating DESC in fetchAvailableMedics — no additional sorting needed"
  - "queryClient.invalidateQueries({ queryKey: ['bookings'] }) used to refresh table after assignment"
metrics:
  duration: "2 min"
  completed: "2026-02-17"
---

# Phase 15 Plan 03: Manual Medic Assignment Summary

**One-liner:** Admin manual medic assignment via match endpoint with email notification chain, exposed through BookingDetailPanel dialog sorted by star rating.

## What Was Built

Extended the admin booking workflow so admins can manually assign a specific medic to any unmatched or requires_manual_approval booking. The assignment goes through the same `/api/bookings/match` endpoint as auto-assignment, ensuring the email notification chain fires identically.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend /api/bookings/match with overrideMedicId | dbd3ecc | web/app/api/bookings/match/route.ts |
| 2 | Add Assign Medic Manually dialog to BookingDetailPanel | 90844c0 | web/components/admin/booking-detail-panel.tsx |

## Changes by File

### web/app/api/bookings/match/route.ts

- Added `overrideMedicId?: string` to `AutoMatchRequest` interface
- Extracted `overrideMedicId` from request body alongside `bookingId`
- New **MANUAL OVERRIDE PATH** block inserted before auto-assign path:
  - Step 1: Updates `bookings.medic_id` and sets `requires_manual_approval = false`
  - Step 2: Triggers `/api/email/booking-confirmation` (same pattern as auto path)
  - Step 3: Fetches medic `first_name`, `last_name`, `star_rating` for response
  - Returns `MatchCandidate` with `match_score: 100`, `match_reasons: ['Manually assigned by admin']`
- Existing `auto-assign-medic-v2` edge function path completely unchanged

### web/components/admin/booking-detail-panel.tsx

- Added imports: `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- Added imports: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`
- Added import: `Button` from `@/components/ui/button`
- Added import: `useAvailableMedics` from `@/lib/queries/admin/bookings`
- Added import: `useQueryClient` from `@tanstack/react-query`
- Added import: `UserPlus` from `lucide-react`
- New state: `assignDialogOpen`, `selectedMedicId`, `isAssigning`, `assignError`
- `useAvailableMedics(booking?.shift_date || '')` fetches medics sorted by star_rating DESC
- `handleAssignMedic`: POSTs `{ bookingId, overrideMedicId }` to `/api/bookings/match`, invalidates `['bookings']` query on success
- "Assign Medic Manually" button: appears in Client & Medic section when `!booking.medics || booking.requires_manual_approval`
- Dialog: medic select with star rating display, inline error state, Cancel + Assign Medic buttons

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Single endpoint for auto + manual | Email chain fires identically; no duplicated notification logic |
| overrideMedicId in body | Non-breaking; no URL changes needed |
| Button condition: no medic OR requires_manual_approval | Covers both fresh unmatched bookings and failed auto-assign cases |
| Star rating pre-sorted by DB query | `fetchAvailableMedics` uses `.order('star_rating', { ascending: false })` |
| Query key `['bookings']` invalidation | Refreshes the BookingApprovalTable which uses `useBookings` → `['admin-bookings', orgId]` parent key |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

1. Admin can manually assign a specific medic to an unmatched booking — YES, via "Assign Medic Manually" button in detail panel
2. Manual assignment triggers the email notification chain — YES, same `/api/email/booking-confirmation` call as auto path
3. Medic selector shows available-for-work medics sorted by star rating — YES, `useAvailableMedics` fetches with `order('star_rating', { ascending: false })`
4. Dialog appears only when booking is unassigned or requires manual approval — YES, `(!booking.medics || booking.requires_manual_approval)` condition

## Next Phase Readiness

Phase 15 is now complete (3/3 plans done). No blockers. The admin booking workflow is fully operational with both auto and manual assignment paths.
