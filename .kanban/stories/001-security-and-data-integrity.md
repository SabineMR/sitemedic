# Phase 1 — Security & Data Integrity

**ID:** STORY-001
**Epic:** Gap Closure
**Priority:** critical
**Status:** ready

## User Story
**As a** platform operator,
**I want** all API endpoints and database tables to have proper authorization and type safety,
**So that** no user can access data they shouldn't and the app doesn't crash from type mismatches.

## Acceptance Criteria
- [ ] Location analytics endpoint requires admin role (not just any authenticated user)
- [ ] `medic_alerts` table has RLS policies applied
- [ ] All `as unknown as Type[]` TypeScript casts replaced with proper typed queries
- [ ] Silent catch block in travel-time function logs errors

## Tasks
- [ ] [TASK-001](../1-backlog/001-fix-location-analytics-auth.md)
- [ ] [TASK-002](../1-backlog/002-fix-medic-alerts-rls.md)
- [ ] [TASK-003](../1-backlog/003-fix-typescript-casts.md)
- [ ] [TASK-004](../1-backlog/004-fix-silent-catch-travel-time.md)

## Notes
These are security/stability issues that must ship before any other phase.
The analytics endpoint currently allows ANY authenticated user to view all medic location data.
