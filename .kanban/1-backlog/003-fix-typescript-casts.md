# Fix: Replace `as unknown as Type[]` TypeScript Safety Bypasses

**ID:** TASK-003
**Story:** [STORY-001](../stories/001-security-and-data-integrity.md)
**Priority:** high
**Branch:** `fix/003-typescript-casts`
**Labels:** code-quality, typescript

## Description
Multiple pages use `as unknown as Type[]` to cast Supabase query results.
This bypasses type safety and can hide runtime shape mismatches.

Affected files:
- `/web/app/admin/shift-swaps/page.tsx`
- `/web/app/admin/medics/[id]/payslips/page.tsx`
- `/web/app/admin/booking-conflicts/page.tsx`
- `/web/app/medic/timesheets/page.tsx`
- `/web/app/medic/page.tsx`

## Acceptance Criteria
- [ ] Each cast replaced with a properly typed Supabase select query (explicit column list)
- [ ] No TypeScript errors introduced
- [ ] Types match actual DB column shapes

## Notes
Use Supabase's generated types in `/web/types/database.types.ts`.
Define return types from the query shape rather than casting after the fact.
