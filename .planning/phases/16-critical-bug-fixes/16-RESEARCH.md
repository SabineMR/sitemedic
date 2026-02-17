# Phase 16 Research: Critical Bug Fixes

## Bug 1: Payslip Page — Wrong medic_id

**File:** `web/app/medic/payslips/page.tsx`
**Line:** 65

### Root Cause
```ts
// Correct: fetches medic record to get medics.id
const { data: medic } = await supabase
  .from('medics')
  .select('id')
  .eq('user_id', user.id)  // user.id = auth UUID
  .single();
if (medic) setMedicId(medic.id);  // medic.id = medics table UUID

// BUG: queries with auth UUID instead of medics UUID
.eq('medic_id', user.id)  // WRONG — should be medic.id
```

### Fix
Replace `.eq('medic_id', user.id)` with `.eq('medic_id', medic.id)`.

Note: `medic` is already in scope at line 65. The medic fetch at lines 47-51 happens before the timesheets query in the same async function. Need to handle the case where `medic` is null (no medic record) — return early.

### Data Model
- `auth.users.id` (UUID) — Supabase auth user
- `medics.id` (UUID generated) — medics table primary key
- `medics.user_id` FK → `auth.users.id`
- `timesheets.medic_id` FK → `medics.id` (NOT `auth.users.id`)

---

## Bug 2: RIDDOR Detail Page — No Draft Edit Inputs

**File:** `web/app/(dashboard)/riddor/[id]/page.tsx`

### Root Cause
The page has full auto-save infrastructure:
- `draftCategory` / `setDraftCategory` state (line 37)
- `draftOverrideReason` / `setDraftOverrideReason` state (line 38)
- 30-second debounced auto-save useEffect (lines 68-91)
- Save on unmount useEffect (lines 94-109)
- `updateRIDDORDraft()` function in queries/riddor.ts

But the JSX only shows read-only display of `incident.category` (line 254) and `incident.override_reason` (line 329). No inputs are bound to `setDraftCategory` or `setDraftOverrideReason`, so state never changes and auto-save always writes the same original values.

### RIDDOR Categories
From the codebase (Phase 6 auto-flagging and UK RIDDOR 2013 regulations):
- `specified_injury` — fractures, amputations, crush injuries (10-day deadline)
- `dangerous_occurrence` — near misses with serious potential (10-day deadline)
- `over_7_day_incapacitation` — worker unable to work >7 days (15-day deadline)
- `occupational_disease` — work-related illness (15-day deadline)
- `gas_incident` — gas-related incidents (10-day deadline)

Note: The deadline card shows `category === 'specified_injury'` gets 10 days, others get 15 days.

### Fix
In the "Incident Details" Card (around lines 247-273):
- When `incident.status === 'draft'`: render `<select>` with RIDDOR categories wired to `setDraftCategory`
- When not draft: keep current read-only display

In the "Medic Review" Card (around lines 311-350):
- When `incident.status === 'draft'` AND `incident.medic_confirmed !== null`: render `<textarea>` for override_reason wired to `setDraftOverrideReason`
- Or: add a new "Draft Review" section that always shows when status is draft

Best approach: Add a dedicated "Draft Review" card visible only when `status === 'draft'` containing both inputs. Keeps read-only display intact for non-draft incidents.

### Auto-save Trigger
The auto-save useEffect already watches `[draftCategory, draftOverrideReason, incidentId, incident?.status]`. Once inputs change state, auto-save will fire automatically. No changes to the useEffect logic needed.

---

## Bug 3: console.warn in useMedicLocationsStore

**File:** `web/stores/useMedicLocationsStore.ts`
**Line:** 121

```ts
console.warn('[Realtime] Received partial update for unknown medic:', medicId);
```

This fires on every location ping received for a medic whose context isn't in the `medicContext` Map (i.e., medic pings before their booking is loaded). In production it creates noise in the browser console.

### Fix
Remove the `console.warn` line. No replacement needed — the `if (!context) return` guard (likely on the next line) already handles the case silently.

---

## Plan Structure Recommendation

**Plan 16-01 (Wave 1, ~5min):**
- Fix payslip medic_id query (1-line change with null guard)
- Remove console.warn from useMedicLocationsStore

**Plan 16-02 (Wave 1, ~15min):**
- Add draft edit inputs to RIDDOR detail page:
  - Category `<select>` wired to `setDraftCategory`
  - Override reason `<textarea>` wired to `setDraftOverrideReason`
  - Show only when `status === 'draft'`

Both plans can execute in Wave 1 in parallel (different files).

---

## Files to Modify

| File | Change |
|------|--------|
| `web/app/medic/payslips/page.tsx` | Line 65: `user.id` → `medic.id`, add null guard |
| `web/stores/useMedicLocationsStore.ts` | Line 121: remove console.warn |
| `web/app/(dashboard)/riddor/[id]/page.tsx` | Add draft edit section with category select + override_reason textarea |
