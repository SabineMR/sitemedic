---
phase: 34-quote-submission-comparison
plan: 02
subsystem: Marketplace Quotes
tags: [quotes, ranking, anonymisation, comparison, scoring, company-profile]

requires:
  - phase: 34-01
    provides: [quote-types, quote-schemas, react-query-hooks, quote-list-api, quote-detail-api]
provides:
  - Best-value scoring algorithm (calculateBestValueScore, rankQuotesByBestValue)
  - Quote anonymisation utility (anonymiseQuoteForDisplay, canViewContactDetails, maskName)
  - Ranked quote list with sort/filter (QuoteListView + SortFilterBar)
  - Expandable quote rows with pricing breakdown (QuoteRankRow)
  - Quote detail modal with company profile (QuoteDetailModal)
  - Client-facing quotes page (/marketplace/events/[id]/quotes)
  - Company profile page (/marketplace/companies/[id])
  - Event detail "View Quotes" button for event poster
affects: [34-03, 35-01, 36-01]

tech_stack:
  added:
    - zod v4.3.6 (was missing from web package.json)
  patterns:
    - Best-value scoring: normalise price + rating to 0-100 scale, blend 60/40
    - Client-side anonymisation based on event status + deposit status
    - Expandable card rows (Checkatrade/Bark pattern) for quote comparison
    - Access-controlled company profiles (only visible when quote relationship exists)

key_files:
  created:
    - web/lib/marketplace/quote-scoring.ts
    - web/lib/anonymization/quote-anonymizer.ts
    - web/components/marketplace/quote-comparison/QuoteListView.tsx
    - web/components/marketplace/quote-comparison/QuoteRankRow.tsx
    - web/components/marketplace/quote-comparison/QuoteDetailModal.tsx
    - web/components/marketplace/quote-comparison/SortFilterBar.tsx
    - web/app/marketplace/events/[id]/quotes/page.tsx
    - web/app/marketplace/companies/[id]/page.tsx
  modified:
    - web/app/marketplace/events/[id]/page.tsx (added View Quotes button for event poster)
    - web/lib/marketplace/event-types.ts (added deadline_extended field)
    - web/lib/marketplace/quote-schemas.ts (fixed zod v4 .partial() on refined schemas)
    - web/app/api/marketplace/quotes/submit/route.ts (fixed zod v4 .errors -> .issues, await createClient)
    - web/app/marketplace/events/[id]/quote/page.tsx (fixed Next.js 15 Promise params type)
    - web/components/marketplace/quote-management/EditQuoteDialog.tsx (fixed zod v4 .errors -> .issues)
    - web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx (fixed useRef initial value)

key_decisions:
  - "Contact details hidden until BOTH award AND deposit paid (stricter than just 'awarded')"
  - "Best-value score: 60% price + 40% rating, normalised to 0-100 scale"
  - "Company name always visible before award (per CONTEXT)"
  - "Medic names masked as 'First L.' format before award"
  - "Company profile access-controlled: only visible if company submitted a quote on viewer's event"
  - "Tiebreaker for equal scores: submitted_at DESC then company_rating DESC"
  - "isDepositPaid hardcoded to false for now (Phase 35 adds deposit tracking)"

patterns_established:
  - "Best-value scoring algorithm with normalised price/rating blend"
  - "Client-side anonymisation utility (not server-side SQL masking)"
  - "Expandable card rows for comparison lists"
  - "Access-controlled pages via Supabase quote relationship check"

metrics:
  completed: 2026-02-19
  duration: 87min
  tasks: 2/2
  commits: 2 (56ce25f + e56045f)
---

# Phase 34 Plan 02: Quote Comparison & Company Profile Summary

**Best-value ranking with 60/40 price-rating blend, quote anonymisation masking contact details until award + deposit, ranked list with sort/filter, expandable rows, and access-controlled company profiles**

## Performance

- **Duration:** 87 min
- **Started:** 2026-02-19T23:42:39Z
- **Completed:** 2026-02-20T01:09:39Z
- **Tasks:** 2
- **Files created:** 8
- **Files modified:** 7

## Accomplishments
- Best-value scoring algorithm normalises price (0-100 inverted) and rating (0-100) then blends 60% price / 40% rating with stable tiebreakers
- Quote anonymisation utility masks phone, email, address, and medic full names until event is awarded AND deposit is paid
- Ranked quote list with 5 sort modes (best value, lowest/highest price, highest rating, most recent) and 3 filter types (qualification, price range, minimum rating)
- Expandable quote rows show full pricing breakdown, staffing plan, cover letter, and company profile link
- Company profile page with certifications, CQC status, insurance, star rating, reviews placeholder, and contact details gated behind award + deposit
- Event detail page now shows "View Quotes (N)" button for event posters
- Fixed several pre-existing build issues: zod v4 API changes, Next.js 15 Promise params, missing useRef initial value

## Task Commits

Each task was committed atomically:

1. **Task 1: Best-value scoring algorithm and anonymisation utility** - `56ce25f` (feat)
2. **Task 2: Quote list view, expandable rows, sort/filter bar, and company profile page** - `e56045f` (feat)

## Files Created/Modified
- `web/lib/marketplace/quote-scoring.ts` - Best-value scoring: calculateBestValueScore() and rankQuotesByBestValue()
- `web/lib/anonymization/quote-anonymizer.ts` - Quote anonymisation: maskName(), canViewContactDetails(), anonymiseQuoteForDisplay()
- `web/components/marketplace/quote-comparison/SortFilterBar.tsx` - Sort dropdown (5 modes) + filter panel (qualification, price range, rating)
- `web/components/marketplace/quote-comparison/QuoteRankRow.tsx` - Expandable quote card with rank badge, pricing breakdown, staffing plan
- `web/components/marketplace/quote-comparison/QuoteDetailModal.tsx` - Full quote detail dialog with company profile section
- `web/components/marketplace/quote-comparison/QuoteListView.tsx` - Top-level ranked list with skeleton loading and empty state
- `web/app/marketplace/events/[id]/quotes/page.tsx` - Client-facing quotes page with breadcrumb and access control
- `web/app/marketplace/companies/[id]/page.tsx` - Company profile with CQC, insurance, certifications, gated contact details
- `web/app/marketplace/events/[id]/page.tsx` - Added "View Quotes (N)" link for event poster

## Decisions Made
- Contact details require BOTH eventStatus === 'awarded' AND isDepositPaid === true (not just awarded)
- isDepositPaid is hardcoded false for Phase 34 — Phase 35 adds deposit tracking
- Company profile page enforces quote relationship check: only accessible if the company submitted a quote on one of the viewer's events
- Best-value tiebreaker: submitted_at DESC (most recent first), then company_rating DESC

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed zod dependency**
- **Found during:** Task 2 (build verification)
- **Issue:** zod was imported in quote-schemas.ts and event-schemas.ts but not in web/package.json dependencies
- **Fix:** Ran `pnpm add zod` which installed zod v4.3.6
- **Files modified:** web/package.json, web/pnpm-lock.yaml
- **Verification:** Build compilation passes
- **Committed in:** e56045f

**2. [Rule 1 - Bug] Fixed zod v4 API: .errors -> .issues**
- **Found during:** Task 2 (build verification)
- **Issue:** Zod v4 renamed ZodError.errors to ZodError.issues; submit/route.ts and EditQuoteDialog.tsx used .errors
- **Fix:** Changed .errors to .issues in both files
- **Files modified:** web/app/api/marketplace/quotes/submit/route.ts, web/components/marketplace/quote-management/EditQuoteDialog.tsx
- **Verification:** Build type check passes
- **Committed in:** e56045f

**3. [Rule 1 - Bug] Fixed zod v4: .partial() on refined schemas**
- **Found during:** Task 2 (build verification)
- **Issue:** Zod v4 disallows .partial() on objects containing .refine(). draftSaveSchema used pricingSchema.partial() but pricingSchema has a refine.
- **Fix:** Created separate draftPricingSchema without refinement for loose draft validation
- **Files modified:** web/lib/marketplace/quote-schemas.ts
- **Verification:** Build page data collection passes
- **Committed in:** e56045f (via e0b2114)

**4. [Rule 1 - Bug] Fixed Next.js 15 Promise params type**
- **Found during:** Task 2 (build verification)
- **Issue:** quote/page.tsx used `params: { id: string }` but Next.js 15 requires `params: Promise<{ id: string }>`
- **Fix:** Changed to Promise type and added await
- **Files modified:** web/app/marketplace/events/[id]/quote/page.tsx
- **Verification:** Build type check passes
- **Committed in:** e56045f

**5. [Rule 1 - Bug] Fixed missing await on createClient()**
- **Found during:** Task 2 (build verification)
- **Issue:** submit/route.ts called createClient() without await but createClient is async
- **Fix:** Added await
- **Files modified:** web/app/api/marketplace/quotes/submit/route.ts
- **Verification:** Build passes
- **Committed in:** e56045f

**6. [Rule 1 - Bug] Fixed useRef initial value for React 19**
- **Found during:** Task 2 (build verification)
- **Issue:** useRef<NodeJS.Timeout>() requires explicit initial value in React 19
- **Fix:** Changed to useRef<NodeJS.Timeout>(undefined)
- **Files modified:** web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx
- **Verification:** Build type check passes
- **Committed in:** e56045f

**7. [Rule 1 - Bug] Added missing deadline_extended to MarketplaceEvent type**
- **Found during:** Task 2 (build verification)
- **Issue:** 34-03 (parallel plan) added deadline_extended usage in event detail page but didn't update the TypeScript type
- **Fix:** Added deadline_extended: boolean to MarketplaceEvent interface
- **Files modified:** web/lib/marketplace/event-types.ts
- **Verification:** Build type check passes
- **Committed in:** e56045f

**8. [Rule 1 - Bug] Fixed JSX.Element namespace error**
- **Found during:** Task 2 (build verification)
- **Issue:** QuoteRankRow.tsx used JSX.Element return type annotation which doesn't exist in React 19
- **Fix:** Changed to React.ReactElement and added React import
- **Files modified:** web/components/marketplace/quote-comparison/QuoteRankRow.tsx
- **Verification:** Build type check passes
- **Committed in:** e56045f

---

**Total deviations:** 8 auto-fixed (7 bugs, 1 blocking dependency)
**Impact on plan:** All auto-fixes were necessary for build correctness. 7 were pre-existing issues from 34-01/34-03 or zod v4 migration. 1 was a JSX namespace issue in new code. No scope creep.

## Issues Encountered
- Zod v4 was installed instead of v3 (the codebase used v3 patterns). The v4 API changes required fixing .errors -> .issues and removing .partial() on refined schemas. Future phases should be aware zod v4 is now installed.
- 34-03 (parallel plan) modified the event detail page while 34-02 was executing, adding deadline extension functionality that needed type updates.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 34-03 (Quote Management):** Already completed in parallel. The quote comparison UI and company profiles are ready for integration.
- **Phase 35 (Award Flow):** Needs deposit tracking (isDepositPaid flag) to fully unlock contact detail reveal. Currently hardcoded to false.
- **Phase 36 (Ratings & Reviews):** Company profiles have rating/review placeholders ready to be populated.

---
*Phase: 34-quote-submission-comparison*
*Completed: 2026-02-19*
