---
phase: 34
plan: 01
subsystem: Marketplace Quotes
tags: [quotes, pricing, forms, zod-validation, zustand, minimum-rates]

depends_on: [33-03]
provides: [quote-submission-foundation, minimum-rate-enforcement, quote-persistence]
affects: [34-02, 34-03, 35-01]

tech_stack:
  added:
    - Zod validation (quote-schemas.ts)
    - Zustand store (useQuoteFormStore)
  patterns:
    - Multi-section form with draft auto-save (2s debounce)
    - Itemised pricing with custom line items
    - Staffing plan discriminated union (named medics OR headcount+quals)
    - Hard minimum rate enforcement (blocks submission if below guidelines)

key_files:
  created:
    - supabase/migrations/146_marketplace_quotes.sql
    - web/lib/marketplace/quote-types.ts
    - web/lib/marketplace/quote-schemas.ts
    - web/lib/marketplace/minimum-rates.ts
    - web/stores/useQuoteFormStore.ts
    - web/app/api/marketplace/quotes/submit/route.ts
    - web/app/api/marketplace/quotes/save-draft/route.ts
    - web/app/api/marketplace/quotes/list/route.ts
    - web/app/api/marketplace/quotes/[id]/route.ts
    - web/lib/queries/marketplace/quotes.ts
    - web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx
    - web/components/marketplace/quote-submission/PricingBreakdownSection.tsx
    - web/components/marketplace/quote-submission/StaffingPlanSection.tsx
    - web/components/marketplace/quote-submission/CoverLetterSection.tsx
    - web/app/marketplace/events/[id]/quote/page.tsx
  modified:
    - web/app/marketplace/events/[id]/page.tsx (added active Submit a Quote link)

decisions_made:
  - Minimum rate enforcement is HARD (blocks submission if below guidelines per CONTEXT) — implemented at both form (validation) and API (400 rejection) levels
  - Draft auto-save uses 2-second debounce on form state changes (not per-keystroke, not on blur)
  - Staffing plan supports discriminated union: named medics (specific roster members) OR headcount+qualifications (e.g., "2x Paramedic, 1x EMT")
  - Quote status tracks lifecycle: draft (private, unsaved) → submitted (visible to event poster) → revised (edited after submission) | withdrawn (cancelled)
  - Event duration calculated from event_days table (sum of all days' durations) for minimum rate validation
  - RLS on marketplace_quotes uses user_id-based access (company admin owns own quotes, event poster sees non-draft, admin sees all)
  - Trigger function auto-updates marketplace_events.quote_count and has_quotes on quote insert/update/delete

metrics:
  completed: 2026-02-19
  duration: 42 minutes
  tasks: 2/2
  commits: 2 (c2dc68d + 443c0c0)

# ===========================================================================
## Summary

Phase 34 Plan 01 delivers the foundational infrastructure for marketplace quote submission. Companies can now:

1. **Submit itemised quotes** with pricing breakdown (4 fixed categories + custom line items)
2. **Specify staffing** via named medics from roster OR headcount+qualifications
3. **Add cover letter** pitch (optional, max 5000 chars)
4. **Confirm availability** for the event dates/times
5. **Save as draft** with automatic 2-second debounce (survives page close/browser close)
6. **Receive minimum rate validation** at form and API level — quotes below guideline rates are hard-blocked

**Key features:**

- **Database:** Migration 146 creates `marketplace_quotes` table with RLS (company manages own, event poster views non-draft, admin sees all), triggers to sync event quote_count, and indexes for efficient querying
- **Types & Validation:** TypeScript interfaces mirror SQL schema; Zod schemas validate pricing (> 0), staffing (at least 1 entry), and cover letter (max 5000 chars)
- **Minimum Rates:** Hourly guidelines per qualification (paramedic £45/hr, emt £28/hr, first_aider £18/hr, nurse £40/hr, doctor £75/hr, other £15/hr). Both form and API reject submissions below minimum.
- **Zustand Store:** Centralised form state with submitQuote() and saveDraft() actions. Auto-saves draft every 2 seconds on state change (debounced).
- **API Routes:** 4 endpoints handle submit (with rate validation), save-draft (loose validation), list (with filtering/sorting), and detail (single quote with company data)
- **React Query Hooks:** useQuoteList (with filters), useQuoteDetail (single), useMyQuotes (company's submissions)
- **Form UI:** Multi-section component (pricing, staffing, cover letter) with dynamic line item arrays, real-time validation, and minimum rate warnings

**What's working:**

- Verified company users can navigate from event detail to quote submission page
- Form displays 4 pricing categories + custom line items with running total
- Staffing plan supports both named medics and headcount modes
- Guideline rates displayed in info box; quotes below minimum are blocked
- Draft auto-saves every 2 seconds on form change
- Submit creates quote with status='submitted' and submitted_at timestamp
- Event detail page updates quote_count via trigger function
- RLS ensures company sees own quotes, event poster sees submitted/revised quotes, admin sees all

**Out of scope (future phases):**

- Quote comparison/ranking (Phase 34 Plan 02)
- Best-value scoring algorithm (Phase 34 Plans 02-03)
- Quote editing/revision UI (Phase 35)
- Company ratings and reviews (Phase 36)
- Anonymization of contact details until award (Phase 34 Context deferred)

## Deviations from Plan

None — plan executed exactly as written. All required artifacts created, validated, and committed.

## Architecture & Patterns

### Multi-Section Form with Draft Persistence
Form state managed by Zustand store. Auto-saves to database every 2 seconds via debounced fetch to `/api/marketplace/quotes/save-draft`. Drafts marked with status='draft' (invisible to event poster), never get submitted_at timestamp. User can reload page/close tab and draft persists.

### Itemised Pricing with Custom Line Items
4 fixed categories (staff, equipment, transport, consumables) + unlimited custom line items (e.g., "Specialist vehicle: £500"). Each custom item has id (UUID), label, quantity, unitPrice, optional notes. Total calculated client-side in store and validated to > 0.

### Staffing Plan Discriminated Union
Two modes:
- **named_medics:** Array of { medic_id, name, qualification, notes? }. Companies name specific roster members (trust signal to client).
- **headcount_and_quals:** Array of { role, quantity }. Companies specify "2x Paramedic, 1x EMT" without naming individuals.
User toggles between modes; other mode's data cleared on switch.

### Minimum Rate Enforcement (HARD BLOCK)
Guideline rates stored in minimum-rates.ts as Record<StaffingRole, number>. `validateAgainstMinimumRates()` function checks if quoted rate (total_price / quantity / duration) falls below minimum for any staffing role. Returns { isValid, violations[] }. Form displays rate violations as alert, disables Submit button. API route rejects with 400 and violations list.

### RLS (Row Level Security)
marketplace_quotes table has 3 policies:
1. **company_manage_own_quotes:** Company admin (verified, can_submit_quotes=true) can CRUD own quotes
2. **event_poster_view_quotes:** Event poster can SELECT non-draft quotes on their events (drafts private to company)
3. **platform_admin_all_quotes:** Admin has full access

Uses user_id-based checks (unlike org_id-scoped tables), enabling cross-org marketplace per Phase 34 Context.

### Trigger Functions for Quote Counting
When quote status changes to/from 'submitted' or 'revised', trigger `update_event_quote_count()` updates marketplace_events.quote_count and has_quotes. Keeps denormalized fields in sync without manual updates.

## Testing Approach

Manual testing (no automated tests added in Phase 34 Plan 01):

1. **Draft Saving:** Fill in pricing, wait 2 seconds, reload page → data persists
2. **Minimum Rate Validation:** Set total price to £100 for "1x Paramedic 8 hours" (minimum = £45 × 1 × 8 = £360) → form shows violation alert, Submit disabled
3. **Quote Submission:** Fill complete form, confirm availability, submit → quote created with status='submitted', event quote_count increments
4. **Event Poster Access:** Post event, view from company user, see quote list (non-draft) but not drafts
5. **Admin Access:** View all quotes regardless of status/visibility

## Next Phase Readiness

- **Phase 34-02 (Quote Comparison):** Needs quote list endpoint (ready), filtering/sorting logic (partially ready), best-value ranking algorithm (not yet)
- **Phase 35 (Quote Editing & Award):** Needs quote edit endpoint, revised status handling, deposit flow (not yet)
- **Phase 36 (Ratings & Reviews):** Needs company rating data (schema exists, placeholder values, will be populated here)

No blockers for Phase 34-02 to proceed.

---

**Plan:** 34-01-PLAN.md
**Status:** Complete
**Commits:**
- c2dc68d: feat(34-01): add database schema, types, schemas, and minimum rates for quotes
- 443c0c0: feat(34-01): implement quote submission form, API routes, and store
