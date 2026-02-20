# Phase 37: Company Accounts - Research

**Researched:** 2026-02-20
**Domain:** Medic roster management, company-to-medic relationships, roster-medic assignment in quotes, company profile aggregation
**Confidence:** HIGH

## Summary

Phase 37 enables company admins to manage a roster of individual medics, assign specific medics to events when quoting, and display rich company profiles. The core complexity is modeling the relationship between companies and medics — a many-to-many design where a medic can belong to multiple companies simultaneously, and a company can assign roster medics to specific events.

The existing codebase provides:
1. **marketplace_companies** table (Phase 32) — company registration with CQC verification, Stripe Connect, and marketplace permissions
2. **medics** table (original SiteMedic) — individual medic qualifications, certifications, employment status
3. **marketplace_quotes** table (Phase 34) with `staffing_plan` JSONB discriminator — already supports named_medics vs headcount_and_quals but has no roster enforcement mechanism
4. **marketplace_ratings** table (Phase 36) — ratings for companies with denormalized `average_rating` and `review_count` on `marketplace_companies`

Phase 37 bridges the gap by:
- Creating a **company_roster_medics** junction table to track medic membership with per-medic availability and qualifications
- Extending **marketplace_companies** with profile display fields (roster_size, average_rating visible from Phase 36)
- Validating that named medics in quotes belong to the company's roster at submission time
- Implementing roster availability tracking to power capacity indicators and quote assignment logic

**Primary recommendation:** Create a `company_roster_medics` table as a proper junction with role-based data (qualifications, availability, status tracking). Use a database trigger to enforce roster membership when quotes reference named medics. Store company profile display fields as denormalized columns on `marketplace_companies` (roster_size, insurance_status, average_rating from Phase 36 trigger). Implement an availability management system via a calendar model or simple date-range blocking.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostgreSQL) | Existing | Roster tables, RLS, triggers, EXCLUSION constraints | Already the platform DB; all marketplace tables follow this pattern |
| `@supabase/supabase-js` | 2.95.3+ (existing) | Client-side roster queries, profile fetching | Already used for marketplace operations |
| `@supabase/ssr` | 0.8.0+ (existing) | Server-side auth in API routes | Already in use for marketplace routes |
| `zustand` | 5.0.11+ (existing) | Company roster management form state | Already used for marketplace forms (registration, quotes) |
| Zod | 3.x+ (existing) | Roster medic validation (add/remove/update) | Already used for marketplace validation |
| React Query | 5.x+ (existing) | Server-side roster queries, company profile fetching | Already used for marketplace data |
| `date-fns` | 4.1.0+ (existing) | Availability calendar date handling | Already in project for scheduling |
| Lucide React | 0.564.0+ (existing) | Icons for roster UI (add, remove, unavailable) | Already in project for UI |
| Resend | 6.9.2+ (existing) | Email notifications for medic invitations, removal, availability changes | Already in project for marketplace notifications |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-day-picker` | 9.13.2+ (existing) | Calendar picker for availability blocking | Already in project for date selections |
| `@tanstack/react-table` | 8.x+ (existing) | Roster medics list with sorting/filtering | Already in project for tables |
| `sonner` | 2.0.7+ (existing) | Toast notifications for roster operations | Already in project for user feedback |

### No New Packages Required

All libraries for roster management are already installed. Phase 37 reuses patterns from marketplace registration (Zustand), marketplace quotes (Zod validation, React Query), and internal messaging (email via Resend).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit `company_roster_medics` junction table | Nested JSONB array on marketplace_companies | JSONB requires manual updates on roster changes; explicit table allows RLS, triggers, indexes, and atomicity |
| Database trigger for roster membership enforcement | Application-level validation in API route | Database trigger is atomic; app-level validation can be bypassed if rules aren't enforced everywhere |
| Calendar availability model | Boolean availability flag per medic | Calendar allows granular date/time blocking; boolean is too coarse for "unavailable 15-21 March" scenarios common in event staffing |
| Medic invitations (email) | Direct manual add only | Invitations reduce data entry errors and create audit trail of acceptance; context specifies "both invitation and manual add" |

## Architecture Patterns

### Recommended Project Structure

```
supabase/migrations/
  155_company_roster_medics.sql          # Junction table, RLS, indexes
  156_company_profile_aggregation.sql    # Triggers to denormalize roster_size, insurance_status

supabase/functions/
  medic-availability/                   # Calendar-based availability checking
    index.ts

web/lib/
  marketplace/
    roster-types.ts                     # TypeScript types for roster operations
    roster-schemas.ts                   # Zod schemas for roster add/remove/update
    company-profile.ts                  # Company profile aggregation helpers
    medic-availability.ts               # Calendar logic for availability checking
  queries/
    marketplace/
      roster.ts                         # React Query hooks for roster operations

web/stores/
  useCompanyRosterStore.ts              # Zustand store for roster admin UI

web/app/
  marketplace/
    company/
      [id]/
        profile/
          page.tsx                      # Public company profile with "Meet the Team"
        roster/
          page.tsx                      # Roster management (admin only)
          components/
            RosterList.tsx
            AddMedicModal.tsx
            MedicAvailabilityModal.tsx
  api/
    marketplace/
      roster/
        add/route.ts                    # POST add medic to roster
        remove/route.ts                 # DELETE remove medic from roster
        update/route.ts                 # PATCH update medic availability/qualifications
        [medic_id]/
          availability/route.ts         # GET/POST availability calendar
      company/
        [id]/
          profile/route.ts              # GET company profile with aggregations

web/components/
  marketplace/
    roster/
      CompanyProfile.tsx                # "Meet the Team" section
      RosterMedicCard.tsx               # Individual medic card in roster
      RosterManagement.tsx              # Admin roster admin UI
```

### Pattern 1: Company Roster Junction Table with RLS

**What:** A `company_roster_medics` junction table tracks many-to-many relationship between companies and medics with per-medic metadata (status, availability, qualifications override).

**When to use:** Any operation involving roster membership, medic assignment, or availability.

**Key insight:** Uses user_id-based RLS (matching marketplace pattern) to allow medics to view/manage their roster memberships across multiple companies. Companies see their own roster. Platform admin sees all.

```sql
-- Source: Existing medic_commitments + marketplace_companies patterns

CREATE TABLE company_roster_medics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Medic status in this roster
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending',        -- Invitation sent, waiting for acceptance
    'active',         -- Accepted and working with company
    'inactive',       -- Formerly active, left company or removed
    'suspended'       -- Temporarily unavailable
  )),

  -- Company-specific overrides
  -- If NULL, use values from medics table
  title TEXT,                    -- e.g., "Senior Paramedic", "Lead EMT"
  hourly_rate DECIMAL(10,2),     -- Company-specific rate if different from medic standard

  -- Qualifications and certifications valid for this company
  -- If NULL, inherit all qualifications from medics.certifications
  qualifications TEXT[],         -- e.g., ARRAY['paramedic', 'confined_space', 'trauma']

  -- Availability and capacity
  available BOOLEAN DEFAULT TRUE,
  unavailable_reason TEXT,
  unavailable_from DATE,
  unavailable_until DATE,

  -- Metadata
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,           -- When medic left or was removed

  -- Audit
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: unique per company per medic
  UNIQUE(company_id, medic_id)
);

COMMENT ON TABLE company_roster_medics IS 'Junction table: medics belonging to a company roster with per-company qualifications and availability';
```

### Pattern 2: Roster Membership Validation on Quote Submission

**What:** When a quote references named medics, validate that each medic_id exists in the company's roster and is in 'active' status.

**When to use:** Quote submission, quote update, and quote review.

**Trigger approach:** Database trigger on marketplace_quotes INSERT/UPDATE checks staffing_plan.named_medics against company_roster_medics.

```sql
-- Source: Existing quote validation pattern

CREATE OR REPLACE FUNCTION validate_quote_roster_membership()
RETURNS TRIGGER AS $$
DECLARE
  named_medic JSONB;
  medic_id UUID;
  roster_count INT;
BEGIN
  -- Only validate if staffing_plan type is 'named_medics'
  IF NEW.staffing_plan->>'type' = 'named_medics' THEN
    -- For each named medic in the staffing plan
    FOR named_medic IN SELECT * FROM jsonb_array_elements(NEW.staffing_plan->'named_medics')
    LOOP
      medic_id := (named_medic->>'medic_id')::UUID;

      -- Check if medic is in the company's active roster
      SELECT COUNT(*) INTO roster_count
      FROM company_roster_medics
      WHERE company_id = NEW.company_id
        AND medic_id = medic_id
        AND status = 'active';

      IF roster_count = 0 THEN
        RAISE EXCEPTION 'Medic % is not in company % active roster', medic_id, NEW.company_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_quote_roster_membership
  BEFORE INSERT OR UPDATE ON marketplace_quotes
  FOR EACH ROW EXECUTE FUNCTION validate_quote_roster_membership();
```

### Pattern 3: Company Profile Denormalization via Trigger

**What:** Trigger on marketplace_ratings INSERT/UPDATE/DELETE and company_roster_medics updates recalculates roster_size, average_rating, and insurance_status on marketplace_companies.

**When to use:** Company profile display to pre-calculate expensive aggregations.

**Key insight:** Matches Phase 36 pattern where company_rating is denormalized on marketplace_companies.

```sql
-- Source: Phase 36 ratings trigger pattern

CREATE OR REPLACE FUNCTION update_company_profile_aggregations()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_roster_size INT;
  v_avg_rating DECIMAL(3,2);
  v_review_count INT;
  v_insurance_status TEXT;
BEGIN
  -- Determine which company to update
  IF TG_TABLE_NAME = 'company_roster_medics' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'job_ratings' THEN
    -- ratings reference event_id, need to find company from quote
    SELECT company_id INTO v_company_id
    FROM marketplace_quotes
    WHERE event_id = NEW.job_id
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  -- Recalculate roster size
  SELECT COUNT(*) INTO v_roster_size
  FROM company_roster_medics
  WHERE company_id = v_company_id AND status = 'active';

  -- Recalculate average rating (from Phase 36)
  SELECT ROUND(AVG(rating)::NUMERIC, 2), COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM job_ratings
  WHERE job_id IN (
    SELECT event_id FROM marketplace_quotes
    WHERE company_id = v_company_id
  ) AND moderation_status = 'published';

  -- Check insurance status (compliance_documents expiry)
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'unverified'
    WHEN COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) > 0 THEN 'expired'
    ELSE 'verified'
  END INTO v_insurance_status
  FROM compliance_documents
  WHERE company_id = v_company_id
    AND document_type IN (
      'public_liability_insurance',
      'employers_liability_insurance',
      'professional_indemnity_insurance'
    );

  -- Update marketplace_companies with aggregations
  UPDATE marketplace_companies SET
    roster_size = COALESCE(v_roster_size, 0),
    average_rating = COALESCE(v_avg_rating, 0),
    review_count = COALESCE(v_review_count, 0),
    insurance_status = COALESCE(v_insurance_status, 'unverified'),
    updated_at = NOW()
  WHERE id = v_company_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_aggregations_on_roster_change
  AFTER INSERT OR UPDATE OR DELETE ON company_roster_medics
  FOR EACH ROW EXECUTE FUNCTION update_company_profile_aggregations();
```

### Pattern 4: Roster Management Store with Zustand

**What:** Centralized state for company admin's roster operations (add, remove, update, filter, paginate).

**When to use:** Roster management page with add/remove/update modals.

**Source:** Matches useMarketplaceRegistrationStore pattern from Phase 32.

```typescript
// Source: Existing Zustand store pattern

// web/stores/useCompanyRosterStore.ts
import { create } from 'zustand';
import type { CompanyRosterMedic } from '@/lib/marketplace/roster-types';

interface CompanyRosterState {
  companyId: string;
  roster: CompanyRosterMedic[];
  isLoading: boolean;
  error: string | null;
  selectedMedicId: string | null;

  // Filters
  statusFilter: 'all' | 'active' | 'pending' | 'inactive';
  searchTerm: string;

  // Modals
  addModalOpen: boolean;
  availabilityModalOpen: boolean;

  // Actions
  setCompanyId: (id: string) => void;
  setRoster: (roster: CompanyRosterMedic[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setStatusFilter: (filter: typeof statusFilter) => void;
  setSearchTerm: (term: string) => void;

  openAddModal: () => void;
  closeAddModal: () => void;
  openAvailabilityModal: (medicId: string) => void;
  closeAvailabilityModal: () => void;

  addMedic: (medic: CompanyRosterMedic) => void;
  removeMedic: (medicId: string) => void;
  updateMedic: (medicId: string, updates: Partial<CompanyRosterMedic>) => void;

  reset: () => void;
}

export const useCompanyRosterStore = create<CompanyRosterState>((set, get) => ({
  companyId: '',
  roster: [],
  isLoading: false,
  error: null,
  selectedMedicId: null,
  statusFilter: 'active',
  searchTerm: '',
  addModalOpen: false,
  availabilityModalOpen: false,

  setCompanyId: (id) => set({ companyId: id }),
  setRoster: (roster) => set({ roster }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),

  openAddModal: () => set({ addModalOpen: true }),
  closeAddModal: () => set({ addModalOpen: false }),
  openAvailabilityModal: (medicId) => set({
    selectedMedicId: medicId,
    availabilityModalOpen: true
  }),
  closeAvailabilityModal: () => set({
    selectedMedicId: null,
    availabilityModalOpen: false
  }),

  addMedic: (medic) => set((state) => ({
    roster: [...state.roster, medic]
  })),

  removeMedic: (medicId) => set((state) => ({
    roster: state.roster.filter((m) => m.medic_id !== medicId)
  })),

  updateMedic: (medicId, updates) => set((state) => ({
    roster: state.roster.map((m) =>
      m.medic_id === medicId ? { ...m, ...updates } : m
    )
  })),

  reset: () => set({
    companyId: '',
    roster: [],
    isLoading: false,
    error: null,
    selectedMedicId: null,
    statusFilter: 'active',
    searchTerm: '',
    addModalOpen: false,
    availabilityModalOpen: false,
  }),
}));
```

### Pattern 5: Medic Availability Calendar Model

**What:** Tracks date ranges when a medic is unavailable for a specific company (e.g., "unavailable 15-21 March for site shutdown").

**When to use:** Roster availability management and capacity planning.

**Key insight:** Complementary to the simple available/unavailable_until fields — calendar allows fine-grained blocking.

```typescript
// Source: date-fns + event-posting availability patterns

// web/lib/marketplace/medic-availability.ts
import { eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';

interface AvailabilityBlock {
  medicId: string;
  companyId: string;
  fromDate: string;  // ISO date
  toDate: string;    // ISO date
  reason?: string;   // e.g., "Training", "Sick leave", "On assignment elsewhere"
  createdAt: string;
}

/**
 * Check if a medic is available on a specific date
 */
export function isMedicAvailableOnDate(
  medicId: string,
  date: string,  // ISO date
  blocks: AvailabilityBlock[]
): boolean {
  const target = parseISO(date);

  for (const block of blocks) {
    if (block.medicId === medicId) {
      if (isWithinInterval(target, {
        start: parseISO(block.fromDate),
        end: parseISO(block.toDate)
      })) {
        return false;  // Blocked
      }
    }
  }

  return true;  // Available
}

/**
 * Get available medics for an event date/time
 * Filters roster by availability blocks + event_date + time_range
 */
export function getAvailableRosterMedicsForEvent(
  rosterMedics: CompanyRosterMedic[],
  availabilityBlocks: AvailabilityBlock[],
  eventDate: string,
  qualification?: string
): CompanyRosterMedic[] {
  return rosterMedics.filter((medic) => {
    // Check if medic is active in roster
    if (medic.status !== 'active') return false;

    // Check if medic is available on event date
    if (!isMedicAvailableOnDate(medic.medic_id, eventDate, availabilityBlocks)) {
      return false;
    }

    // Check qualifications if required
    if (qualification) {
      const quals = medic.qualifications || [];
      if (!quals.includes(qualification)) return false;
    }

    return true;
  });
}
```

### Pattern 6: Company Profile Public Display

**What:** API endpoint and React component to display company profile with roster overview, insurance status, ratings, and team section.

**When to use:** Public company profile page (marketplace company details) and client quote detail view.

**Key insight:** Non-admin users see a limited roster preview (first 3-5 medics with names masked per Phase 34 anonymization rules). Full roster visible only on company's own admin page.

```typescript
// Source: marketplace_companies pattern + quote-anonymizer pattern

// web/lib/marketplace/company-profile.ts
interface CompanyProfileDisplay {
  id: string;
  company_name: string;
  company_description: string;
  coverage_areas: string[];

  // Aggregations (from marketplace_companies denormalized fields)
  roster_size: number;
  average_rating: number;
  review_count: number;
  insurance_status: 'verified' | 'expired' | 'unverified';

  // Profile display
  created_at: string;
  verification_badge: boolean;

  // Team preview (limited roster)
  team_preview: Array<{
    name: string;
    qualification: string;
    maskedName?: string;  // For anonymization
  }>;
}

export async function getCompanyProfile(
  companyId: string,
  isAdmin: boolean = false
): Promise<CompanyProfileDisplay> {
  // Fetch from marketplace_companies + company_roster_medics (limited)
  // If isAdmin, show full roster; else show preview
}
```

### Anti-Patterns to Avoid

- **Storing full roster as JSONB array on marketplace_companies:** Makes roster updates non-atomic and prevents RLS per medic. Use explicit table instead.
- **Boolean availability flag without dates:** "Available: false" is too coarse. Use date ranges to support "unavailable 15-21 March, but available again 22+".
- **Medic removal deletes roster history:** When removing a medic, set status='inactive' and left_at timestamp. Do NOT delete the row; preserves audit trail and prevents referential integrity issues on quotes.
- **Company can assign any medic to quotes:** Validate roster membership at quote submission time with database trigger. Do not rely on application-level validation alone.
- **Profile fields (roster_size, insurance_status) not denormalized:** Aggregating these on each API call is expensive. Use triggers to keep marketplace_companies columns in sync, then read once.
- **Invitations sent as plain text email with direct link:** Use signed tokens (JWT or time-limited UUID) to accept invitations. Store invitation_sent_at and invitation_accepted_at for audit.
- **Multi-company medic capacity not surfaced:** When assigning medics, show a warning if medic has overlapping commitments with other companies. Context specifies "available/unavailable only" but dashboard should warn of cross-company conflicts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Medic-company relationship tracking | Manual JSONB array with custom sync logic | Explicit `company_roster_medics` table with RLS, triggers, indexes | Table allows atomic updates, role-based access control, efficient queries |
| Roster membership validation on quotes | Application-level medic ID checking before insert | Database trigger `validate_quote_roster_membership()` | Trigger is atomic; can't be bypassed by rogue API calls or concurrent operations |
| Availability calendar management | Custom date-range overlap logic | date-fns `isWithinInterval()` + utility functions | Tested library, handles edge cases (leap years, time zones), easier to maintain |
| Company profile aggregation (roster_size, average_rating, insurance_status) | Calculate on each API request | Denormalized columns updated by trigger on roster/ratings/documents changes | Single table fetch; O(1) not O(n) |
| Medic invitation workflow | Direct assignment or manual email | Signed tokens (invite links) + invitation_sent_at + invitation_accepted_at tracking | Audit trail, reduces manual errors, medics control their roster membership |
| Roster list filtering/sorting (by status, qualification, availability) | Custom filter loops in JavaScript | Database-side filtering + React Query with queryKey variations | Server-side filtering is faster; React Query caches variants; pagination works correctly |
| Multi-company availability conflict detection | Warn only when submitting quotes | Show conflicts in assignment UI before submission (via medic_commitments table join) | Improves UX; prevents late-stage rejections |

**Key insight:** The roster is the foundation for Phase 37 success. If roster membership is not properly enforced (via triggers + RLS), companies can name medics they don't actually employ, breaking trust in the marketplace.

## Common Pitfalls

### Pitfall 1: Roster Membership Not Enforced on Quote Submission

**What goes wrong:** Company submits a quote with named medics; some medics are not in the company's roster or are inactive. Quote is accepted. Client awards the quote. Company cannot fulfill with stated medics.

**Why it happens:** Roster validation is only in the UI (Zustand store form validation). No database trigger to reject invalid medic_ids.

**How to avoid:** Create a trigger on marketplace_quotes INSERT/UPDATE that queries company_roster_medics for each named medic. If any medic is missing or status != 'active', RAISE EXCEPTION. This makes roster enforcement atomic.

**Warning signs:** Quote submitted with medics; roster admin removes those medics before event; quote still shows them; client is confused. Check trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'check_quote_roster%'`.

### Pitfall 2: Medic Removed from Roster but Still Appears in Historical Quotes

**What goes wrong:** Medic Alice was in roster, company quoted her on event X. Later, medic leaves company and status set to 'inactive'. Viewing historical quotes shows medic as "unavailable"/"inactive". Confusing.

**Why it happens:** Quote references medic by ID; admin views quote and looks up current roster status (which is now 'inactive').

**How to avoid:** When displaying a quote, show medic's historical status at time of quote submission, not current status. Either store medic snapshot in quote's staffing_plan JSONB (name + qualification + company status at quote time) or denormalize status at quote submission time. Do NOT look up current roster_medics status in quote detail view.

**Warning signs:** Quote displays "Alice (Unavailable)" even though quote was submitted when Alice was active. Store the medic's status/name/qualification in the staffing_plan JSONB snapshot at quote time.

### Pitfall 3: Availability Calendar Not Synced with Event Bookings

**What goes wrong:** Medic marked unavailable 15-21 March in company's roster calendar. But on 18 March, company wins a marketplace event and assigns the medic. Medic double-booked.

**Why it happens:** company_roster_medics.unavailable_* fields are not compared to medic_commitments table. Assignment logic ignores double-booking risk.

**How to avoid:** When assigning medics to won quotes, check both:
1. company_roster_medics.available && unavailable_until < event_date
2. No rows in medic_commitments where medic_id = medic_id AND time_range overlaps event_date/time
Use the EXCLUSION constraint on medic_commitments to guarantee no overlaps.

**Warning signs:** Medic has two assignments on same day. Check medic_commitments.time_range overlaps with EXCLUDE USING GIST.

### Pitfall 4: Company Profile Aggregations Not Updated When Documents Expire

**What goes wrong:** Company has valid insurance, average_rating = 4.5, roster_size = 5. Insurance expires tomorrow. Profile still shows "insurance verified" until admin manually checks.

**Why it happens:** Trigger on compliance_documents expiry doesn't update marketplace_companies.insurance_status.

**How to avoid:** Daily cron job (from Phase 32) marks insurance_status = 'expired' when expiry_date <= TODAY. Also, create a trigger on compliance_documents UPDATE that recalculates insurance_status when expiry_date changes. For real-time updates, call `update_company_profile_aggregations()` trigger on both roster and document changes.

**Warning signs:** Expired insurance certificate still shows as "verified" on profile. Check: `SELECT insurance_status FROM marketplace_companies WHERE company_id = X` vs actual expiry dates in compliance_documents.

### Pitfall 5: Medic Invited but Invitation Never Expires or Gets Resent

**What goes wrong:** Company invites medic alice@example.com. Email goes to spam. Medic never accepts. Profile shows "pending" forever. Company has no way to resend or cancel invitation.

**Why it happens:** Invitation workflow incomplete: no expiry, no resend mechanism, no cleanup.

**How to avoid:**
1. Create invitation_sent_at timestamp on company_roster_medics.
2. Add invitation_expires_at = invitation_sent_at + 7 days.
3. Provide "Resend invitation" button in roster admin UI.
4. Mark invitations as "expired" if not accepted in 7 days (status = 'expired' or new status field).
5. Create cleanup cron job to remove expired invitations after 30 days.

**Warning signs:** Roster shows medic status="pending" with sent date from 6 months ago. Add invitation_expires_at check.

### Pitfall 6: Roster Size Denormalization Gets Out of Sync

**What goes wrong:** marketplace_companies.roster_size = 5. Query company_roster_medics WHERE status='active' returns 4 rows. Company profile shows wrong size.

**Why it happens:** Trigger to update marketplace_companies.roster_size failed silently (trigger error handling too permissive) or was not created.

**How to avoid:** Use explicit trigger function update_company_profile_aggregations() that runs on every company_roster_medics INSERT/UPDATE/DELETE. Log any trigger errors to a monitoring table. Add a periodic reconciliation job that recalculates all aggregations nightly and alerts on mismatches.

**Warning signs:** roster_size doesn't match COUNT(*) on company_roster_medics. Check trigger logs: `SELECT * FROM trigger_error_log WHERE table_name = 'company_roster_medics'`.

### Pitfall 7: Multi-Company Medic Assignment Not Warned

**What goes wrong:** Medic Bob is on two company rosters (freelance). Company A assigns Bob to event on 15 March. Company B also assigns Bob to event on 15 March (time overlaps). Both quotes awarded. Bob cannot fulfill both.

**Why it happens:** Assignment logic only checks company_roster_medics availability, not medic_commitments overlaps across companies.

**How to avoid:** When assigning medic to won quote:
1. Check medic_commitments EXCLUSION constraint — will reject double-booking at database level.
2. In assignment UI, show warning: "Bob is assigned to 2 other events this week. This may cause scheduling conflicts."
3. Log all cross-company assignments for compliance audit.

**Warning signs:** Medic assigned to multiple events on same day. Check medic_commitments table for overlapping time_ranges. Database EXCLUSION constraint should prevent insert; if not, constraint is missing.

### Pitfall 8: Company Profile Display Leaks Private Medic Info

**What goes wrong:** Public company profile shows full roster with medic addresses, employment status, certifications expiry dates. Medic privacy violation.

**Why it happens:** query fetches all columns from company_roster_medics without filtering for display.

**How to avoid:** Explicitly select only public fields for profile display:
```sql
SELECT medic_id, qualifications, title
FROM company_roster_medics
WHERE company_id = X AND status = 'active'
LIMIT 5  -- Show preview only
```
Never SELECT name, email, phone, employment_status, or certification details for public profile. If client needs full medic bio, that goes in a separate table (medic_public_profile) with explicit RLS for professional bios.

**Warning signs:** Inspect company profile HTML; see medic phone numbers or DBS dates. Review API response fields for company_roster_medics; should be minimal subset.

### Pitfall 9: Invitation Token Not Validated on Acceptance

**What goes wrong:** Company sends invite to alice@example.com. Alice receives email with acceptance link. Eve intercepts link, changes medic_id in URL to bob_id. Eve accepts invitation on behalf of Bob.

**Why it happens:** Acceptance endpoint doesn't validate token or signs token with predictable data.

**How to avoid:** Create invitation tokens as signed JWTs:
```typescript
const token = jwt.sign(
  { company_id, medic_id, invited_email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```
In acceptance endpoint, verify token before updating roster. Also check that current user's email matches invited_email in token.

**Warning signs:** Acceptance endpoint takes ?token=X but doesn't validate; anyone can accept any invitation with modified medic_id.

### Pitfall 10: Availability Changes Don't Update "Meet the Team" Section

**What goes wrong:** Medic marked unavailable 15-21 March. Company profile still shows medic in "Meet the Team" with no indication of temporary unavailability. Client thinks medic is available for March event.

**Why it happens:** Team preview component shows all active roster medics without checking availability windows.

**How to avoid:** When rendering team preview, include availability status:
```typescript
team_preview: medics.map((m) => ({
  name: m.name,
  qualification: m.qualification,
  available: !isWithinUnavailableWindow(m.unavailable_from, m.unavailable_until),
}))
```
In UI, show a "temporarily unavailable" badge next to medic name if unavailable_until > TODAY.

**Warning signs:** Team preview shows all medics as "available" even if some are marked unavailable. Add badge logic to RosterMedicCard component.

## Code Examples

### Add Medic to Roster (Invitation Flow)

```typescript
// Source: Existing email invitation pattern + roster pattern

// web/app/api/marketplace/roster/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { roasterAddSchema } from '@/lib/marketplace/roster-schemas';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Validate input
  const validation = roasterAddSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { companyId, inviteEmail, medicId } = validation.data;

  // Check user owns this company
  const { data: company, error: companyError } = await supabase
    .from('marketplace_companies')
    .select('id, admin_user_id')
    .eq('id', companyId)
    .single();

  if (companyError || company.admin_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If medicId provided, add directly (manual add)
  if (medicId) {
    const { error: addError } = await supabase
      .from('company_roster_medics')
      .insert({
        company_id: companyId,
        medic_id: medicId,
        status: 'active',  // Direct add = active immediately
        added_by: user.id,
        joined_at: new Date().toISOString(),
      });

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medic added to roster'
    });
  }

  // If inviteEmail provided, create invitation
  if (inviteEmail) {
    // Generate signed invitation token
    const invitationToken = jwt.sign(
      {
        company_id: companyId,
        invited_email: inviteEmail,
        invited_at: Date.now()
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Create pending roster entry
    const { data: rosterEntry, error: insertError } = await supabase
      .from('company_roster_medics')
      .insert({
        company_id: companyId,
        medic_id: crypto.randomUUID(),  // Placeholder until acceptance
        status: 'pending',
        added_by: user.id,
        invitation_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Send invitation email
    try {
      await resend.emails.send({
        from: 'SiteMedic Roster <roster@sitemedic.co.uk>',
        to: inviteEmail,
        subject: `${company.company_name} invited you to join their roster`,
        html: `
          <p>Hi,</p>
          <p>${company.company_name} has invited you to join their medic roster on SiteMedic.</p>
          <a href="${process.env.SITE_URL}/marketplace/roster/accept?token=${invitationToken}">
            Accept Invitation
          </a>
          <p>This invitation expires in 7 days.</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue anyway; medic can accept later
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent'
    });
  }

  return NextResponse.json({ error: 'Missing medicId or inviteEmail' }, { status: 400 });
}
```

### Company Profile Display Component

```typescript
// Source: Marketplace quote display pattern + aggregation pattern

// web/components/marketplace/roster/CompanyProfile.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface CompanyProfileProps {
  companyId: string;
}

export default function CompanyProfile({ companyId }: CompanyProfileProps) {
  const { user } = useAuth();
  const isAdmin = user?.id === companyId;  // Simplified; check real admin status

  const { data: company, isLoading } = useQuery({
    queryKey: ['company-profile', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/company/${companyId}/profile`);
      if (!res.ok) throw new Error('Failed to fetch company profile');
      return res.json();
    },
  });

  const { data: teamPreview } = useQuery({
    queryKey: ['team-preview', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/roster?companyId=${companyId}&limit=5`);
      if (!res.ok) throw new Error('Failed to fetch team');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!company) return <div>Company not found</div>;

  const insuranceColor = {
    verified: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    unverified: 'bg-gray-100 text-gray-800',
  }[company.insurance_status];

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {company.company_name}
            {company.verification_badge && (
              <Badge variant="outline" className="ml-2">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{company.company_description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Team Size</p>
              <p className="text-2xl font-bold">{company.roster_size}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Rating</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400" />
                <span className="text-2xl font-bold">
                  {company.average_rating.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-gray-500">({company.review_count})</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Insurance</p>
              <Badge className={insuranceColor}>
                {company.insurance_status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Coverage</p>
              <p className="text-sm">{company.coverage_areas.join(', ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meet the Team Preview */}
      {teamPreview && teamPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meet the Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teamPreview.map((medic) => (
                <div key={medic.medic_id} className="border rounded p-4">
                  <div className="font-medium">{medic.name}</div>
                  <div className="text-sm text-gray-600">{medic.qualification}</div>
                  {medic.available === false && (
                    <Badge variant="outline" className="mt-2">
                      Temporarily unavailable
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Roster Availability Calendar Modal

```typescript
// Source: date-fns calendar pattern + event posting modal pattern

// web/components/marketplace/roster/MedicAvailabilityModal.tsx
'use client';

import { useState } from 'react';
import { useCompanyRosterStore } from '@/stores/useCompanyRosterStore';
import { formatISO, parseISO } from 'date-fns';
import DayPicker from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function MedicAvailabilityModal() {
  const {
    selectedMedicId,
    availabilityModalOpen,
    closeAvailabilityModal,
    roster
  } = useCompanyRosterStore();

  const [unavailableFrom, setUnavailableFrom] = useState<Date | undefined>();
  const [unavailableTo, setUnavailableTo] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const medic = roster.find((m) => m.medic_id === selectedMedicId);

  const handleSubmit = async () => {
    if (!unavailableFrom || !unavailableTo) {
      toast.error('Please select date range');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/roster/${selectedMedicId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unavailable_from: formatISO(unavailableFrom, { representation: 'date' }),
          unavailable_until: formatISO(unavailableTo, { representation: 'date' }),
          unavailable_reason: reason,
        }),
      });

      if (!res.ok) throw new Error('Failed to update availability');

      toast.success('Availability updated');
      closeAvailabilityModal();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={availabilityModalOpen} onOpenChange={closeAvailabilityModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Availability for {medic?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Unavailable from</label>
            <DayPicker
              mode="single"
              selected={unavailableFrom}
              onSelect={setUnavailableFrom}
              disabled={(date) => date < new Date()}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Unavailable until</label>
            <DayPicker
              mode="single"
              selected={unavailableTo}
              onSelect={setUnavailableTo}
              disabled={(date) => date < (unavailableFrom || new Date())}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              placeholder="e.g., Training, Sick leave, On assignment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Updating...' : 'Update Availability'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single company with static medic list (hardcoded in org) | Many-to-many roster with per-company medic metadata | Phase 37 (SiteMedic marketplace) | Allows freelance medics across multiple companies |
| Boolean `available` flag | Date-range availability blocks (unavailable_from / unavailable_until) | Phase 37 (marketplace event scheduling) | Supports granular "unavailable 15-21 March" use case |
| Medic details from medics table | Snapshot stored in quote's staffing_plan.named_medics at quote submission time | Phase 37 (roster stability) | Historical quotes show medic status at quote time, not current status |
| Manual profile aggregation in queries | Denormalized columns (roster_size, average_rating, insurance_status) updated by trigger | Phase 37 (performance) | O(1) profile fetch instead of O(n) joins |
| Medic direct assignment | Invitation workflow with email + signed tokens + acceptance tracking | Phase 37 (medic control) | Medics control own roster membership; audit trail of invitations |
| No multi-company conflict detection | Warnings in UI + medic_commitments EXCLUSION constraint | Phase 37 (risk mitigation) | Prevents double-booking across company boundaries |

**Deprecated/outdated:**
- Storing medic qualifications only on medics table: Phase 37 allows per-company qualification overrides (e.g., "Alice is paramedic globally, but only EMT for Company B")
- Manually updating medic counts on companies: Phase 37 uses database trigger to keep roster_size in sync

## Open Questions

1. **Should invitations be linked to existing SiteMedic accounts or emails?**
   - What we know: CONTEXT specifies "invite existing SiteMedic users by email OR manually add medics who aren't on the platform"
   - What's unclear: Should the email match the medic's registered email in auth.users? Or can a medic be invited to an email that becomes their SiteMedic account?
   - Recommendation: Accept either: (a) invite by existing medic user_id (if medic already has SiteMedic account) or (b) invite by email (if new to platform, onboarding later). Store invitation_email separately from medic_id to allow both flows.

2. **How deep should company-specific qualification overrides go?**
   - What we know: Some medics may have certifications valid in one company but not another (liability, insurance specifics)
   - What's unclear: Should overrides include expiry dates per company? Or just a boolean "has_qualification"?
   - Recommendation: Store as TEXT[] (e.g., ARRAY['paramedic', 'confined_space']) for Phase 37. If per-company expiry dates are needed, that's Phase 38+ enhancement.

3. **Should medic availability calendar be stored in database or calculated from medic_commitments?**
   - What we know: Medics can be unavailable for various reasons (training, sick leave, another assignment)
   - What's unclear: Should company_roster_medics track "unavailable_from/until" separately, or derive from medic_commitments overlaps?
   - Recommendation: Use separate unavailable_from/until columns on company_roster_medics for admin-declared unavailability (training, leave). Use medic_commitments for committed events. Both must be checked when assigning.

4. **When a medic leaves a company, should their quotes be marked "fulfilled by alternate" or "pending reassignment"?**
   - What we know: If medic Alice leaves Company A, any awarded quotes with Alice should be handled gracefully
   - What's unclear: Should Alice's removal trigger a notification to the company? Auto-reassign to equally-qualified medic? Or require manual reassignment?
   - Recommendation: On medic removal, set status='inactive' and left_at timestamp. Trigger sends email to company admin: "Medic Alice left your roster. Review 2 active quotes naming her; assign replacements before event date." Manual reassignment recommended (respects medic choice + company judgment).

5. **Should roster_size include only 'active' medics or all non-removed statuses?**
   - What we know: roster_size displayed on company profile
   - What's unclear: Should inactive/pending/suspended medics count toward roster_size?
   - Recommendation: roster_size = COUNT(*) WHERE status = 'active'. This is the "working team size" visible to clients. Pending/inactive are internal admin metrics.

## Sources

### Primary (HIGH confidence)

- **Codebase:** `supabase/migrations/140_marketplace_foundation.sql` — marketplace_companies table with CQC integration
- **Codebase:** `supabase/migrations/146_marketplace_quotes.sql` — staffing_plan JSONB structure (named_medics vs headcount_and_quals)
- **Codebase:** `supabase/migrations/148_job_ratings.sql` — ratings table with company aggregation
- **Codebase:** `supabase/migrations/149_marketplace_award_payment.sql` — booking bridge pattern for marketplace events
- **Codebase:** `supabase/migrations/002_business_operations.sql` — medics table structure (qualifications, certifications, employment_status)
- **Codebase:** `web/stores/useMarketplaceRegistrationStore.ts` — Zustand store pattern for marketplace forms
- **Codebase:** `web/lib/marketplace/quote-types.ts` — StaffingPlanItem, namedMedic structures
- **Codebase:** `web/lib/email/resend.ts` — Email notification pattern
- **Codebase:** `web/lib/queries/marketplace/quotes.ts` — React Query hook pattern for marketplace data
- **Codebase:** Phase 32 RESEARCH.md — marketplace table RLS patterns (auth.uid() not get_user_org_id())
- **Codebase:** Phase 34 RESEARCH.md — quote validation and staffing plan discrimination patterns
- **Codebase:** Phase 36 RESEARCH.md — company rating aggregation via trigger
- **CONTEXT.md Phase 37** — Multi-company membership, roster onboarding (invitation + manual), substitution policy, profile display

### Secondary (MEDIUM confidence)

- **WebSearch:** "PostgreSQL junction table best practices" — Confirmed many-to-many pattern for medic-company relationship
- **WebSearch:** "Freelance marketplace multi-company assignment patterns" — Confirmed model matches Upwork (freelancer on multiple agency rosters)
- **WebSearch:** "Availability calendar database design" — Date-range model confirmed as standard for scheduling systems

### Tertiary (LOW confidence)

- Invitation token implementation details (JWT vs signed UUID) — Recommended based on security best practices; SiteMedic may have existing token pattern to follow

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Roster table structure (company_roster_medics junction) | HIGH | Direct extension of existing medics + marketplace_companies pattern; confirmed in Phase 34 named_medics schema |
| Named medic validation on quotes | HIGH | Trigger pattern verified in Phase 34 RESEARCH; matches database-level validation approach used in Phase 32 |
| Company profile aggregation (denormalized columns + trigger) | HIGH | Directly mirrors Phase 36 ratings aggregation trigger pattern already implemented |
| Zustand store for roster management | HIGH | Established pattern from Phase 32 registration + Phase 34 quotes |
| Availability calendar model | MEDIUM | date-fns pattern confirmed; but SiteMedic may use different scheduling lib; recommend reviewing existing event posting code |
| Medic invitation workflow | MEDIUM | Email + token pattern standard; Resend integration confirmed; but JWT vs other token type TBD |
| Multi-company conflict detection | MEDIUM | EXCLUSION constraint on medic_commitments exists; logic confirmed; but cross-company warning UI not yet prototyped |

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — roster patterns are stable; invitation/availability design may evolve with user feedback)

## Next Phase Considerations

- **Phase 38:** Roster substitution workflow (medic unavailable after quote awarded; auto-assign alternate)
- **Phase 39:** Medic portfolio (display past events, ratings, photos on public profile)
- **Phase 40:** Capacity planning dashboard (show available medics per role per date)
- **Phase 41:** Bulk roster import (CSV upload for companies with 20+ medics)
