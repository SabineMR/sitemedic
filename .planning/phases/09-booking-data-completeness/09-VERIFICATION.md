---
phase: 09-booking-data-completeness
verified: 2026-02-17T18:00:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 09: Booking Data Completeness — Verification Report

**Phase Goal:** Surface all booking data that is collected but never displayed — ensuring admins, clients, and medics see the full picture.
**Verified:** 2026-02-17T18:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Client sees their special notes and what3words address on booking confirmation | VERIFIED | `booking-confirmation.tsx` conditionally renders `booking.specialNotes` (line 114) and `booking.what3wordsAddress` via `What3WordsDisplay` (line 103–111); confirmation page maps `special_notes` → `specialNotes` and `what3words_address` → `what3wordsAddress` at lines 121–122 |
| 2 | Admin sees why a booking needed approval and who cancelled it (if applicable) | VERIFIED | `booking-detail-panel.tsx` renders `booking.approval_reason` inside `{booking.requires_manual_approval && ...}` (lines 304–342) and `booking.cancelled_by` + `booking.cancellation_reason` inside `{booking.status === 'cancelled' && ...}` (lines 344–383) |
| 3 | Recurring booking chain shows all N instances with per-instance status | VERIFIED | `booking-detail-panel.tsx` useEffect (lines 95–123) fetches the entire chain via `.or('id.eq.${rootId},parent_booking_id.eq.${rootId}')` and renders a full table with per-instance status badges (lines 437–503); current booking highlighted with blue row |
| 4 | Refund amount visible in admin view when applicable | VERIFIED | `booking-detail-panel.tsx` renders `<CurrencyWithTooltip amount={booking.refund_amount} />` inside `{booking.refund_amount > 0 && ...}` guard (lines 386–398); zero-value bookings are correctly hidden |

**Score:** 4/4 truths verified

---

## Required Artifacts

| Artifact | Lines | Status | Details |
|----------|-------|--------|---------|
| `web/components/booking/what3words-display.tsx` | 63 | VERIFIED | Real implementation: `useState` for copy feedback, `navigator.clipboard.writeText`, `formatWhat3Words` + `getWhat3WordsMapLink` from utils, `ExternalLink` to map. Exported named function. |
| `web/app/api/bookings/[id]/route.ts` | 111 | VERIFIED | Full GET handler with Supabase query, org-scoped with `select('*')` + joins. Returns `what3words_address` (line 73) and `special_notes` (line 90) in response JSON. |
| `web/components/booking/booking-confirmation.tsx` | 230 | VERIFIED | Props interface includes `specialNotes?: string \| null` and `what3wordsAddress?: string \| null`. Both rendered conditionally. `What3WordsDisplay` imported and used. |
| `web/app/(booking)/book/confirmation/page.tsx` | 281 | VERIFIED | `fetchedBooking` object sets `specialNotes: bookingDetail.booking.special_notes \|\| null` and `what3wordsAddress: bookingDetail.booking.what3words_address \|\| null` (lines 121–122). Passed to `<BookingConfirmation>`. |
| `web/lib/queries/admin/bookings.ts` | 334 | VERIFIED | `BookingWithRelations` interface includes `what3words_address: string \| null` (line 23), `approval_reason: string \| null`, `cancelled_by: string \| null`, `cancellation_reason: string \| null`, `refund_amount: number`. Query uses `select('*')` so all fields fetched. |
| `web/components/admin/booking-detail-panel.tsx` | 508 | VERIFIED | Full Sheet slide-over. Renders approval section (conditional on `requires_manual_approval`), cancellation section (conditional on `status === 'cancelled'`), refund section (conditional on `refund_amount > 0`), recurring chain table (conditional on `is_recurring`) with live Supabase fetch. `What3WordsDisplay` imported and used. |
| `web/components/admin/booking-approval-table.tsx` | 953 | VERIFIED | Imports `BookingDetailPanel`. State vars `detailPanelOpen` + `selectedDetailBooking` declared. "View Details" `DropdownMenuItem` has `onClick` setting both state vars. `<BookingDetailPanel>` rendered in JSX (lines 905–909). |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `booking-confirmation.tsx` | `what3words-display.tsx` | Named import + prop | WIRED | `import { What3WordsDisplay }` at line 13; `<What3WordsDisplay address={booking.what3wordsAddress} />` at line 108 |
| `confirmation/page.tsx` | `/api/bookings/[id]` | `fetch()` in useEffect | WIRED | `fetch('/api/bookings/${bookingId}')` at line 82; response mapped to `fetchedBooking` including `specialNotes` and `what3wordsAddress` |
| `confirmation/page.tsx` | `booking-confirmation.tsx` | Component props | WIRED | `<BookingConfirmation booking={bookingData} ...>` at line 227; `bookingData` includes both new fields |
| `booking-approval-table.tsx` | `booking-detail-panel.tsx` | `onClick` state → rendered Sheet | WIRED | `setSelectedDetailBooking(booking)` + `setDetailPanelOpen(true)` in onClick (lines 449–452); `<BookingDetailPanel booking={selectedDetailBooking} open={detailPanelOpen}>` at lines 905–909 |
| `booking-detail-panel.tsx` | Supabase `bookings` table | useEffect + `createClient().from('bookings').select(...).or(...)` | WIRED | Fetches chain on `open && booking.is_recurring`; resolves rootId from `parent_booking_id ?? id`; renders results in table |
| `booking-detail-panel.tsx` | `what3words-display.tsx` | Named import + conditional render | WIRED | `import { What3WordsDisplay }` at line 35; `<What3WordsDisplay address={booking.what3words_address} />` at line 222 |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `booking-detail-panel.tsx:125` | `if (!booking) return null` | Info | Legitimate guard clause — component renders nothing when no booking is selected. Not a stub. |
| `booking-approval-table.tsx:624,809,812,854` | `placeholder="..."` | Info | HTML input placeholder attributes on search/form inputs. Not implementation stubs. |

No blockers or warnings found.

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Client sees special notes on booking confirmation | SATISFIED | Conditional render with `whitespace-pre-wrap` to preserve formatting |
| Client sees what3words address on booking confirmation | SATISFIED | Uses `What3WordsDisplay` with copy + external map link |
| Admin sees approval reason (why booking needed manual approval) | SATISFIED | Shown inside `requires_manual_approval` guard in detail panel |
| Admin sees who cancelled (and cancellation reason) | SATISFIED | `cancelled_by` + `cancellation_reason` + `cancelled_at` shown when status is cancelled |
| Recurring chain shows all N instances with per-instance status | SATISFIED | Live Supabase `.or()` query fetches parent + all children; rendered as table with status badges |
| Refund amount visible when applicable | SATISFIED | Shown when `refund_amount > 0`; hidden for zero-value (no GBP 0.00 noise) |

---

## Human Verification Recommended

These items passed automated checks but benefit from human confirmation:

### 1. What3Words Display — Copy Feedback

**Test:** Open a booking confirmation where `what3words_address` is populated. Click the copy button.
**Expected:** Clipboard receives the `///word.word.word` formatted address, button shows green Check icon and "Copied!" text for 2 seconds, then resets.
**Why human:** `navigator.clipboard` behavior can't be verified statically.

### 2. Recurring Chain — Multi-Instance View

**Test:** Open admin panel for a recurring booking (parent or child). Open "View Details".
**Expected:** Recurring Chain section loads all instances sorted by date; the currently-viewed booking is highlighted in blue with "(viewing)" label; each instance shows correct status badge.
**Why human:** Requires live Supabase data with an actual recurring booking chain.

### 3. Refund Amount — Conditional Display

**Test:** Open admin panel for a cancelled booking that has a refund. Then open one without a refund.
**Expected:** Refund section visible only when `refund_amount > 0`; zero-value bookings show no Refund section.
**Why human:** Requires live data with refund_amount > 0.

---

## Summary

Phase 09 goal is fully achieved. All 4 must-haves are verified:

1. **Client sees special notes and what3words** — `BookingConfirmation` renders both conditionally from API response fields. The confirmation page correctly maps snake_case DB fields to camelCase props. `What3WordsDisplay` component is real (copy-to-clipboard + external map link).

2. **Admin sees approval reason and cancellation actor** — `BookingDetailPanel` surfaces `approval_reason` (when `requires_manual_approval`), `cancellation_reason`, `cancelled_by`, and `cancelled_at` (when status is `cancelled`). The `BookingWithRelations` type includes all required fields.

3. **Recurring chain shows all N instances** — `BookingDetailPanel` fetches the entire chain via a single `.or()` Supabase query resolving the root booking. Results are rendered as a sortable table with per-instance status badges and current-booking highlighting.

4. **Refund amount visible when applicable** — Rendered conditionally (`refund_amount > 0`) using `CurrencyWithTooltip` in the admin detail panel. Zero-value refunds are correctly suppressed.

All key wiring is confirmed: View Details opens the panel with the correct booking; the API returns `what3words_address` and `special_notes`; the confirmation page maps those fields through to the component props.

---

_Verified: 2026-02-17T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
