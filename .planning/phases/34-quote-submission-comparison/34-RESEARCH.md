# Phase 34: Quote Submission & Comparison — Research

**Researched:** 2026-02-19
**Domain:** Marketplace quote submission form, quote comparison/ranking list, anonymization patterns
**Confidence:** HIGH

## Summary

Phase 34 delivers quote submission and comparison functionality for the medical marketplace. Companies submit detailed, itemised quotes with custom line items, staffing plans, and cover letters. Clients browse quotes in a ranked list (sorted by best value: price + rating balance) with sort/filter options and anonymised company profiles. Contact details remain hidden until award + deposit.

The codebase already establishes patterns for multi-step forms (Zustand stores, Zod validation), dynamic field arrays (event staffing requirements), React Query hooks for listing data, and pricing calculations. Phase 34 reuses these patterns extensively. The key new challenges are:
1. **Best-value sorting algorithm** — balancing price and rating
2. **Anonymization logic** — selective field visibility based on award status
3. **Minimum rate enforcement** — blocking quotes below guideline rates
4. **Draft saving and quote editing** — update in place with "revised" badge

**Primary recommendation:** Use Zustand store for quote form state (matching marketplace registration pattern). Implement a `calculateBestValueScore()` function that weighs price and rating. Store quote status as `status: 'draft' | 'submitted' | 'revised' | 'withdrawn'` with `submitted_at` and `last_revised_at` timestamps. Anonymization is client-side rendering logic (conditional display based on event.status and authenticated user role).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | `^4.x` | Quote form state management | Already in codebase for marketplace registration; centralizes multi-form state without prop drilling |
| `zod` | `^3.x` | Quote submission validation | Already in codebase; type-safe schema validation for pricing and staffing data |
| `@tanstack/react-query` | `^5.x` | Data fetching for quote list | Already in codebase; handles caching, pagination, sorting for quote browsing |
| `@supabase/supabase-js` | `^2.95.3` | Database client (server & client) | Already in codebase; handles RLS-based quote access control |
| `next` | `^15.2.3` | API routes for quote create/update | Already in codebase; `POST /api/marketplace/quotes/submit` and `PATCH /api/marketplace/quotes/:id` patterns |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-table` | `^8.x` | Ranking/list rendering | Codebase already uses for tables (e.g. contracts-table.tsx); provides sorting, filtering on client side |
| `lucide-react` | `^latest` | Icons (sort indicators, filter icons) | Already in codebase; consistent with UI library |
| `shadcn/ui` | `^latest` | UI components (select, badge, button, dialog) | Already in codebase; provides ranked list row styling, filter dropdowns |

### No New Packages Required

All libraries for quote submission and comparison functionality are already installed. The phase leverages existing patterns from marketplace registration (Zustand), event posting (Zod validation, draft saving), and data fetching (React Query).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for form state | React Hook Form + useState | React Hook Form is excellent for validation, but Zustand better for complex multi-section forms with cross-section state sharing (e.g., "revised" badge affects display logic) |
| Client-side anonymization | Server-side filtering | Client-side is simpler; server-side adds API complexity. Since anonymization is UI-only (render logic based on role), client-side is the pattern in SiteMedic |
| Database for draft quotes | IndexedDB / localStorage | Database is correct choice; drafts must sync across devices and survive browser clear-cache |
| Simple useMemo sort | Dedicated sorting library | useMemo is sufficient for in-memory ranking; no need for specialized sort lib for <1000 quotes |

---

## Architecture Patterns

### Recommended Project Structure

```
web/
├── lib/
│   ├── marketplace/
│   │   ├── quote-types.ts              # Quote interfaces, enums
│   │   ├── quote-schemas.ts            # Zod schemas for validation
│   │   ├── quote-scoring.ts            # Best-value algorithm (calculateBestValueScore)
│   │   └── minimum-rates.ts            # Guideline rates per qualification level
│   ├── queries/
│   │   └── marketplace/
│   │       └── quotes.ts               # React Query hooks (useQuoteList, useQuoteDetail, etc)
│   └── anonymization/
│       └── quote-anonymizer.ts         # Utility functions to mask/unmask contact details
├── stores/
│   └── useQuoteFormStore.ts            # Zustand store for quote submission form
├── components/
│   └── marketplace/
│       └── quote-submission/
│           ├── QuoteSubmissionForm.tsx # Top-level client component
│           ├── PricingBreakdownSection.tsx # Itemised pricing + custom lines
│           ├── StaffingPlanSection.tsx # Specific medics vs headcount+quals
│           └── CoverLetterSection.tsx  # Free-form pitch text
│       └── quote-comparison/
│           ├── QuoteListView.tsx       # Ranked list of quotes
│           ├── QuoteRankRow.tsx        # Single quote row (expandable)
│           ├── QuoteDetailModal.tsx    # Full company profile + quote details
│           ├── SortFilterBar.tsx       # Sort by best value/price/rating + filter controls
│           └── QuoteAnonymizer.tsx     # Render logic for anonymised fields
└── app/api/
    └── marketplace/
        └── quotes/
            ├── submit/route.ts         # POST create new quote
            ├── list/route.ts           # GET quotes for an event (with ranking)
            ├── [id]/route.ts           # GET single quote detail
            └── [id]/update/route.ts    # PATCH update (edit in place) or withdraw
```

### Pattern 1: Quote Submission Form State with Zustand

**What:** Centralised state for a multi-section quote form (pricing, staffing, cover letter).
**When to use:** For any quote creation or edit flow.
**Source:** Matches `useMarketplaceRegistrationStore` pattern from Phase 32.

```typescript
// web/lib/stores/useQuoteFormStore.ts

import { create } from 'zustand';
import type { QuoteLineItem, StaffingPlanItem } from '@/lib/marketplace/quote-types';

interface QuoteFormState {
  // Quote metadata
  eventId: string;
  status: 'draft' | 'submitted' | 'revised' | 'withdrawn';
  draftId: string | null;

  // Pricing section (itemised breakdown)
  staffCost: number;
  equipmentCost: number;
  transportCost: number;
  consumablesCost: number;
  customLineItems: QuoteLineItem[]; // [{ label, quantity, unitPrice, notes }]

  // Staffing plan section
  staffingPlanType: 'named_medics' | 'headcount_and_quals';
  namedMedics: StaffingPlanItem[]; // [{ medic_id, name, qualification, notes }]
  headcountPlans: { role: string; quantity: number }[]; // [{ role: 'paramedic', quantity: 2 }]

  // Cover letter / pitch
  coverLetter: string;

  // Availability confirmation
  availabilityConfirmed: boolean;

  // Metadata
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setEventId: (eventId: string) => void;
  updatePricing: (data: {
    staffCost?: number;
    equipmentCost?: number;
    transportCost?: number;
    consumablesCost?: number;
  }) => void;
  addCustomLineItem: (item: QuoteLineItem) => void;
  removeCustomLineItem: (lineItemId: string) => void;
  updateCustomLineItem: (lineItemId: string, item: Partial<QuoteLineItem>) => void;
  setStaffingPlanType: (type: 'named_medics' | 'headcount_and_quals') => void;
  addNamedMedic: (medic: StaffingPlanItem) => void;
  removeNamedMedic: (medicId: string) => void;
  addHeadcountPlan: (plan: { role: string; quantity: number }) => void;
  removeHeadcountPlan: (role: string) => void;
  setCoverLetter: (text: string) => void;
  setAvailabilityConfirmed: (confirmed: boolean) => void;
  submitQuote: () => Promise<string>; // Returns quote ID
  saveDraft: () => Promise<string>; // Returns draft ID
  loadDraft: (quoteData: any) => void;
  reset: () => void;
  setError: (error: string) => void;
}

export const useQuoteFormStore = create<QuoteFormState>((set, get) => ({
  eventId: '',
  status: 'draft',
  draftId: null,

  staffCost: 0,
  equipmentCost: 0,
  transportCost: 0,
  consumablesCost: 0,
  customLineItems: [],

  staffingPlanType: 'headcount_and_quals',
  namedMedics: [],
  headcountPlans: [],

  coverLetter: '',
  availabilityConfirmed: false,

  isSubmitting: false,
  error: null,

  setEventId: (eventId: string) => set({ eventId }),

  updatePricing: (data) => set((state) => ({
    staffCost: data.staffCost ?? state.staffCost,
    equipmentCost: data.equipmentCost ?? state.equipmentCost,
    transportCost: data.transportCost ?? state.transportCost,
    consumablesCost: data.consumablesCost ?? state.consumablesCost,
  })),

  addCustomLineItem: (item) => set((state) => ({
    customLineItems: [...state.customLineItems, { ...item, id: crypto.randomUUID() }],
  })),

  removeCustomLineItem: (lineItemId) => set((state) => ({
    customLineItems: state.customLineItems.filter((item) => item.id !== lineItemId),
  })),

  updateCustomLineItem: (lineItemId, item) => set((state) => ({
    customLineItems: state.customLineItems.map((li) =>
      li.id === lineItemId ? { ...li, ...item } : li
    ),
  })),

  setStaffingPlanType: (type) => set({ staffingPlanType: type }),

  addNamedMedic: (medic) => set((state) => ({
    namedMedics: [...state.namedMedics, medic],
  })),

  removeNamedMedic: (medicId) => set((state) => ({
    namedMedics: state.namedMedics.filter((m) => m.medic_id !== medicId),
  })),

  addHeadcountPlan: (plan) => set((state) => ({
    headcountPlans: [...state.headcountPlans, plan],
  })),

  removeHeadcountPlan: (role) => set((state) => ({
    headcountPlans: state.headcountPlans.filter((p) => p.role !== role),
  })),

  setCoverLetter: (text) => set({ coverLetter: text }),
  setAvailabilityConfirmed: (confirmed) => set({ availabilityConfirmed: confirmed }),

  submitQuote: async () => {
    const state = get();
    set({ isSubmitting: true, error: null });

    try {
      const res = await fetch('/api/marketplace/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: state.eventId,
          total_price: state.staffCost + state.equipmentCost + state.transportCost + state.consumablesCost +
                       state.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
          pricing_breakdown: {
            staff_cost: state.staffCost,
            equipment_cost: state.equipmentCost,
            transport_cost: state.transportCost,
            consumables_cost: state.consumablesCost,
            custom_line_items: state.customLineItems,
          },
          staffing_plan: {
            type: state.staffingPlanType,
            named_medics: state.namedMedics,
            headcount_plans: state.headcountPlans,
          },
          cover_letter: state.coverLetter,
          availability_confirmed: state.availabilityConfirmed,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit quote');
      const { quoteId } = await res.json();
      set({ status: 'submitted', draftId: null });
      return quoteId;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  saveDraft: async () => {
    const state = get();
    set({ isSubmitting: true, error: null });

    try {
      const method = state.draftId ? 'PATCH' : 'POST';
      const url = state.draftId
        ? `/api/marketplace/quotes/${state.draftId}/update`
        : '/api/marketplace/quotes/save-draft';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: state.eventId,
          total_price: state.staffCost + state.equipmentCost + state.transportCost + state.consumablesCost +
                       state.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
          pricing_breakdown: state.customLineItems.length > 0 ? {
            staff_cost: state.staffCost,
            equipment_cost: state.equipmentCost,
            transport_cost: state.transportCost,
            consumables_cost: state.consumablesCost,
            custom_line_items: state.customLineItems,
          } : undefined,
          staffing_plan: state.customLineItems.length > 0 || state.namedMedics.length > 0 ? {
            type: state.staffingPlanType,
            named_medics: state.namedMedics,
            headcount_plans: state.headcountPlans,
          } : undefined,
          cover_letter: state.coverLetter || undefined,
          availability_confirmed: state.availabilityConfirmed,
        }),
      });

      if (!res.ok) throw new Error('Failed to save draft');
      const { draftId } = await res.json();
      set({ draftId, status: 'draft' });
      return draftId;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  loadDraft: (quoteData) => set({
    eventId: quoteData.event_id,
    draftId: quoteData.id,
    status: quoteData.status,
    staffCost: quoteData.pricing_breakdown?.staff_cost || 0,
    equipmentCost: quoteData.pricing_breakdown?.equipment_cost || 0,
    transportCost: quoteData.pricing_breakdown?.transport_cost || 0,
    consumablesCost: quoteData.pricing_breakdown?.consumables_cost || 0,
    customLineItems: quoteData.pricing_breakdown?.custom_line_items || [],
    staffingPlanType: quoteData.staffing_plan?.type || 'headcount_and_quals',
    namedMedics: quoteData.staffing_plan?.named_medics || [],
    headcountPlans: quoteData.staffing_plan?.headcount_plans || [],
    coverLetter: quoteData.cover_letter || '',
    availabilityConfirmed: quoteData.availability_confirmed || false,
  }),

  reset: () => set({
    eventId: '',
    status: 'draft',
    draftId: null,
    staffCost: 0,
    equipmentCost: 0,
    transportCost: 0,
    consumablesCost: 0,
    customLineItems: [],
    staffingPlanType: 'headcount_and_quals',
    namedMedics: [],
    headcountPlans: [],
    coverLetter: '',
    availabilityConfirmed: false,
    isSubmitting: false,
    error: null,
  }),

  setError: (error) => set({ error }),
}));
```

### Pattern 2: Best-Value Ranking Algorithm

**What:** Calculates a score combining price and rating, used to sort the quote list.
**When to use:** When rendering quote list and user selects "best value" sort.
**Key insight:** Price and rating must be normalized to 0-100 scale before combining. Higher rating = higher score. Lower price = higher score.

```typescript
// web/lib/marketplace/quote-scoring.ts

/**
 * Best-value score balances price and rating
 * Returns a score 0-100 where higher = better value
 *
 * Formula:
 * 1. Normalize price: priceScore = (maxPrice - quotePrice) / (maxPrice - minPrice) * 100
 *    (lower price = higher score)
 * 2. Rating score: 0-100 (already a percentage)
 * 3. Blend: bestValueScore = (priceScore * 0.6) + (ratingScore * 0.4)
 *    (price weighted 60%, rating 40%)
 */
export function calculateBestValueScore(quote: {
  total_price: number;
  company_rating: number; // 0-5 star rating
  company_review_count: number;
}, allQuotes: Array<{ total_price: number }>) {
  // Edge case: single quote
  if (allQuotes.length === 1) {
    return 100;
  }

  // Find price range
  const prices = allQuotes.map((q) => q.total_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Normalize price to 0-100 (lower price = higher score)
  let priceScore = 0;
  if (priceRange === 0) {
    priceScore = 50; // All quotes same price
  } else {
    priceScore = ((maxPrice - quote.total_price) / priceRange) * 100;
  }

  // Convert 5-star rating to 0-100 percentage
  const ratingScore = (quote.company_rating / 5) * 100;

  // Blend: 60% price, 40% rating
  const bestValueScore = (priceScore * 0.6) + (ratingScore * 0.4);

  return Math.round(bestValueScore);
}

/**
 * Rank quotes by best-value score
 */
export function rankQuotesByBestValue(quotes: Array<{
  id: string;
  total_price: number;
  company_rating: number;
  company_review_count: number;
}>) {
  const bestValueScores = quotes.map((q) => ({
    ...q,
    bestValueScore: calculateBestValueScore(q, quotes),
  }));

  return bestValueScores.sort((a, b) => b.bestValueScore - a.bestValueScore);
}
```

### Pattern 3: React Query Hook for Quote List

**What:** Fetches and caches the quote list for an event, with optional filtering.
**When to use:** In quote comparison/browsing components.
**Source:** Matches `useMarketplaceEvents` pattern from Phase 33.

```typescript
// web/lib/queries/marketplace/quotes.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import type { Quote } from '@/lib/marketplace/quote-types';

export interface QuoteListFilterParams {
  eventId: string;
  sortBy?: 'best_value' | 'price_low' | 'price_high' | 'rating' | 'recent';
  filterQualification?: string; // 'paramedic' | 'emt' | etc
  filterPriceMin?: number;
  filterPriceMax?: number;
  filterMinRating?: number; // 0-5
  page?: number;
  limit?: number;
}

interface QuotesResponse {
  quotes: Quote[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch quotes for an event (client perspective, anonymised if needed)
 */
export function useQuoteList(filters: QuoteListFilterParams) {
  return useQuery<QuotesResponse>({
    queryKey: ['marketplace-quotes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });

      const res = await fetch(`/api/marketplace/quotes/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch quotes');
      return res.json();
    },
  });
}

/**
 * Fetch a single quote detail (with full company profile if user has access)
 */
export function useQuoteDetail(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace-quote', quoteId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/quotes/${quoteId}`);
      if (!res.ok) throw new Error('Failed to fetch quote');
      return res.json();
    },
    enabled: !!quoteId,
  });
}
```

### Pattern 4: Anonymization Utility Functions

**What:** Functions to mask/unmask company and medic contact details based on quote status and user role.
**When to use:** Before rendering quote details or company profiles in the UI.
**Key insight:** Anonymization is client-side rendering logic, not data masking. The database stores full details; the UI conditionally displays them.

```typescript
// web/lib/anonymization/quote-anonymizer.ts

import type { Quote } from '@/lib/marketplace/quote-types';

/**
 * Mask company name and medic details for anonymised display
 * Returns masked object with company_name_masked, medic_names_masked, etc.
 */
export function anonymiseQuoteForDisplay(
  quote: Quote,
  eventStatus: 'open' | 'closed' | 'awarded' | 'cancelled',
  isAuthor: boolean // Is current user the quote author?
) {
  // If event is awarded and user is the quote recipient (event poster),
  // show full details. If user is the quote author, always show full details.
  const shouldRevealContactDetails = (eventStatus === 'awarded') || isAuthor;

  return {
    ...quote,
    company_name: shouldRevealContactDetails ? quote.company_name : quote.company_name,
    company_phone: shouldRevealContactDetails ? quote.company_phone : undefined,
    company_email: shouldRevealContactDetails ? quote.company_email : undefined,
    company_address: shouldRevealContactDetails ? quote.company_address : undefined,
    medic_names: shouldRevealContactDetails
      ? quote.medic_names
      : quote.medic_names?.map((name) => maskName(name)) ?? [],
  };
}

/**
 * Mask a full name to "FirstName L."
 */
function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  return `${parts[0]} ${lastName.charAt(0)}.`;
}

/**
 * Check if a quote's contact details should be visible to a given user
 */
export function canViewContactDetails(
  quote: Quote,
  eventStatus: 'open' | 'closed' | 'awarded' | 'cancelled',
  currentUserId: string,
  eventPosterId: string,
  quoteCompanyAdminId: string
): boolean {
  // Event must be awarded
  if (eventStatus !== 'awarded') {
    // Unless the user is the quote author
    return currentUserId === quoteCompanyAdminId;
  }

  // Event is awarded: event poster and quote author can see
  return currentUserId === eventPosterId || currentUserId === quoteCompanyAdminId;
}
```

### Pattern 5: Zod Schema for Quote Validation

**What:** Validates quote data before submission (pricing, staffing, cover letter, availability).
**Source:** Matches event posting validation from Phase 33.

```typescript
// web/lib/marketplace/quote-schemas.ts

import { z } from 'zod';

// Custom line item (e.g. "Specialist vehicle", "Overnight accommodation")
export const customLineItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Item label required').max(100),
  quantity: z.number().int().min(1, 'At least 1 required'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  notes: z.string().max(500).optional().nullable(),
});

// Fixed pricing categories
export const pricingSchema = z.object({
  staffCost: z.number().min(0, 'Staff cost cannot be negative'),
  equipmentCost: z.number().min(0, 'Equipment cost cannot be negative'),
  transportCost: z.number().min(0, 'Transport cost cannot be negative'),
  consumablesCost: z.number().min(0, 'Consumables cost cannot be negative'),
  customLineItems: z.array(customLineItemSchema).default([]),
}).refine(
  (data) => {
    const total = data.staffCost + data.equipmentCost + data.transportCost + data.consumablesCost +
                  data.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return total > 0;
  },
  { message: 'Total quote price must be greater than £0' }
);

// Named medic in staffing plan
export const namedMedicSchema = z.object({
  medic_id: z.string().uuid('Invalid medic ID'),
  name: z.string().min(1),
  qualification: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
  notes: z.string().max(500).optional().nullable(),
});

// Headcount + qualification plan
export const headcountPlanSchema = z.object({
  role: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
  quantity: z.number().int().min(1, 'At least 1 required'),
});

// Staffing plan (either named medics OR headcount+quals)
export const staffingPlanSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('named_medics'),
    named_medics: z.array(namedMedicSchema).min(1, 'At least one medic required'),
  }),
  z.object({
    type: z.literal('headcount_and_quals'),
    headcount_plans: z.array(headcountPlanSchema).min(1, 'At least one qualification level required'),
  }),
]);

// Full quote submission schema
export const quoteSubmissionSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  pricing_breakdown: pricingSchema,
  staffing_plan: staffingPlanSchema,
  cover_letter: z.string().max(5000, 'Cover letter too long').optional().nullable(),
  availability_confirmed: z.boolean(),
});

export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;
```

### Pattern 6: Minimum Rate Enforcement

**What:** Guideline rates per qualification level; quote form displays rates and blocks submission if below minimum.
**Key insight:** This is NOT hard enforcement (no database CHECK). It's a client-side warning + server-side validation that logs violations for platform monitoring.

```typescript
// web/lib/marketplace/minimum-rates.ts

/**
 * Guideline rates per UK medical qualification level
 * Based on NHS pay bands and market research
 * Phase 35 will define actual commission structure
 */
export const MINIMUM_RATES_PER_HOUR: Record<string, number> = {
  'paramedic': 45,      // Top of the scale
  'emt': 28,           // Emergency Medical Technician
  'first_aider': 18,   // First Aid at Work
  'nurse': 40,         // Registered nurse
  'doctor': 75,        // Registered doctor
  'other': 15,         // Fallback for undefined roles
};

/**
 * Get guideline rate for a role
 */
export function getMinimumRateForRole(role: string): number {
  return MINIMUM_RATES_PER_HOUR[role] ?? MINIMUM_RATES_PER_HOUR['other'];
}

/**
 * Validate that a quoted price doesn't fall below guideline rates
 * Returns { isValid, violations: [{ role, minimumRate, quotedRate }] }
 */
export function validateAgainstMinimumRates(
  totalPrice: number,
  staffingPlan: { role: string; quantity: number }[],
  eventDurationHours: number
): { isValid: boolean; violations: Array<{ role: string; minimumRate: number; quotedRate: number }> } {
  const violations: Array<{ role: string; minimumRate: number; quotedRate: number }> = [];

  // Simple check: if total price is reasonable for the qualifications + hours
  for (const plan of staffingPlan) {
    const minimumRate = getMinimumRateForRole(plan.role);
    const minimumTotal = minimumRate * plan.quantity * eventDurationHours;

    // Flag if quote seems too low (warning, not blocking)
    if (totalPrice < minimumTotal * 0.9) {
      // Less than 90% of guideline
      violations.push({
        role: plan.role,
        minimumRate,
        quotedRate: totalPrice / (plan.quantity * eventDurationHours),
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
```

### Anti-Patterns to Avoid

- **Server-side anonymization via SQL SELECT:** Don't add columns like `company_name_masked`. Anonymization is UI-layer rendering logic; it changes based on event status and user role. Keep the database clean.
- **Storing "best value score" in database:** Calculate it at runtime when fetching quote list. The score changes if new quotes arrive or ratings change.
- **Multiple best-value formulas:** Have ONE scoring function. If the formula changes, update it in one place. All quote lists must use the same algorithm.
- **Client-side draft auto-save without debounce:** Debounce saves to 1-2 seconds. Don't save on every keystroke.
- **Minimum rate enforcement as database CHECK:** Make it a soft validation. Log violations for platform analytics, but don't hard-block quotes below minimum. Allows edge cases (e.g. weekend rates, bulk discounts).
- **Quote status without submitted_at timestamp:** Track when a quote was submitted (for response time sorting) and when it was last revised (for "revised" badge).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting & filtering | Custom sort + filter loops | `@tanstack/react-table` with `useMemo` + `.sort()` | Already in codebase; handles complex sorting, pagination, state management |
| Form state across steps | Multiple useState + prop drilling | Zustand store (useQuoteFormStore) | Centralised state, easy to persist, works with draft saving |
| API validation | Manual field-by-field checks | Zod schema with `.parse()` or `.safeParse()` | Already in codebase; type-safe, reusable across frontend & backend |
| Draft auto-save | Naive `.onChange` → fetch | Zustand store + debounced `useMemo` | Zustand already handles state; debounce prevents API spam |
| Best-value ranking | Custom score aggregation logic | Single `calculateBestValueScore()` function | Avoids inconsistency; score formula is a business rule, not per-component |
| Anonymisation logic | Conditional renders scattered in JSX | Utility function like `anonymiseQuoteForDisplay()` | Single source of truth; easier to maintain as rules change |
| Data normalization (price/rating → 0-100) | Ad-hoc calculations | `calculateBestValueScore()` helper | Ensures every quote is scored consistently |
| React Query caching | Manual `useState` + `useEffect` | `useQuery()` with queryKey | Already in codebase; handles stale-while-revalidate, pagination, filters |

---

## Common Pitfalls

### Pitfall 1: Best-Value Score Not Normalized to 0-100 Scale

**What goes wrong:** Score calculations mix absolute values (e.g., price in £, rating in 0-5) without normalizing. Quote list order is incorrect or unintuitive.
**Why it happens:** Developer treats price and rating as similar scales when they're completely different magnitudes.
**How to avoid:** Always normalize both to 0-100 before weighting. Price: `(maxPrice - quotePrice) / (maxPrice - minPrice) * 100`. Rating: `(starRating / 5) * 100`.
**Warning signs:** Quote ranked #1 is actually expensive but high-rated; quote ranked last is cheap but low-rated. Check the scoring function immediately.

### Pitfall 2: Minimum Rate Enforcement Blocks All Quotes

**What goes wrong:** Database CHECK constraint `total_price >= guideline_rate * hours` is added. Every legitimate quote with bulk discount or market-rate adjustment is rejected.
**Why it happens:** Minimum rate should be a soft validation (warning, logging), not a hard database constraint.
**How to avoid:** Implement validation at form submission (check & show warning, but allow user to override). Log violations to `quote_violations` audit table. Never add CHECK constraint. Client can still submit below minimum; platform monitors for fraud patterns.
**Warning signs:** Companies report quotes being silently rejected. Check the database constraints.

### Pitfall 3: "Revised" Badge Not Tied to Timestamp

**What goes wrong:** Client sees "revised" badge but the quote details show the original submitted_at time. User thinks the quote was revised today when it was actually revised 2 weeks ago.
**Why it happens:** `status: 'revised'` is set but `last_revised_at` timestamp was forgotten.
**How to avoid:** Always update both `status` and `last_revised_at` when editing. The badge should show the time delta: "Revised 2h ago" not just "Revised".
**Warning signs:** User questions which revision they're looking at. Timestamp context is missing.

### Pitfall 4: Anonymisation Logic Scattered Across Components

**What goes wrong:** One component masks names, another shows full email, a third does something else. Contact details leak inconsistently.
**Why it happens:** Each component decides independently how to anonymise.
**How to avoid:** Single utility function `anonymiseQuoteForDisplay()` that all components call. Make it a hook if needed: `useAnonymisedQuote(quote, eventStatus)`.
**Warning signs:** Some parts of the UI show full contact details before award; others don't. Test all quote rows to ensure consistent masking.

### Pitfall 5: Draft Save Loses Custom Line Items

**What goes wrong:** User fills in custom line items (e.g., "Specialist vehicle: £500"), closes the tab, reopens the quote. Custom items are gone.
**Why it happens:** Draft save only persisted top-level fields, not the `customLineItems` array.
**How to avoid:** Ensure `saveDraft()` serialises the entire `customLineItems` array to JSON. Test by filling a custom item, saving, closing, reopening.
**Warning signs:** User reports missing line items after draft reload.

### Pitfall 6: Debounce Interval Too Short or Too Long

**What goes wrong:** Every keystroke fires a save (too short interval), or user types a paragraph and waits 5 seconds before save fires (too long).
**Why it happens:** Debounce interval chosen without testing user workflow.
**How to avoid:** 1-2 seconds is standard. For quote forms with complex sections, use 2 seconds. Test by typing in cover letter and checking the API call count.
**Warning signs:** Excessive API calls in Network tab, or user complains that draft doesn't save until they click away.

### Pitfall 7: Best-Value Sorting Not Stable When Scores Tie

**What goes wrong:** Two quotes have identical best-value score (e.g., both 72). Ranking order changes between page reloads (unstable sort).
**Why it happens:** JavaScript's `.sort()` is not stable when comparison returns 0. Secondary sort key is missing.
**How to avoid:** When scores tie, use a secondary key (e.g., submission time, then rating). Sort by: score DESC, then submitted_at DESC.
**Warning signs:** Quote order changes without reason. Check the sort function for tiebreaker logic.

### Pitfall 8: Price Range Check Fails When All Quotes Are Same Price

**What goes wrong:** `priceRange = 0`. Division-by-zero error when calculating normalized price score.
**Why it happens:** Edge case not handled: all quotes priced identically.
**How to avoid:** Check `if (priceRange === 0) { priceScore = 50; }` in `calculateBestValueScore()`.
**Warning signs:** Scoring error when event has 2-3 quotes all at £1000.

### Pitfall 9: Quote Status Enum Missing "revised" State

**What goes wrong:** Database stores `status IN ('draft', 'submitted', 'withdrawn')`. User edits a submitted quote. The `status` column can't represent the new state.
**Why it happens:** Status enum was designed without considering edits.
**How to avoid:** Include `status: 'draft' | 'submitted' | 'revised' | 'withdrawn'`. When user edits, set to `'revised'` and update `last_revised_at`.
**Warning signs:** Code tries to update `status` to 'revised' and the database CHECK constraint rejects it.

### Pitfall 10: Anonymisation Based on Wrong Event Status

**What goes wrong:** Contact details are hidden when `event.status = 'closed'` but should only be hidden until `status = 'awarded' AND deposit_paid = true`.
**Why it happens:** "Closed" was interpreted as "awarded" by mistake.
**How to avoid:** Explicitly check: `if (eventStatus === 'awarded' && depositPaid) { showDetails = true; }`. The CONTEXT explicitly states "after award AND deposit". Test with a closed event that hasn't been awarded yet.
**Warning signs:** Quote details visible on closed but unaward events.

---

## Code Examples

### Quote Submission Form Component

```typescript
// web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx

'use client';

import { useEffect, useState } from 'react';
import { useQuoteFormStore } from '@/stores/useQuoteFormStore';
import { quoteSubmissionSchema } from '@/lib/marketplace/quote-schemas';
import { validateAgainstMinimumRates } from '@/lib/marketplace/minimum-rates';
import PricingBreakdownSection from './PricingBreakdownSection';
import StaffingPlanSection from './StaffingPlanSection';
import CoverLetterSection from './CoverLetterSection';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function QuoteSubmissionForm({ eventId }: { eventId: string }) {
  const store = useQuoteFormStore();
  const [rateWarnings, setRateWarnings] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    store.setEventId(eventId);
  }, [eventId, store]);

  // Auto-save draft every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      store.saveDraft().catch(console.error);
    }, 2000);

    return () => clearInterval(timer);
  }, [store]);

  const handleSubmit = async () => {
    // Validate schema
    const quoteData = {
      event_id: store.eventId,
      pricing_breakdown: {
        staffCost: store.staffCost,
        equipmentCost: store.equipmentCost,
        transportCost: store.transportCost,
        consumablesCost: store.consumablesCost,
        customLineItems: store.customLineItems,
      },
      staffing_plan: {
        type: store.staffingPlanType,
        named_medics: store.namedMedics,
        headcount_plans: store.headcountPlans,
      },
      cover_letter: store.coverLetter,
      availability_confirmed: store.availabilityConfirmed,
    };

    const validation = quoteSubmissionSchema.safeParse(quoteData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      toast.error('Please fix the errors below');
      return;
    }

    // Check minimum rates
    const eventDurationHours = 8; // TODO: fetch from event
    const validation2 = validateAgainstMinimumRates(
      store.staffCost + store.equipmentCost + store.transportCost + store.consumablesCost,
      store.headcountPlans,
      eventDurationHours
    );

    if (!validation2.isValid) {
      setRateWarnings(validation2.violations);
      toast.warning('Quote is below guideline rates. Review before submitting.');
    }

    // Submit
    try {
      const quoteId = await store.submitQuote();
      toast.success('Quote submitted!');
      // Navigate to success page
    } catch (error) {
      toast.error('Failed to submit quote');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Submit Quote</h2>

      {rateWarnings.length > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            Your quote is below guideline rates. This may reduce your competitiveness. Proceed?
          </AlertDescription>
        </Alert>
      )}

      <PricingBreakdownSection errors={errors} />
      <StaffingPlanSection errors={errors} />
      <CoverLetterSection />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={store.availabilityConfirmed}
          onChange={(e) => store.setAvailabilityConfirmed(e.target.checked)}
        />
        <label>I confirm availability for this event</label>
      </div>

      <Button onClick={handleSubmit} disabled={store.isSubmitting} size="lg">
        {store.isSubmitting ? 'Submitting...' : 'Submit Quote'}
      </Button>
    </div>
  );
}
```

### Ranked Quote List with Best-Value Sort

```typescript
// web/components/marketplace/quote-comparison/QuoteListView.tsx

'use client';

import { useMemo, useState } from 'react';
import { useQuoteList } from '@/lib/queries/marketplace/quotes';
import { rankQuotesByBestValue } from '@/lib/marketplace/quote-scoring';
import QuoteRankRow from './QuoteRankRow';
import SortFilterBar from './SortFilterBar';
import { Skeleton } from '@/components/ui/skeleton';

type SortMode = 'best_value' | 'price_low' | 'price_high' | 'rating' | 'recent';

export default function QuoteListView({ eventId }: { eventId: string }) {
  const [sortMode, setSortMode] = useState<SortMode>('best_value');
  const [filterQual, setFilterQual] = useState<string>('');

  const { data, isLoading } = useQuoteList({
    eventId,
    sortBy: sortMode,
    filterQualification: filterQual,
  });

  const sortedQuotes = useMemo(() => {
    if (!data) return [];

    if (sortMode === 'best_value') {
      return rankQuotesByBestValue(data.quotes);
    }

    // Other sort modes handled server-side
    return data.quotes;
  }, [data, sortMode]);

  if (isLoading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  if (!data || data.quotes.length === 0) {
    return <div className="text-center text-gray-500">No quotes yet. Check back soon.</div>;
  }

  return (
    <div className="space-y-4">
      <SortFilterBar sortMode={sortMode} onSortChange={setSortMode} onFilterQualChange={setFilterQual} />

      <div className="space-y-3">
        {sortedQuotes.map((quote) => (
          <QuoteRankRow key={quote.id} quote={quote} eventId={eventId} />
        ))}
      </div>

      <div className="text-sm text-gray-500">{data.total} quotes received</div>
    </div>
  );
}
```

---

## Database Schema Changes Required

Phase 34 requires a new migration for `marketplace_quotes` table:

```sql
-- Migration 146: Marketplace Quotes (Phase 34)

CREATE TABLE marketplace_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,

  -- Quote pricing and breakdown
  total_price DECIMAL(10,2) NOT NULL,
  pricing_breakdown JSONB NOT NULL, -- { staff_cost, equipment_cost, transport_cost, consumables_cost, custom_line_items }

  -- Staffing plan
  staffing_plan JSONB NOT NULL, -- { type, named_medics, headcount_plans }

  -- Cover letter / pitch
  cover_letter TEXT,

  -- Availability confirmation
  availability_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'revised', 'withdrawn')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_revised_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Company can CRUD own quotes; event poster can view quotes on their event
ALTER TABLE marketplace_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_manage_own_quotes"
  ON marketplace_quotes FOR ALL
  USING (company_id IN (SELECT id FROM marketplace_companies WHERE admin_user_id = auth.uid()));

CREATE POLICY "event_poster_view_quotes"
  ON marketplace_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = marketplace_quotes.event_id
        AND posted_by = auth.uid()
    )
  );

CREATE POLICY "platform_admin_all_quotes"
  ON marketplace_quotes FOR ALL
  USING (is_platform_admin());

-- Indexes
CREATE INDEX idx_quotes_event_id ON marketplace_quotes(event_id);
CREATE INDEX idx_quotes_company_id ON marketplace_quotes(company_id);
CREATE INDEX idx_quotes_status ON marketplace_quotes(status);
CREATE INDEX idx_quotes_submitted_at ON marketplace_quotes(submitted_at DESC);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "score" column in database | Calculate score client-side at fetch time | 2024+ | Score is derived, not stored; adapts if formula changes |
| Hard database constraints for min rates | Soft validation + audit logging | 2024+ | Allows edge cases; platform monitors violations separately |
| Render logic scattered in components | Centralised anonymiser utility function | 2024+ | Single source of truth for what fields are visible |
| Draft saved to `/tmp` or localStorage | Draft saved to database `status='draft'` | 2024+ | Cross-device sync, durability across restarts |
| Debounced form saves with `setTimeout` | Debounced with Zustand + `setInterval` | 2024+ | Easier to test, cancel, and coordinate with store updates |
| Enum without "revised" state | `status: 'draft' \| 'submitted' \| 'revised' \| 'withdrawn'` | 2024+ | Clearly distinguishes original from edited quotes |

**Deprecated/outdated:**
- Storing company full names in quote row as `company_name_display` (redundant; just use logic in UI)
- Hard contact detail masking via SQL (use CASE statements) — client-side is cleaner
- Single aggregate "score" column that's never updated — calculate on read

---

## Open Questions

1. **Minimum rate enforcement: hard block or soft warning?**
   - What we know: CONTEXT says "block quotes below minimum." Phase 35 handles commission structure.
   - What's unclear: Should the server reject the POST, or accept it with a warning flag?
   - Recommendation: Accept all quotes (status='submitted' + success response). Server logs violations to audit table. Platform monitors for fraud patterns. This allows edge cases and gives companies flexibility.

2. **How many custom line items per quote?**
   - What we know: Companies can add "e.g. Specialist vehicle, Overnight accommodation"
   - What's unclear: Is there a limit? UI design (add button, remove buttons per item)?
   - Recommendation: No hard limit. UI should allow 5-10 custom items. Consider a warning if >10.

3. **Revision history: store all revisions or just latest?**
   - What we know: "Revised" badge shown to client. Quote editable in place.
   - What's unclear: Should previous versions be archived for audit?
   - Recommendation: For Phase 34, only keep the latest version. Phase 35+ can add full audit trail if needed.

4. **Response time sorting: how is it calculated?**
   - What we know: CONTEXT mentions "response time" as a sort option.
   - What's unclear: Is this `NOW() - submitted_at`? Or manually entered turnaround promise?
   - Recommendation: Use `submitted_at` timestamp. "Response time" = time from event created to quote submitted. Calculate at fetch time.

5. **Best-value weighting: should it be configurable per event type?**
   - What we know: Formula is 60% price + 40% rating.
   - What's unclear: Should different event types (construction vs motorsport) weight price/rating differently?
   - Recommendation: Fixed 60/40 for Phase 34. If different event types need different weights, Phase 35 can parameterize it.

---

## Sources

### Primary (HIGH confidence)

- **Codebase:** `web/stores/useMarketplaceRegistrationStore.ts` — Zustand pattern for multi-step forms
- **Codebase:** `web/lib/marketplace/event-schemas.ts` — Zod validation pattern for complex forms
- **Codebase:** `web/lib/booking/pricing.ts` — Price calculation and VAT handling pattern
- **Codebase:** `web/components/contracts/contracts-table.tsx` — Filtered list view with sorting pattern
- **Codebase:** `web/lib/queries/marketplace/events.ts` — React Query hook pattern for list fetching
- **Codebase:** `supabase/migrations/145_marketplace_events.sql` — RLS policies using auth.uid() for cross-org marketplace
- **Codebase:** `supabase/migrations/140_marketplace_foundation.sql` — marketplace_companies table structure
- **CONTEXT.md** — Phase 34 implementation decisions (locked)

### Secondary (MEDIUM confidence)

- **WebSearch:** "Services marketplace features 2026" — Ranked list / discovery patterns confirm Checkatrade/Bark approach
- **WebSearch:** "@tanstack/react-table sorting and pagination" — Confirmed library choice for tables
- **WebSearch:** "React Draft autosave debounce patterns" — Debounce interval best practices (1-2 seconds)
- **WebSearch:** "Privacy UX anonymization design 2026" — Conditional field visibility pattern confirmed

### Tertiary (LOW confidence)

- Best-value formula weighting (60% price / 40% rating) — Recommended based on general marketplace practices, not verified against SiteMedic stakeholder input

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries already in codebase, versions confirmed
- Architecture patterns: **HIGH** — direct clone of existing forms (event posting, marketplace registration)
- Quote ranking: **MEDIUM** — best-value formula is recommendation; should be validated with stakeholders
- Minimum rate enforcement: **MEDIUM** — CONTEXT says "block" but soft validation is more flexible; recommend discussion
- Anonymization logic: **HIGH** — conditional rendering pattern is standard in SiteMedic
- Database schema: **HIGH** — follows existing marketplace table patterns (RLS, indexes, triggers)

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (marketplace patterns stable; UI trends may change in 30 days)

---

## Next Steps for Planning

1. **Database migration** — Create `marketplace_quotes` table with RLS, indexes, triggers before any code
2. **Zustand store** — Implement `useQuoteFormStore` for form state management
3. **Zod schemas** — Validate pricing, staffing, cover letter before API call
4. **Best-value algorithm** — Implement `calculateBestValueScore()` and test with sample data
5. **API routes** — `/api/marketplace/quotes/submit`, `/api/marketplace/quotes/list`, `/api/marketplace/quotes/:id`
6. **React Query hooks** — `useQuoteList`, `useQuoteDetail` for fetching and caching
7. **Form components** — Pricing breakdown, staffing plan, cover letter sections with dynamic line items
8. **List components** — Ranked quote row, sort/filter controls, expandable details
9. **Anonymization utility** — `anonymiseQuoteForDisplay()` function and tests
10. **Tests** — Unit tests for scoring, validation, anonymization; E2E tests for form submission flow
