# Build: Enforce Geofence at Medic Check-In

**ID:** TASK-032
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** medium
**Branch:** `feat/032-geofence-checkin-enforcement`
**Labels:** backend, location, compliance

## Description
Geofences are configured in admin but never enforced during booking check-in.
The `geofence-check` edge function exists but isn't called from the booking flow.

## Acceptance Criteria
- [ ] When medic marks shift as started, server calls `geofence-check` edge function
- [ ] If medic is outside the site geofence, check-in is flagged (not blocked, but warned)
- [ ] Admin sees OOT flag on shift if medic checked in from outside geofence
- [ ] Mobile app shows medic a warning if they're outside geofence when checking in

## Notes
Don't hard-block check-in — flag it. Medics may need to check in remotely in emergencies.
