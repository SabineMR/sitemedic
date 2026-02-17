# Phase 15 Research

**Researched:** 2026-02-17
**Domain:** Code quality, admin UI, schedule board
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Summary

Phase 15 has three distinct work streams: (1) removing non-error console statements from production code, (2) adding an "Assign Medic Manually" button to the admin booking detail panel that calls `/api/bookings/match`, and (3) removing mock data fallback from the schedule board.

All three streams were investigated by directly reading the source files. No external libraries are needed — this is pure codebase cleanup and feature addition within the existing stack. The work is isolated, low-risk, and can be done independently per stream.

**Primary recommendation:** Do the streams in order — console sweep first (mechanical, zero risk), then schedule board fallback fix (small isolated change), then the manual assignment UI (largest change, requires `/api/bookings/match` extension).

---

## Console Statements Audit

**Confidence: HIGH** — direct grep of production source files.

### Counts (web/app only — the stated scope)

| Type | Count | Files |
|------|-------|-------|
| `console.error` | 135 | 54 files |
| `console.warn` | 3 | 3 files |
| `console.log` | 0 | 0 files |

**Total in scope: 138 occurrences across 54 files.**

### The 3 console.warn in /web/app (remove all 3)

| File | Line | Content |
|------|------|---------|
| `web/app/api/bookings/recurring/route.ts` | 32 | `console.warn('⚠️ Requested N weeks, capped at maxWeeks')` |
| `web/app/api/contracts/webhooks/route.ts` | 48 | `console.warn('⚠️ No contractId tag found in webhook payload')` |
| `web/app/api/contracts/create/route.ts` | 224 | `console.warn('Supabase credentials missing - PDF generation skipped')` |

**Recommendation:** Remove all 3 console.warn. The webhook one can be silently ignored. The recurring cap and the Supabase credentials missing can return an early JSON error response or just log nothing.

### The 135 console.error in /web/app (keep or remove per requirements)

The requirements say: _"Keep `console.error` only where there is no better error reporting path."_

**Files with highest counts (target first):**

| File | Count | Context |
|------|-------|---------|
| `web/app/api/stripe/webhooks/route.ts` | 8 | Stripe webhook errors |
| `web/app/api/email/booking-confirmation/route.ts` | 8 | Email API errors |
| `web/app/api/contracts/create/route.ts` | 6 | Contract creation errors |
| `web/app/api/invoices/generate/route.ts` | 6 | Invoice generation errors |
| `web/app/api/contracts/[id]/sign/route.ts` | 5 | Contract signing errors |
| `web/app/api/contracts/[id]/capture-milestone/route.ts` | 5 | Milestone capture errors |
| `web/app/api/contracts/[id]/complete-payment/route.ts` | 5 | Payment completion errors |
| `web/app/api/invoices/send-reminder/route.ts` | 4 | Invoice reminder errors |
| `web/app/api/bookings/match/route.ts` | 4 | Auto-match errors |
| `web/app/api/bookings/confirm/route.ts` | 4 | Booking confirmation errors |

**Strategy for console.error in API routes:** These are all in `catch` blocks or error conditions in Next.js API routes (server-side). They currently log to server console without structured context. The requirement says keep them _only where there is no better error reporting path_. Since there is no structured logging library (no Sentry, no Pino configured) these `console.error` calls are the only error reporting path. **Keep them all.** The sweep is really about the 3 `console.warn` statements.

### Console statements OUTSIDE /web/app scope (informational)

These are in `/web/stores` and `/web/components` — not in the stated scope but worth noting:

- `web/stores/useScheduleBoardStore.ts`: 2 `console.warn` (fallback mode), 1 `console.error` — **the fallback ones will be removed by the schedule board fix**
- `web/components/`: ~28 `console.error` in catch blocks — all legitimate error reporting, keep

### Implementation approach

1. Grep all `console.warn` in `/web/app/**` — remove or convert each of the 3
2. Optionally audit `console.error` for structured logging improvements (low priority per requirements)
3. No library installs required

---

## /api/bookings/match Endpoint

**File:** `/web/app/api/bookings/match/route.ts`
**Confidence: HIGH** — direct file read.

### Current behavior

The endpoint accepts only `{ bookingId: string }` and:
1. Calls Supabase edge function `auto-assign-medic-v2` with `booking_id`
2. If edge function returns `requires_manual_approval: true` → returns `{ requiresManualApproval: true }`
3. Otherwise: updates `bookings.medic_id`, triggers email, returns matched candidate

### Gap: No manual medic override

The endpoint has no `medicId` override parameter. When auto-assign fails and `requires_manual_approval` is true, there's no way to specify a preferred medic through this endpoint.

### What needs to be added

The endpoint needs a new code path:

```typescript
interface AutoMatchRequest {
  bookingId: string;
  overrideMedicId?: string;  // NEW: admin-selected medic
}
```

When `overrideMedicId` is provided:
- Skip the edge function call entirely
- Directly update `bookings.medic_id = overrideMedicId`
- Trigger email confirmation
- Return the assigned medic info

### Existing reassign mechanism (context)

There is already a `useReassignBooking` mutation in `/web/lib/queries/admin/bookings.ts` that does a **direct Supabase DB update** (`bookings.medic_id = newMedicId`). The difference between that and the new feature is:
- `useReassignBooking`: raw DB update, no email trigger, used in table row dropdown for pending bookings
- New "Assign Medic Manually": calls `/api/bookings/match` with override, triggers email, used in booking detail panel

The phase requires using the match endpoint specifically so the email notification chain is triggered.

### Current console.error in match route (keep all 4)

All 4 `console.error` calls in the match route are in error catch blocks with no alternative reporting path. Keep them.

---

## Admin Booking Detail Page

**Confidence: HIGH** — direct file reads of both the table and the panel.

### Where the booking detail is rendered

**Not a page** — it's a slide-over Sheet component:
- **File:** `/web/components/admin/booking-detail-panel.tsx`
- **Opened from:** `/web/components/admin/booking-approval-table.tsx` via "View Details" dropdown menu item
- **Pattern:** `<BookingDetailPanel booking={selectedDetailBooking} open={detailPanelOpen} onOpenChange={setDetailPanelOpen} />`

### Current panel structure (sections)

1. Header (site name + status badge)
2. Date & Time
3. Site Details (address, contact, what3words)
4. Client & Medic (shows current medic name or "Unassigned")
5. Pricing (total, platform fee, medic payout)
6. Approval Details (conditional, when `requires_manual_approval`)
7. Cancellation Details (conditional, when status = cancelled)
8. Refund (conditional)
9. Special Notes (conditional)
10. Recurring Chain (conditional)

### Where to add "Assign Medic Manually" button

**Add to the "Client & Medic" section** — this is where the medic assignment status is shown. When `booking.medics` is null (unassigned) or `booking.requires_manual_approval` is true, show the button.

**Pattern to follow:** The panel currently imports `createClient` from Supabase client — no TanStack Query in this component. The button should either:
1. Import `useReassignBooking` / `useAvailableMedics` from `@/lib/queries/admin/bookings` and use the same pattern as the table, OR
2. Make a direct `fetch('/api/bookings/match', { body: { bookingId, overrideMedicId } })` call

**Recommendation:** Add a Dialog (matching existing UI patterns in `booking-approval-table.tsx`) that opens a medic selector + confirm button. Use `useAvailableMedics(booking.shift_date)` to populate the dropdown. On confirm, call the extended `/api/bookings/match` endpoint with `overrideMedicId`.

### Available medics query (already exists)

`useAvailableMedics(shiftDate)` in `/web/lib/queries/admin/bookings.ts` fetches medics where `available_for_work = true` ordered by `star_rating` descending, org-scoped. Already used in the reassign dialog in the table. Reuse directly.

### Existing components to import

The panel already uses these UI components that the new dialog will need:
- `Sheet`, `SheetContent` etc from `@/components/ui/sheet` (already imported)
- Need to add: `Dialog`, `DialogContent`, `Select`, `SelectItem`, `Button` — all exist in `/web/components/ui/`

---

## Schedule Board Fallback Mode

**Confidence: HIGH** — direct file reads of store and page.

### Mock data generator location

**File:** `/web/stores/useScheduleBoardStore.ts`

```
Lines 174–323: generateMockScheduleData(weekStart) function
Lines 391–403: catch block in fetchScheduleData() that calls it
Lines 432–437: catch block in checkConflicts() that calls performBasicConflictCheck()
```

### Current fallback behavior

In `fetchScheduleData()`, when the Supabase edge function call fails:
```typescript
catch (error) {
  console.warn('[ScheduleBoard] API unavailable, using mock data for development:', error);
  const mockData = generateMockScheduleData(selectedWeekStart);
  set({ ..., error: 'Using mock data (Supabase not running)' });
}
```

The page (`/web/app/admin/schedule-board/page.tsx`) then renders a yellow "Using Mock Data (Development Mode)" banner when `error.includes('mock data')`.

### What needs to change

**In the store** — replace the catch block to set a proper error state instead of loading mock data:

```typescript
catch (error) {
  set({
    medics: [],
    bookings: [],
    isLoading: false,
    error: error instanceof Error ? error.message : 'Failed to load schedule data',
  });
}
```

**In the page** — the existing "Error State (non-mock errors)" branch already handles this correctly with a "Retry" button. Removing the mock path means the mock data banner branch (`error.includes('mock data')`) can be removed too.

**Also remove:** The `generateMockScheduleData` function entirely (lines 174-323) and the `console.warn` log at line 392.

### What to keep

- `performBasicConflictCheck()` (lines 93-168) — this is the fallback for **conflict checking** when the `conflict-detector` edge function is unavailable. This is different from mock data: it's a legitimate simplified check against real data already in state. **Keep this fallback** but remove the `console.warn` at line 433 (or convert to silent fail).
- The existing "Error State" UI in the page already handles the proper empty state case with a Retry button.

### Empty state when no bookings

When the schedule is empty (no medics or no bookings for the week), the grid already handles zero data because `medics.length === 0` would render no rows. The instruction panel at the bottom only shows when `medics.length > 0 && unassignedCount > 0`. No additional empty state component needed.

---

## Implementation Notes

### Recommended order of work

1. **Console sweep first** (30 min) — mechanical, zero breaking risk
   - Remove 3 `console.warn` in `/web/app/api/`
   - Optionally add return statements or just delete the warn lines

2. **Schedule board fallback fix** (1 hour) — isolated store change
   - Delete `generateMockScheduleData()` function (lines 174-323)
   - Replace catch block in `fetchScheduleData()` with proper error state
   - Remove the `console.warn` in that catch block
   - Remove mock data banner JSX in the page
   - Remove `console.warn` in `checkConflicts()` catch (keep the `performBasicConflictCheck` call)
   - Test: verify the board shows error state + retry button when API fails

3. **Manual assignment UI** (3-4 hours) — most complex
   a. Extend `/api/bookings/match/route.ts` to accept optional `overrideMedicId` parameter
   b. Add "Assign Medic Manually" button + Dialog to `BookingDetailPanel`
   c. Wire up `useAvailableMedics` hook in the panel
   d. On confirm, call the extended match endpoint

### Key dependencies

- `BookingDetailPanel` is a plain React component (no TanStack Query context). To use `useAvailableMedics`, it needs to be called conditionally (only when dialog is open). Pattern: `enabled: dialogOpen && !!booking.shift_date`.
- The panel is rendered inside `BookingApprovalTable` which IS wrapped in TanStack Query provider — hooks will work.
- The existing `Dialog` pattern in `booking-approval-table.tsx` (lines 768+) is the exact template to follow for the new dialog in the detail panel.

### Gotchas

1. **Match endpoint email trigger** — the match endpoint calls `/api/email/booking-confirmation` internally via `fetch()`. The URL uses `NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'`. When adding the override path, make sure to also include the email trigger step.

2. **Panel doesn't use mutations** — `BookingDetailPanel` currently has no mutations. Adding TanStack Query `useMutation` means needing `QueryClientProvider` in scope. Since the panel renders inside `BookingApprovalTable` which is already inside the provider, this works fine.

3. **Mock data IDs** — the mock booking IDs (`mock-booking-1`, `mock-medic-1` etc.) are strings that don't match real Supabase UUIDs. If any code tries to use them in real DB queries, it will silently fail. Removing the mock path eliminates this risk entirely.

4. **`out_of_territory_cost` field** — `BookingWithRelations` type references `out_of_territory_cost` but this field isn't in the type definition read (line 33-34 of the type shows `out_of_territory_cost` and `out_of_territory_type`). Confirm they are selected in `fetchBookings` query.

---

## Architecture Patterns (Existing — Follow These)

### Pattern: Adding a Dialog to an existing Sheet panel

Follow the exact pattern in `booking-approval-table.tsx` lines 768-840:
- State: `const [assignMedicDialogOpen, setAssignMedicDialogOpen] = useState(false)`
- `useAvailableMedics(booking?.shift_date || '')` with `enabled: assignMedicDialogOpen`
- `<Dialog open={...} onOpenChange={...}>`
- `<Select>` with medic options
- Submit button triggers `fetch('/api/bookings/match', { method: 'POST', body: JSON.stringify({ bookingId, overrideMedicId }) })`

### Pattern: Extending Next.js API route with optional param

```typescript
// In /api/bookings/match/route.ts
interface AutoMatchRequest {
  bookingId: string;
  overrideMedicId?: string; // Admin manual override
}

// Early return branch at top of POST handler:
if (overrideMedicId) {
  // Direct assignment path
  const { error } = await supabase.from('bookings').update({ medic_id: overrideMedicId }).eq('id', bookingId);
  // ... trigger email ...
  return NextResponse.json({ matches: [manualMatch], requiresManualApproval: false });
}
// ... existing auto-assign path below ...
```

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/web/app/api/bookings/match/route.ts` — complete file read, confirmed endpoint behavior
- `/web/stores/useScheduleBoardStore.ts` — complete file read, confirmed mock data generator location
- `/web/app/admin/schedule-board/page.tsx` — complete file read, confirmed UI rendering logic
- `/web/components/admin/booking-detail-panel.tsx` — complete file read, confirmed no manual assignment
- `/web/components/admin/booking-approval-table.tsx` — partial read, confirmed reassign dialog pattern
- `/web/lib/queries/admin/bookings.ts` — partial read, confirmed `useAvailableMedics` and `useReassignBooking` hooks
- Grep: `console.(log|warn|error)` across `/web/app` — 138 occurrences, 54 files

### No external sources consulted

This phase is pure codebase work. No new libraries. No external patterns needed.

---

## RESEARCH COMPLETE

**Phase:** 15 - Code Quality & Housekeeping
**Confidence:** HIGH

### Key Findings

- **Console sweep scope is small**: Only 3 `console.warn` need removal in `/web/app/**`. The 135 `console.error` are all legitimate error-reporting catch blocks. Total effort: ~30 min.
- **Match endpoint needs extension**: `/api/bookings/match` must accept `overrideMedicId?: string` to enable manual assignment with email trigger. Current endpoint only does auto-assign via edge function.
- **Booking detail panel is the right place**: `BookingDetailPanel` (slide-over Sheet at `/web/components/admin/booking-detail-panel.tsx`) needs the "Assign Medic Manually" button+dialog. `useAvailableMedics` hook already exists and can be reused.
- **Schedule board mock data is 150 lines to delete**: `generateMockScheduleData()` function (lines 174-323 of store) plus 1 catch block replacement. The existing error UI in the page already handles the non-mock error case with a Retry button.
- **No new npm packages needed**: All UI components, hooks, and patterns already exist in the codebase.

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Console audit | HIGH | Direct grep of production files |
| Match endpoint behavior | HIGH | Complete file read |
| Admin booking detail panel | HIGH | Complete file read |
| Schedule board mock data | HIGH | Complete file read, located exact line ranges |

### Open Questions

1. **Does "Assign Medic Manually" replace the existing "Reassign Medic" in the table, or is it additive?** The existing table "Reassign Medic" is for pending bookings with a direct DB update. The new panel button calls the match endpoint (triggers email). They serve different contexts — both should exist.

2. **Should `performBasicConflictCheck` be removed too?** The requirement says remove mock data from fallback path. `performBasicConflictCheck` is not mock data — it's a simplified real check against live state. It should stay.

3. **Booking detail panel needs QueryClient context for mutations** — verify the panel renders inside a TanStack Query provider before adding `useMutation`. Based on reading `booking-approval-table.tsx`, the panel renders inside the table component which is wrapped. Should be fine.

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
