# Phase 09: Booking Data Completeness - Research

**Researched:** 2026-02-17
**Domain:** React/Next.js UI data surfacing — mapping stored DB fields to components
**Confidence:** HIGH

---

## Summary

Phase 09 is a UI data-surfacing phase, not a new-feature phase. All required fields (`special_notes`, `site_contact_name`, `site_contact_phone`, `what3words_address`, `approval_reason`, `cancellation_reason`, `cancelled_by`, `refund_amount`, `recurrence_pattern`) are already stored in the database and already fetched by the existing queries. The gap is purely in the UI layer: these fields are never passed through component prop interfaces or rendered.

The work splits into four areas: (1) extending the `BookingConfirmation` component props and the confirmation page data mapping to surface client-facing fields; (2) building an admin booking detail panel (currently the "View Details" menu item is a no-op) that surfaces operational fields; (3) adding a recurring booking chain view that queries all instances by `parent_booking_id`; and (4) creating a `What3WordsDisplay` component that formats the address with a copy button and link to what3words.com.

The codebase has strong existing patterns to follow: utility functions in `web/lib/utils/what3words.ts`, the `@what3words/api` v5.4.0 and `@what3words/react-components` v5.0.5 packages already installed, the `BookingWithRelations` type for admin queries, and the `RecurringSummary` component that can be extended for the chain view. No new packages are required.

**Primary recommendation:** Treat each task as a targeted prop-interface extension + render addition. Do not rebuild existing components from scratch. Add `what3words_address` to `BookingWithRelations` type and the `/api/bookings/[id]` response, then extend component interfaces downstream.

---

## Standard Stack

The established libraries already in use in this codebase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.1.5 | App router, API routes | Already in use |
| React | ^19.0.0 | UI components | Already in use |
| TanStack Query | ^5.90.21 | Data fetching, caching, 60s polling | Already in use for admin bookings |
| TanStack Table | ^8.21.3 | Admin table columns | Already in use in `booking-approval-table.tsx` |
| @what3words/api | ^5.4.0 | what3words address utilities | Already installed, used in `web/lib/utils/what3words.ts` |
| @what3words/react-components | ^5.0.5 | what3words React components | Already installed |
| Supabase | (via @supabase/ssr) | Database queries | Already in use |
| lucide-react | ^0.564.0 | Icons (Copy, ExternalLink, etc.) | Already in use |
| shadcn/ui (Radix) | latest | Card, Badge, Dialog, Button | Already in use throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | (via next) | Date arithmetic for recurring chains | Already used in recurring API route |
| navigator.clipboard API | browser built-in | Copy to clipboard functionality | Use for what3words copy button |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom copy button | Clipboard.js | navigator.clipboard is sufficient for this use case — no extra package needed |
| @what3words/react-components display | Custom div | The project already uses the custom What3WordsInput; a simple display component is cleaner for read-only contexts |

**No new packages required for this phase.**

---

## Architecture Patterns

### Project Structure for This Phase

```
web/
├── app/
│   ├── (booking)/book/confirmation/page.tsx     # MODIFY: pass specialNotes, what3words
│   └── admin/bookings/
│       └── page.tsx                             # MODIFY: wire detail panel
├── components/
│   ├── booking/
│   │   ├── booking-confirmation.tsx             # MODIFY: extend props + render
│   │   ├── recurring-summary.tsx                # MODIFY: extend for chain view
│   │   └── what3words-display.tsx               # NEW: read-only display component
│   └── admin/
│       ├── booking-approval-table.tsx           # MODIFY: wire "View Details" action
│       └── booking-detail-panel.tsx             # NEW: admin detail slide-over/dialog
└── lib/
    ├── queries/admin/bookings.ts                # MODIFY: add what3words_address to type
    └── utils/what3words.ts                      # NO CHANGE: utility already complete
```

### Pattern 1: Prop Interface Extension (Downstream from API)

**What:** Add missing fields to TypeScript interfaces; the component renders them conditionally.
**When to use:** Fields already fetched at API level but not in component props.

**Example — extending BookingConfirmation props:**
```typescript
// Source: existing pattern in web/components/booking/booking-confirmation.tsx
interface BookingConfirmationProps {
  booking: {
    // ... existing fields
    specialNotes?: string | null;           // ADD
    what3wordsAddress?: string | null;      // ADD
    recurrencePattern?: 'weekly' | 'biweekly' | null;  // ADD
    recurringWeeks?: number;                // ADD
  };
  // ... rest unchanged
}
```

**Render with conditional guard:**
```typescript
// Pattern: only render if field has a value
{booking.specialNotes && (
  <div className="flex items-start gap-3">
    <FileText className="h-5 w-5 text-slate-500 mt-0.5" />
    <div>
      <p className="font-medium text-slate-900">Special Notes</p>
      <p className="text-slate-600">{booking.specialNotes}</p>
    </div>
  </div>
)}
```

### Pattern 2: API Response Extension

**What:** Add missing fields to the JSON response object in the API route.
**When to use:** Fields are in the DB but excluded from the response shape.

**The gap found:** `/api/bookings/[id]/route.ts` does NOT include `what3words_address` in its response (lines 66–101). It must be added.

```typescript
// Source: web/app/api/bookings/[id]/route.ts — current response object
// ADD to the booking response shape:
what3words_address: booking.what3words_address,
```

### Pattern 3: Confirmation Page Data Mapping

**What:** The confirmation page (`page.tsx`) builds `fetchedBooking` from API response and passes it to `BookingConfirmation`. Add new fields to the mapped object.

**The gap found:** The `fetchedBooking` object on lines 88–121 of `confirmation/page.tsx` does not map `specialNotes` or `what3words_address` from `bookingDetail.booking`.

```typescript
// Source: web/app/(booking)/book/confirmation/page.tsx lines 88-132
const fetchedBooking = {
  // ... existing fields
  specialNotes: bookingDetail.booking.special_notes || null,        // ADD
  what3wordsAddress: bookingDetail.booking.what3words_address || null, // ADD
};
```

### Pattern 4: Admin Detail Panel (New Component)

**What:** The admin `BookingApprovalTable` has a "View Details" `DropdownMenuItem` that does nothing. Wire it to open a `Dialog` or slide-over showing full booking detail.

**When to use:** Admin needs to see `approval_reason`, `cancellation_reason`, `cancelled_by`, `site_contact_name`, `site_contact_phone`, `refund_amount`.

**Pattern:** Use shadcn `Dialog` (already used in `booking-approval-table.tsx` for Reassign). Store `selectedDetailBooking` in state, pass the `BookingWithRelations` object to the dialog.

```typescript
// Pattern from existing reassign dialog in booking-approval-table.tsx
const [detailDialogOpen, setDetailDialogOpen] = useState(false);
const [selectedDetailBooking, setSelectedDetailBooking] = useState<BookingWithRelations | null>(null);

// In "View Details" DropdownMenuItem:
onClick={() => {
  setSelectedDetailBooking(booking);
  setDetailDialogOpen(true);
}}
```

**IMPORTANT:** `BookingWithRelations` already fetches `approval_reason`, `cancellation_reason`, `cancelled_by`, `refund_amount` — these are already in the type. The query uses `select('*')` which retrieves all columns. No query changes needed for admin detail. Only `what3words_address` is missing from the type.

### Pattern 5: Recurring Chain Query

**What:** Query all bookings that share the same recurrence group — either the parent itself or children pointing to it.

**Data model:** Child bookings have `parent_booking_id = <parent-id>`. Parent has `parent_booking_id = null` but `is_recurring = true` and `id = <parent-id>`.

**Query pattern:**
```typescript
// Fetch all instances: parent + all children
const { data: chain } = await supabase
  .from('bookings')
  .select('id, shift_date, shift_start_time, shift_end_time, status')
  .or(`id.eq.${parentId},parent_booking_id.eq.${parentId}`)
  .order('shift_date', { ascending: true });
```

**Alternative:** If the booking being viewed IS a child, first resolve its parent:
```typescript
// If booking.parent_booking_id exists, use that as the parent; otherwise use booking.id
const rootId = booking.parent_booking_id ?? booking.id;
```

### Pattern 6: What3Words Display Component (Read-Only)

**What:** A pure display component (not input) that shows the what3words address formatted as `///word.word.word` with a copy button and external link.

**Use existing utilities:** `formatWhat3Words()` and `getWhat3WordsMapLink()` from `web/lib/utils/what3words.ts`.

```typescript
// Source: web/lib/utils/what3words.ts
import { formatWhat3Words, getWhat3WordsMapLink } from '@/lib/utils/what3words';

// Copy button uses navigator.clipboard
const handleCopy = () => {
  navigator.clipboard.writeText(formatWhat3Words(words));
};

// Link pattern (already used in email template)
const mapLink = getWhat3WordsMapLink(words);
// => "https://what3words.com/filled.count.soap"
```

**Lucide icons to use:** `Copy` (copy to clipboard), `ExternalLink` (link to what3words.com)

### Anti-Patterns to Avoid

- **Fetching booking data again in the detail panel:** The `BookingWithRelations` object is already in the TanStack Query cache from the main table query. Pass the row object to the dialog rather than making a new fetch.
- **Rebuilding RecurringSummary from scratch:** The existing component at `web/components/booking/recurring-summary.tsx` already renders a table of bookings with date/status. Extend it to accept the full chain rather than just child bookings.
- **Adding what3words_address to the DB query select:** The admin query already uses `select('*')` which returns all columns including `what3words_address`. Only the TypeScript type needs updating.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| what3words URL generation | Custom URL builder | `getWhat3WordsMapLink()` in `web/lib/utils/what3words.ts` | Already implemented, handles leading-slash stripping |
| what3words address formatting (`///word`) | Custom formatter | `formatWhat3Words()` in `web/lib/utils/what3words.ts` | Already implemented |
| Copy to clipboard | Custom clipboard library | `navigator.clipboard.writeText()` browser API | No package needed |
| Admin dialog/modal | Custom overlay | shadcn `Dialog` component | Already used in this exact component |
| Date formatting (UK) | Custom date logic | `.toLocaleDateString('en-GB', {...})` | Consistent with existing pattern (D-04-03-001) |
| Recurring chain fetch | Custom REST endpoint | Direct Supabase `.or()` query | No API route needed; can query client-side |

**Key insight:** This phase is about connecting existing data to existing UI patterns. Almost nothing needs to be built from scratch.

---

## Common Pitfalls

### Pitfall 1: what3words_address Missing from BookingWithRelations Type

**What goes wrong:** TypeScript type for admin bookings does not include `what3words_address`. Adding a display column in the admin detail that accesses `booking.what3words_address` will cause a TypeScript error.
**Why it happens:** The field was added to the DB schema (migration 025) after the type was written.
**How to avoid:** Add `what3words_address: string | null;` to the `BookingWithRelations` interface in `web/lib/queries/admin/bookings.ts` BEFORE writing the detail panel component.
**Warning signs:** TypeScript error `Property 'what3words_address' does not exist on type 'BookingWithRelations'`.

### Pitfall 2: what3words_address Missing from /api/bookings/[id] Response

**What goes wrong:** The confirmation page fetches booking detail from `/api/bookings/[id]`, but the response does not include `what3words_address` (verified by reading the route — it's not in the returned object). Accessing `bookingDetail.booking.what3words_address` returns `undefined`.
**Why it happens:** The API route was written before migration 025 added the column, and it was never updated.
**How to avoid:** Add `what3words_address: booking.what3words_address` to the response object in `/api/bookings/[id]/route.ts` as part of task 09-04 or 09-01.
**Warning signs:** `what3words_address` renders as undefined/blank on confirmation page even when it was entered.

### Pitfall 3: Confirmation Page fetchedBooking Does Not Map New Fields

**What goes wrong:** Even if the API returns `what3words_address`, the `fetchedBooking` object in `confirmation/page.tsx` only maps specific fields. Unmapped fields are silently dropped.
**Why it happens:** The mapping is explicit (not a spread), so new API fields must be explicitly added.
**How to avoid:** After extending the API response, also add `specialNotes` and `what3wordsAddress` to the `fetchedBooking` object in `confirmation/page.tsx`.

### Pitfall 4: Recurring Chain View Shows Duplicate Parent

**What goes wrong:** When querying `id.eq.${parentId},parent_booking_id.eq.${parentId}`, the parent booking appears in the results. If the confirmation page already received child bookings from the `/api/bookings/recurring` POST, concatenating the chain may duplicate entries.
**Why it happens:** The recurring API creates children and returns them; the chain query also fetches the parent.
**How to avoid:** On the confirmation page, the existing `recurringBookings` state from the POST response already contains all children. For the chain view, use this existing data (add the parent as the first row). For the admin detail panel, use the DB query pattern.

### Pitfall 5: "View Details" DropdownMenuItem Has No onClick

**What goes wrong:** The "View Details" item in the admin table exists in the DOM but does nothing (no `onClick`, no href). It silently does nothing when clicked.
**Why it happens:** It was a placeholder from Phase 4.5.
**How to avoid:** When adding the detail panel, ensure the `DropdownMenuItem` has an `onClick` handler that sets `selectedDetailBooking` and opens `detailDialogOpen`.
**Warning signs:** Clicking "View Details" closes the dropdown but nothing happens.

### Pitfall 6: Hydration Mismatch with Date Formatting

**What goes wrong:** Date formatted with `new Date().toLocaleDateString()` in a server-rendered component causes hydration mismatch between server and client.
**Why it happens:** Known Next.js 15 issue (Decision D-04-03-001).
**How to avoid:** Use `suppressHydrationWarning` on date-rendering elements, or ensure all new date rendering follows the existing pattern (client-side only, `'use client'` components). All components in scope are already `'use client'`.

### Pitfall 7: refund_amount Displays Zero When Not Applicable

**What goes wrong:** `refund_amount` defaults to `0` in the DB (type `number` not nullable). Showing `£0.00` when there is no refund is confusing to admins.
**Why it happens:** Schema stores 0 as the default rather than null.
**How to avoid:** Conditionally render refund amount: `{booking.refund_amount > 0 && <RefundRow amount={booking.refund_amount} />}`.

---

## Code Examples

Verified patterns from the existing codebase:

### what3words Display (Read-Only)

```typescript
// Pattern: web/components/booking/what3words-display.tsx (NEW)
// Utilities already exist in web/lib/utils/what3words.ts

import { formatWhat3Words, getWhat3WordsMapLink } from '@/lib/utils/what3words';
import { Copy, ExternalLink } from 'lucide-react';

interface What3WordsDisplayProps {
  address: string; // e.g. "filled.count.soap" or "///filled.count.soap"
}

export function What3WordsDisplay({ address }: What3WordsDisplayProps) {
  const formatted = formatWhat3Words(address); // => "///filled.count.soap"
  const mapLink = getWhat3WordsMapLink(address); // => "https://what3words.com/filled.count.soap"

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-semibold text-blue-600">{formatted}</span>
      <button onClick={handleCopy} aria-label="Copy what3words address">
        <Copy className="h-4 w-4 text-slate-500 hover:text-slate-700" />
      </button>
      <a
        href={mapLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on what3words map"
      >
        <ExternalLink className="h-4 w-4 text-slate-500 hover:text-slate-700" />
      </a>
    </div>
  );
}
```

### Recurring Chain Query

```typescript
// Pattern for fetching all instances in a recurrence group
// Used in admin detail panel (client-side, using Supabase client)

const rootId = booking.parent_booking_id ?? booking.id;

const { data: chain } = await supabase
  .from('bookings')
  .select('id, shift_date, shift_start_time, shift_end_time, status, recurrence_pattern')
  .or(`id.eq.${rootId},parent_booking_id.eq.${rootId}`)
  .order('shift_date', { ascending: true });
```

### Conditional Render of Admin-Only Fields

```typescript
// Pattern: only show fields when they have meaningful values
// Used throughout existing components

{booking.approval_reason && (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Approval Reason</p>
    <p className="text-sm text-blue-900 mt-1">{booking.approval_reason}</p>
  </div>
)}

{booking.cancellation_reason && (
  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Cancellation Reason</p>
    <p className="text-sm text-red-900 mt-1">{booking.cancellation_reason}</p>
    {booking.cancelled_by && (
      <p className="text-xs text-red-600 mt-1">Cancelled by: {booking.cancelled_by}</p>
    )}
  </div>
)}

{booking.refund_amount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-slate-600">Refund Amount</span>
    <span className="font-medium text-green-700">£{booking.refund_amount.toFixed(2)}</span>
  </div>
)}
```

### Existing what3words URL Pattern (from email template)

```typescript
// Source: web/lib/email/templates/booking-confirmation-email.tsx line 76
// Already established pattern for what3words link
href={`https://what3words.com/${booking.what3wordsAddress.replace(/^\/+/, '')}`}

// The utility getWhat3WordsMapLink() does this replacement already:
// Source: web/lib/utils/what3words.ts line 157-160
export function getWhat3WordsMapLink(words: string): string {
  const cleanWords = words.replace(/^\/+/, '');
  return `https://what3words.com/${cleanWords}`;
}
```

### Adding Field to BookingWithRelations Type

```typescript
// Source: web/lib/queries/admin/bookings.ts
// ADD this field to the BookingWithRelations interface:
export interface BookingWithRelations {
  // ... existing fields (lines 17-67)
  what3words_address: string | null;  // ADD after site_postcode (line 27)
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers` | `@supabase/ssr` | Phase 4 (D-04-01-001) | Must use `createClient` from `@/lib/supabase/client` and `@/lib/supabase/server` |
| `recurringWeeks` stored in DB | Calculate from `recurring_until` date | Phase 4.5 (D-04.5-05-002) | For display, calculate weeks from `recurring_until - shift_date`; already implemented in `confirmation/page.tsx` lines 124–129 |
| UK date formatting | `toLocaleDateString('en-GB', {...})` | Phase 4 (D-04-03-001) | Use UK format consistently, `suppressHydrationWarning` for server/client mismatch |

**Deprecated/outdated:**
- `pending_payment` status on child bookings: The recurring route creates children with `childStatus = 'pending_payment'` but the `BookingWithRelations` status type only includes `'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'`. This is a pre-existing inconsistency in the codebase; do not change it in Phase 09.

---

## Open Questions

1. **Admin Detail Panel — Dialog vs Slide-Over**
   - What we know: shadcn `Dialog` is already used in `booking-approval-table.tsx` (Reassign dialog, Reject dialog). The booking detail would contain more content.
   - What's unclear: Whether a `Dialog` (modal overlay) or a `Sheet` (slide-over panel from the right) is preferred for admin detail. A `Sheet` is more appropriate for dense detail panels.
   - Recommendation: Use shadcn `Sheet` from `@radix-ui/react-dialog` (it's in the same package, just a different composition). If `Sheet` is not already in `web/components/ui/`, create it following shadcn conventions. Alternatively, use the existing `Dialog` with `max-w-2xl` if `Sheet` is not available.

2. **Recurring Chain in Confirmation vs Admin — Same Component?**
   - What we know: `RecurringSummary` is used on the confirmation page and shows child bookings. The admin chain view needs the same data but in a different styling context (dark theme).
   - What's unclear: Whether to extend `RecurringSummary` to accept a `theme` prop or create a separate `RecurringChainView` admin component.
   - Recommendation: Extend `RecurringSummary` with an optional `variant` prop (`'client' | 'admin'`) to switch between light and dark styling. This avoids duplication.

3. **cancelled_by Field Format**
   - What we know: `cancelled_by` is type `string | null` in `BookingWithRelations`. The schema suggests it may be a user ID, a user name, or a free-text string.
   - What's unclear: Is `cancelled_by` stored as a UUID (user ID requiring a join) or a human-readable string?
   - Recommendation: Render it as-is (plain text display). If it resolves to be a UUID, the planner should add a step to resolve the name. Investigate actual data before assuming.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified by reading actual file contents
  - `web/lib/queries/admin/bookings.ts` — `BookingWithRelations` type and `useBookings` hook
  - `web/app/api/bookings/[id]/route.ts` — confirmed `what3words_address` missing from response
  - `web/components/booking/booking-confirmation.tsx` — confirmed `specialNotes`/`what3words_address` missing from props
  - `web/app/(booking)/book/confirmation/page.tsx` — confirmed `fetchedBooking` does not map `special_notes` or `what3words_address`
  - `web/components/admin/booking-approval-table.tsx` — confirmed "View Details" has no `onClick`
  - `web/lib/utils/what3words.ts` — `formatWhat3Words()` and `getWhat3WordsMapLink()` verified
  - `web/components/booking/recurring-summary.tsx` — existing recurring display component verified
  - `supabase/migrations/025_what3words_support.sql` — DB column existence confirmed
  - `web/package.json` — package versions confirmed

### Secondary (MEDIUM confidence)
- Prior phase decisions referenced from CONTEXT.md:
  - D-04-01-001: `@supabase/ssr` usage
  - D-04-03-001: Client-side date formatting with `suppressHydrationWarning`
  - D-04.5-05-002: Calculate recurring weeks from `recurring_until` date field

### Tertiary (LOW confidence)
- `@what3words/react-components` v5.0.5 API surface — package is installed but not heavily used in the codebase (only `@what3words/api` utilities are used directly). The custom `What3WordsInput` component was built using the API package. For a display component, using the existing utility functions is sufficient and avoids reliance on the react-components package's potentially unstable API.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct package.json and source file inspection
- Architecture: HIGH — all gaps identified by reading actual component interfaces and API responses
- Pitfalls: HIGH — all identified by direct code inspection, not speculation

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase, 30-day validity)
