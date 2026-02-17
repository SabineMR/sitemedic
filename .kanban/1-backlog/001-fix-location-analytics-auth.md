# Fix: Add Admin Role Check to Location Analytics Endpoint

**ID:** TASK-001
**Story:** [STORY-001](../stories/001-security-and-data-integrity.md)
**Priority:** critical
**Branch:** `fix/001-location-analytics-auth`
**Labels:** security, backend

## Description
`/supabase/functions/location-analytics/index.ts:70` has a TODO comment:
`// TODO: Check if user is admin (implement based on your auth schema)`
Any authenticated user can currently call this endpoint and see all medic location data.

## Acceptance Criteria
- [ ] Endpoint checks caller's role against `profiles.role` or platform admin table
- [ ] Returns 403 if caller is not admin or platform_admin
- [ ] Existing admin callers still work correctly

## Notes
Use the same auth pattern as other admin edge functions in the codebase.
