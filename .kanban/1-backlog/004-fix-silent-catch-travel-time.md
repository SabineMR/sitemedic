# Fix: Add Error Logging to Silent Catch in Travel-Time Function

**ID:** TASK-004
**Story:** [STORY-001](../stories/001-security-and-data-integrity.md)
**Priority:** medium
**Branch:** `fix/004-silent-catch`
**Labels:** debugging, backend

## Description
`/supabase/functions/calculate-travel-time/index.ts` has an empty catch block
that swallows JSON parse errors silently (`catch { return null }`).

## Acceptance Criteria
- [ ] Catch block logs the error with context (what was being parsed, input value)
- [ ] Returns null as before (non-breaking change)

## Notes
One-line fix: `catch (e) { console.error('Travel time JSON parse failed:', e); return null; }`
