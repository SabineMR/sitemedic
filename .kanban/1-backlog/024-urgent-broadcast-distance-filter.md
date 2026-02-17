# Fix: Filter Urgent Shift Broadcasts by 30-Mile Radius

**ID:** TASK-024
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** medium
**Branch:** `feat/024-broadcast-distance-filter`
**Labels:** backend, notifications, location

## Description
`/supabase/functions/last-minute-broadcast/index.ts:96`:
`// TODO: Filter by 30-mile radius`
All available medics are notified for urgent shifts regardless of distance.

## Acceptance Criteria
- [ ] Calculate distance between medic's home postcode and shift site postcode
- [ ] Only notify medics within 30 miles (configurable)
- [ ] Fall back to 50-mile radius if fewer than 3 medics found within 30 miles
- [ ] Log how many medics were in radius vs excluded

## Notes
Use the existing postcode/coordinate data from `uk_postcodes` table (migration seeded via seed-uk-postcodes).
Haversine formula for distance calculation.
