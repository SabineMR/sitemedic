# Phase 33: Event Posting & Discovery — Research

**Researched:** 2026-02-19
**Status:** Complete

## 1. Existing Form Patterns

### Multi-Step Wizard (Primary Pattern)
**Best example:** `web/app/marketplace/register/page.tsx`
- Uses **Zustand store** for centralized state across steps (`useMarketplaceRegistrationStore`)
- Step navigation with progress bar showing visual completion status
- Each step validates its data before allowing next/previous
- Pre-population from existing org data (auto-fill pattern)
- Form data persists across navigation via store
- Store file: `web/stores/useMarketplaceRegistrationStore.ts`

**Key store pattern:**
- Create store with default state
- Partial state update actions (updateCompanyDetails, etc.)
- Add/remove helpers (addDocument, removeDocument)
- Reset method for post-submission cleanup
- Error and submitting state tracking

### Simpler Form Pattern
**Example:** `web/components/booking/booking-form.tsx`
- Client component with useState
- Section-based layout (not step-based)
- Manual validation functions (e.g., `isValidUkPostcode()`, `isFormValid()`)
- Uses `sessionStorage` for passing data between pages
- NOT using React Hook Form + Zod (pure useState management)

**Decision for Phase 33:** Use Zustand store + step wizard (matching marketplace registration pattern). Zod validation per the roadmap requirement.

## 2. Database & Migration Patterns

### Latest Migrations
- `143_comms_docs_schema.sql` (v5.0 comms)
- `140_marketplace_foundation.sql` (marketplace tables)
- `141_compliance_documents.sql`

### Standard Migration Template
```
1. TABLE definitions (UUID PKs via gen_random_uuid())
2. Denormalized org_id on child tables (for RLS performance)
3. Composite unique indexes
4. ENABLE ROW LEVEL SECURITY on all tables
5. RLS POLICIES (5 standard: SELECT, INSERT, UPDATE, DELETE + platform admin ALL)
6. TRIGGER for updated_at (uses update_updated_at_column())
7. INDEXES (org_id + composite)
8. COMMENT statements
9. SUMMARY section
```

### RLS Policy Patterns

**Marketplace cross-org (auth.uid-based):**
```sql
-- Events posted by a client org, visible across orgs
CREATE POLICY "company_owners_manage_own"
  ON marketplace_companies FOR ALL
  USING (admin_user_id = auth.uid());
```

**Browsing public records:**
```sql
CREATE POLICY "Browse public events"
  ON marketplace_events FOR SELECT
  USING (visibility = 'public' AND status != 'draft');
```

**Important:** v4.0 marketplace tables use `user_id`-based RLS (NOT `org_id`) because marketplace is cross-org by design.

### Existing Marketplace Tables
- `marketplace_companies` — registered medical companies
- `marketplace_company_medics` — medics linked to companies
- `compliance_documents` — company compliance docs
- Key helper: `get_user_org_id()` wrapper for RLS query plan caching

## 3. Page Routing Structure

### Current Layout
```
web/app/
├── (dashboard)/          -- org user dashboard
├── (client)/client/      -- client-facing (billing, bookings, invoices)
├── admin/                -- org admin pages
├── platform/             -- platform admin (verification, analytics, orgs)
├── marketplace/          -- public marketplace + registration
│   ├── register/         -- 4-step wizard
│   └── client-register/  -- client marketplace registration
├── (booking)/book/       -- public booking flow
└── (marketing)/          -- landing, contact
```

### Likely Phase 33 Routes
```
web/app/marketplace/
├── events/
│   ├── page.tsx              -- discovery/browse (medics)
│   ├── [id]/page.tsx         -- event detail
│   └── create/page.tsx       -- post event (clients)
├── my-events/page.tsx        -- client's posted events
```

## 4. Google Places & Location

### Existing Google Places Autocomplete
**File:** `web/components/QuoteBuilder.tsx` (lines 58-117)
```typescript
autocompleteRef.current = new google.maps.places.Autocomplete(inputRef, {
  componentRestrictions: { country: 'gb' },
  types: ['geocode'],
  fields: ['formatted_address', 'geometry', 'address_components'],
});
```
- Extracts lat/lng from place geometry
- Auto-fills what3words from coordinates via `coordinatesToWhat3Words()`

### What3Words Component
**File:** `web/components/ui/what3words-input.tsx`
- Custom input with format validation (`///word.word.word` or `word.word.word`)

### Postcode Validation
```typescript
const isValidUkPostcode = (postcode: string): boolean => {
  const ukPostcodePattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
  return ukPostcodePattern.test(postcode.trim());
};
```

### For Radius Search
- Store coordinates as `GEOGRAPHY(POINT)` in PostGIS
- Query: `ST_DWithin(location_coordinates, ST_MakePoint(lng, lat)::geography, radius_meters)`

## 5. UI Components Available

### shadcn/ui Components (in `web/components/ui/`)
button, card, dialog, input, label, select, textarea, table, tabs, badge, skeleton, alert, sheet, dropdown-menu, popover, tooltip, calendar, radio-group, checkbox

### Table/List View Pattern
**Example:** `web/components/admin/client-management-table.tsx`
- React Query hook for data fetching
- Local state for UI filters/search
- useMemo for filtered results
- Conditional rendering for loading/error
- Skeleton components for loading

## 6. API Route Patterns

### Standard API Route
**Example:** `web/app/api/bookings/create/route.ts`
```typescript
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();  // Server client
  const orgId = await requireOrgId();
  const body = await request.json();
  // Validate → Query with org_id filter → Return NextResponse.json()
}
```

### Service-Role Client (Platform Admin)
**File:** `web/lib/marketplace/admin-actions.ts`
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Only for platform admin operations

## 7. Existing Vertical/Compliance Patterns

### Vertical Classification
**File:** `web/lib/booking/vertical-requirements.ts`
- Verticals: construction, tv_film, motorsport, festivals, sporting_events, fairs_shows, corporate, private_events, education, outdoor_adventure, general
- Each has requirements with optional dbField mapping

### Compliance Framework
**File:** `web/lib/compliance/vertical-compliance.ts`
- Maps verticals to compliance framework (RIDDOR, Purple Guide, etc.)

**Reuse for event type dropdown:** Event types align with existing verticals.

## 8. Key Architectural Decisions for Phase 33

1. **Database first** — migration with tables, RLS, indexes, triggers
2. **Cross-org marketplace RLS** — events use auth.uid() for client ownership, public SELECT for browsing
3. **Denormalize** — child tables get their own user_id/org_id columns
4. **Zustand for wizard** — store for multi-step form state
5. **React Query hooks** — custom hooks in `web/lib/queries/` for data fetching
6. **Server API routes** — NextResponse, server-side validation
7. **PostGIS for location** — GEOGRAPHY(POINT) + ST_DWithin for radius search
8. **Reuse vertical types** — event_type maps to existing booking verticals

## 9. Key File Paths

| Category | Path |
|----------|------|
| Migrations | `supabase/migrations/` |
| UI Components | `web/components/ui/` |
| Marketplace Components | `web/components/marketplace/` |
| Booking Components | `web/components/booking/` |
| Marketplace Types | `web/lib/marketplace/types.ts` |
| Booking Types | `web/lib/booking/types.ts` |
| Marketplace Registration Store | `web/stores/useMarketplaceRegistrationStore.ts` |
| Marketplace Admin Actions | `web/lib/marketplace/admin-actions.ts` |
| API Routes | `web/app/api/` |
| Platform Pages | `web/app/platform/` |
| Marketplace Pages | `web/app/marketplace/` |
| Vertical Requirements | `web/lib/booking/vertical-requirements.ts` |

## RESEARCH COMPLETE
