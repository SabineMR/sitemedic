# Technology Stack — Multi-Vertical Expansion

**Milestone:** SiteMedic v2.0 multi-vertical support (Film/TV, Festivals, Motorsport, Football/Sports)
**Researched:** 2026-02-17
**Mode:** Subsequent milestone — existing stack validated. Focus is ONLY on multi-vertical addition patterns.
**Overall confidence:** HIGH (based on existing codebase audit + multi-vertical SaaS pattern research)

---

## What Is Already Built (Do Not Re-Research)

The core stack is validated and in production:

| Concern | Solution |
|---------|----------|
| Mobile app | React Native + Expo SDK 54 |
| Offline storage | WatermelonDB on SQLite |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Web dashboard | Next.js 15 + shadcn/ui + TanStack Query |
| PDF generation | @react-pdf/renderer 4.3.2 in Supabase Edge Functions |
| Payments | Stripe Connect |

This research answers five specific questions about extending that stack for multi-vertical support.

---

## Q1: How to Store Per-Org "Vertical" Configuration in the DB

### What Already Exists (Audit Finding)

The schema is already partially implemented. Migration 121 adds:

```sql
-- org_settings.industry_verticals: JSONB array of vertical IDs
-- e.g. ["construction", "tv_film", "motorsport"]
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS industry_verticals JSONB NOT NULL DEFAULT '["construction"]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_org_settings_industry_verticals
  ON org_settings USING GIN (industry_verticals);
```

Migration 123 adds booking-level override:

```sql
-- bookings.event_vertical: TEXT column, per-booking vertical override
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_vertical TEXT;
```

### Pattern Assessment: Hybrid Static Config + DB Vertical Selector

**Recommended pattern: "Vertical ID as key into static TypeScript config."**

Do not store vertical configuration in the database. Store only the vertical ID (a string key) in the database. All configuration for what that vertical means lives in TypeScript config files.

This is already the pattern in the codebase:

- `org_settings.industry_verticals` stores `["construction", "tv_film"]` — IDs only
- `bookings.event_vertical` stores `"motorsport"` — ID only
- `services/taxonomy/vertical-compliance.ts` maps ID to compliance config
- `services/taxonomy/mechanism-presets.ts` maps ID to form presets
- `services/taxonomy/vertical-outcome-labels.ts` maps ID to label overrides
- `web/types/certification.types.ts` maps ID to recommended cert types

**Why this pattern is correct for 5 verticals:**

Storing vertical config in the DB would require:
- A CMS-like admin UI to manage config per vertical
- Runtime DB queries for config that never changes
- Version management when config changes
- Increased RLS complexity

For a known, bounded set of verticals (10 currently, growing slowly), static TypeScript config is faster, type-safe, version-controlled, and requires zero infrastructure.

**Threshold for switching to DB config:** When you exceed ~25 verticals and clients need to self-configure their own. Not applicable to SiteMedic v2.0.

### Org-Level vs Booking-Level Vertical Resolution

The established "waterfall" resolution already in the codebase:

```
1. bookings.event_vertical          (most specific — overrides everything)
      ↓ if null
2. org_settings.industry_verticals[0]  (org default primary vertical)
      ↓ if empty
3. "general"                           (safe fallback — RIDDOR defaults)
```

This is the correct pattern. It mirrors how timezone-aware SaaS platforms handle org defaults with per-record overrides (Calendly, Google Calendar, Linear all use this pattern).

**Nothing new to add to the schema for v2.0.** The columns exist. The TypeScript configs exist. The work is extending those configs for new verticals.

---

## Q2: Runtime Feature Flagging / Content Switching in React Native + Next.js

### What Already Exists (Audit Finding)

Both platforms already implement vertical switching without a feature flag library:

**Next.js web (via OrgProvider):**

```typescript
// web/contexts/org-context.tsx — already fetches industry_verticals
const { orgId, industryVerticals } = useOrg();
const primaryVertical = industryVerticals?.[0] ?? 'general';
const compliance = getVerticalCompliance(primaryVertical);
// compliance.incidentPageLabel, compliance.complianceBadgeLabel etc. adapt UI
```

**React Native mobile (per-screen fetch):**

```typescript
// app/treatment/new.tsx — fetchOrgVertical() called on mount
const [orgVertical, setOrgVertical] = useState<string | null>(null);
// Then:
const mechanismPresets = getMechanismPresets(orgVertical);
const patientLabel = getPatientLabel(orgVertical);
```

### Recommended Pattern: Promote Mobile Vertical to a Shared Context

The mobile app currently fetches `orgVertical` separately on each screen that needs it (`treatment/new.tsx` fetches directly from Supabase). This works but causes duplicate fetches and a loading gap on each screen.

**For v2.0, promote to a shared context on mobile — mirrors the web's OrgProvider pattern:**

```typescript
// Pattern: vertical-aware context for React Native
// src/contexts/VerticalContext.tsx (new file for v2.0)
// - Fetch once on app launch
// - Cache in context
// - Read in any screen with useVertical()
```

This is a standard React Context pattern, no library needed. The web already does this correctly. The mobile should match it.

**Do not use a feature flag SaaS service (LaunchDarkly, Flagsmith, etc.)** for this use case. Those services are for A/B testing or gradual rollouts to users you don't control. Here, the vertical is a deterministic property of the org's config — it does not change dynamically per user. A context provider reading from Supabase is the correct architecture.

### Booking-Level Override in the Mobile App

When a medic opens a booking-specific screen (e.g., completing a treatment within a specific booking), the booking's `event_vertical` overrides the org default:

```typescript
// Pattern: prefer booking vertical over org vertical
const effectiveVertical = booking.event_vertical ?? orgVertical ?? 'general';
```

This cascade is already implemented for the RIDDOR page on web. The mobile needs the same cascade wherever booking context is available.

---

## Q3: Terminology Switching (i18n-Style, Different Labels Per Vertical)

### What Already Exists (Audit Finding)

The codebase has already solved this without an i18n library. Two patterns are in use:

**Pattern A — Direct label overrides (vertical-outcome-labels.ts):**

```typescript
// Overrides just the display label, keeps DB ID stable
const OUTCOME_LABEL_OVERRIDES: Record<TreatmentVerticalId, OutcomeLabelOverrides> = {
  tv_film: {
    'returned-to-work-same-duties': 'Returned to set',
    'returned-to-work-light-duties': 'Returned to set — restricted duties',
  },
  motorsport: {
    'returned-to-work-same-duties': 'Returned to race / event',
    ...
  },
};
```

**Pattern B — Term functions (vertical-outcome-labels.ts):**

```typescript
// Returns the noun for the person being treated
export function getPatientLabel(verticalId: string | null | undefined): string {
  const labels: Partial<Record<TreatmentVerticalId, string>> = {
    construction: 'Worker',
    tv_film: 'Crew member',
    motorsport: 'Driver / Competitor',
    festivals: 'Attendee',
    ...
  };
  return labels[verticalId as TreatmentVerticalId] ?? 'Patient';
}
```

### Recommended Extension Pattern

**Do not add an i18n library (i18next, next-intl, react-intl).** These libraries solve language/locale problems: pluralization, RTL, date formats, number formats. SiteMedic's terminology problem is simpler: same English language, different domain vocabulary per vertical.

The existing pattern is correct and should be extended. Add a single `services/taxonomy/vertical-terminology.ts` file:

```typescript
// Pattern: Extend with all terminology variants in one place
interface VerticalTerminology {
  /** The person being treated */
  patientLabel: string;
  /** Plural: "Workers on site" / "Attendees" / "Cast & Crew" */
  patientLabelPlural: string;
  /** The location of work */
  locationLabel: string;
  /** "Site" / "Set" / "Circuit" / "Pitch" / "Venue" */
  workplaceLabel: string;
  /** The work being done */
  activityLabel: string;
  /** Noun for the incident list page title */
  incidentListLabel: string;
  /** "Shift" / "Day" / "Race" / "Match" / "Screening" */
  bookingUnitLabel: string;
}

const VERTICAL_TERMINOLOGY: Record<string, VerticalTerminology> = {
  construction: {
    patientLabel: 'Worker',
    patientLabelPlural: 'Workers',
    locationLabel: 'Site',
    workplaceLabel: 'Site',
    activityLabel: 'Work',
    incidentListLabel: 'RIDDOR Incidents',
    bookingUnitLabel: 'Shift',
  },
  tv_film: {
    patientLabel: 'Crew Member',
    patientLabelPlural: 'Cast & Crew',
    locationLabel: 'Location',
    workplaceLabel: 'Set',
    activityLabel: 'Production',
    incidentListLabel: 'Production Incidents',
    bookingUnitLabel: 'Shoot Day',
  },
  // ... all verticals
};
```

**Why this over i18n:**
- Zero dependency overhead
- Type-safe (TypeScript union types catch missing vertical configs)
- Co-located with the other taxonomy files
- No build step (no .po files, no JSON loading)
- Survives the Supabase Edge Function Deno runtime without a polyfill

**Confidence:** HIGH — this is the established pattern already in use in the codebase.

---

## Q4: Per-Vertical PDF Templates with @react-pdf/renderer

### What Already Exists (Audit Finding)

The existing PDF architecture: one Edge Function per PDF type, each containing a single `*Document.tsx` React component.

Current PDF functions:
- `supabase/functions/riddor-f2508-generator/` — F2508Document.tsx (HSE RIDDOR form)
- `supabase/functions/generate-invoice-pdf/` — InvoiceDocument.tsx
- `supabase/functions/generate-contract-pdf/` — ContractDocument.tsx (via components/)
- `supabase/functions/generate-payslip-pdf/` — payslip PDF
- `supabase/functions/generate-weekly-report/` — weekly safety report

The existing pattern for each PDF function:

```
function/
  index.ts          ← Edge Function entry, fetches data, calls renderToBuffer
  *Document.tsx     ← React PDF component (Document, Page, View, Text)
  *-mapping.ts      ← Maps DB data to PDF data shape
  styles.ts         ← StyleSheet.create() definitions
  types.ts          ← TypeScript types for the PDF data shape
```

### Recommended Pattern for Multi-Vertical PDF Reports

**Use a vertical-dispatched document strategy inside a single Edge Function per report type.**

For incident reports, which are the primary per-vertical PDF:

```
supabase/functions/generate-incident-report/
  index.ts                          ← dispatches to the right Document component
  documents/
    F2508Document.tsx               ← HSE RIDDOR / Construction / TV-Film
    PurpleGuideDocument.tsx         ← Festivals & Events
    MotorsportUKDocument.tsx        ← Motorsport UK / FIA
    FAIncidentDocument.tsx          ← Football / Sporting Events
    GenericIncidentDocument.tsx     ← Fallback for verticals with no mandated form
  shared/
    shared-styles.ts                ← Brand colors, fonts, spacing
    shared-components.tsx           ← Reusable PDF primitives (Section, Field, Header)
  types.ts                          ← IncidentReportData (superset of all fields)
```

**The dispatch in index.ts:**

```typescript
// Pattern: vertical-aware PDF dispatch
function resolveIncidentDocument(
  vertical: string,
  data: IncidentReportData
): JSX.Element {
  switch (vertical) {
    case 'festivals': return <PurpleGuideDocument data={data} />;
    case 'motorsport': return <MotorsportUKDocument data={data} />;
    case 'sporting_events': return <FAIncidentDocument data={data} />;
    case 'construction':
    case 'tv_film':
    case 'corporate': return <F2508Document data={data} />;
    default: return <GenericIncidentDocument data={data} />;
  }
}

// In the Edge Function handler:
const document = resolveIncidentDocument(vertical, incidentData);
const pdfBuffer = await renderToBuffer(document);
```

**Why one Edge Function per report type, not one per vertical:**

Supabase Edge Functions have cold start costs and invocation limits. 5 verticals x 4 report types = 20 Edge Functions would be operationally noisy. Grouping by report category (incident report, booking brief, weekly summary) keeps invocations manageable while dispatch handles per-vertical variation at the document level.

**Why not a template engine (Handlebars, Mustache, Nunjucks):**

`@react-pdf/renderer` is already validated and in production for this project. It runs in Deno via the `npm:@react-pdf/renderer@4.3.2` import pattern (confirmed in `riddor-f2508-generator/index.ts`). Switching to a template-based approach adds no value and breaks the existing patterns.

**@react-pdf/renderer version:** 4.3.2 (verified in `web/package.json` and Supabase Edge Function imports). This is a current stable version as of early 2026. No upgrade needed for v2.0.

**Shared PDF primitives pattern (reduces duplication across templates):**

```typescript
// supabase/functions/generate-incident-report/shared/shared-components.tsx
// Reusable building blocks shared across all vertical PDF documents

const ReportHeader = ({ title, framework, generatedAt }) => (
  <View style={styles.header}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.framework}>{framework}</Text>
    <Text style={styles.date}>{generatedAt}</Text>
  </View>
);

const FormField = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value ?? 'Not provided'}</Text>
  </View>
);
```

All vertical document components import from `./shared/shared-components.tsx`, keeping brand consistency while varying only the section structure and compliance-specific fields.

---

## Q5: Per-Vertical Form Schemas — Dynamic JSONB vs Hardcoded Per-Vertical

### What Already Exists (Audit Finding)

Migration 123 establishes the pattern for booking briefs:

```sql
-- booking_briefs table uses a hybrid approach:
-- Common fields as explicit columns (all verticals)
nearest_ae_name TEXT,
nearest_ae_address TEXT,
helicopter_lz TEXT,
emergency_rendezvous TEXT,
-- Vertical-specific fields in JSONB
extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb
```

The code comment in the migration explicitly names the pattern:
> "Common fields are explicit columns; vertical-specific fields live in extra_fields JSONB so the schema stays flexible across all 10 verticals."

### Recommended Pattern: Explicit Columns for Shared Fields + JSONB for Vertical-Specific Fields

**This is the correct pattern for SiteMedic v2.0. Use it consistently across all forms.**

| Form area | Common fields (explicit columns) | Vertical-specific (JSONB extra_fields) |
|-----------|----------------------------------|---------------------------------------|
| Booking brief | A&E name/address, heli LZ, hazards | race_control_channel (motorsport), mip_reference (festivals), safeguarding_lead_name (education) |
| Treatment record | injury_type, body_part, mechanism, outcome | stunt_reference (tv_film), car_number (motorsport), player_squad_number (sporting_events) |
| Incident report | incident_date, patient_name, org_name | fa_form_number (sporting_events), motorsport_uk_ref (motorsport) |

**Why this over fully-dynamic JSON schema (like a form builder):**

A full dynamic schema system (storing field definitions in DB, rendering generic form builders) would require:
- A schema definition table with field types, validations, ordering
- A generic form renderer in both React Native and Next.js
- Schema versioning when fields change
- Increased query complexity

For 10 known verticals with stable, well-understood regulatory requirements, hardcoded field definitions per vertical are faster to build, easier to test, and straightforward to audit.

**Threshold for switching to dynamic schemas:** When an org admin can configure their own custom fields without a code deployment. This is not a v2.0 requirement.

### Vertical Form Field Definition Pattern

Each vertical's additional fields are defined in TypeScript, not the DB:

```typescript
// services/taxonomy/vertical-form-fields.ts (new file for v2.0)

interface VerticalFormField {
  key: string;             // Maps to JSONB key in extra_fields
  label: string;           // Display label for the medic
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];      // For 'select' type
  placeholder?: string;
}

const VERTICAL_EXTRA_FIELDS: Record<string, VerticalFormField[]> = {
  motorsport: [
    { key: 'car_number', label: 'Car / Competitor Number', type: 'text', required: true },
    { key: 'race_control_channel', label: 'Race Control Radio Channel', type: 'text', required: false },
    { key: 'circuit_section', label: 'Circuit Section', type: 'text', required: false },
    { key: 'clerk_of_course_notified', label: 'Clerk of Course Notified', type: 'boolean', required: true },
  ],
  festivals: [
    { key: 'mip_reference', label: 'MIP Reference Number', type: 'text', required: false },
    { key: 'welfare_area_id', label: 'Welfare Area / Medical Post', type: 'text', required: false },
    { key: 'triage_category', label: 'Triage Category', type: 'select', required: true,
      options: ['GREEN', 'YELLOW', 'RED', 'BLACK'] },
  ],
  tv_film: [
    { key: 'production_title', label: 'Production Title', type: 'text', required: false },
    { key: 'stunt_coordinator_notified', label: 'Stunt Coordinator Notified', type: 'boolean', required: false },
    { key: 'scene_number', label: 'Scene / Shot Number', type: 'text', required: false },
  ],
  sporting_events: [
    { key: 'squad_number', label: 'Player Squad Number', type: 'number', required: false },
    { key: 'team_name', label: 'Team Name', type: 'text', required: false },
    { key: 'fa_incident_number', label: 'FA Incident Reference', type: 'text', required: false },
  ],
  // construction: []  — no extra fields needed (RIDDOR fields are sufficient)
};

export function getVerticalExtraFields(verticalId: string): VerticalFormField[] {
  return VERTICAL_EXTRA_FIELDS[verticalId] ?? [];
}
```

**In React Native forms**, iterate `getVerticalExtraFields(vertical)` to render conditional fields. All values write to the JSONB `extra_fields` column.

**In Next.js forms**, same pattern — the field definitions are importable in both environments since they are pure TypeScript with no platform-specific imports.

---

## Stack Additions Required for Multi-Vertical v2.0

No new npm packages are required. All patterns use existing stack capabilities.

| Need | Solution | New Dependency? |
|------|----------|-----------------|
| Vertical config storage | Extend existing `Record<string, Config>` TypeScript files | No |
| Runtime vertical switching (web) | Existing `OrgProvider` + `useOrg()` | No |
| Runtime vertical switching (mobile) | New `VerticalContext` (mirrors web OrgProvider pattern) | No |
| Terminology switching | Extend `services/taxonomy/vertical-terminology.ts` (new file) | No |
| Per-vertical PDF templates | Vertical dispatch in new `generate-incident-report` Edge Function | No |
| Per-vertical form fields | `services/taxonomy/vertical-form-fields.ts` (new file) | No |
| Booking-level vertical override | `bookings.event_vertical` column (migration 123, already exists) | No |

---

## What NOT to Add

| Temptation | Why to Avoid |
|------------|--------------|
| **A feature flag service (LaunchDarkly, Flagsmith)** | Over-engineered for deterministic org config. Adds vendor dependency, cost, and latency for zero benefit over a React Context. |
| **i18next or next-intl for terminology** | These solve language/locale problems (pluralization, RTL, number formats). SiteMedic's terminology problem is pure vocabulary swapping within English. A TypeScript Record is sufficient and type-safe. |
| **A dynamic form builder / CMS for field definitions** | 10 known verticals with stable regulatory forms do not need runtime field configuration. Hardcoded TypeScript definitions per vertical are faster, auditable, and type-safe. |
| **Storing vertical config data in the DB** | Config that doesn't change at runtime (compliance frameworks, terminology, form field definitions) belongs in source code, not the database. Only the vertical *identifier* (a string key) belongs in the DB. |
| **A separate Edge Function per vertical for PDF generation** | Multiplies infrastructure surface area. One Edge Function per report category with a vertical dispatch is the correct granularity. |
| **Migrating from @react-pdf/renderer to another PDF library** | @react-pdf/renderer 4.3.2 is already proven in Deno Edge Functions in this codebase. No migration justified. |

---

## File Locations for Multi-Vertical Work

| File | Status | Purpose |
|------|--------|---------|
| `services/taxonomy/vertical-compliance.ts` | Exists (10 verticals) | Compliance frameworks, RIDDOR applicability, guidance text |
| `services/taxonomy/mechanism-presets.ts` | Exists (10 verticals) | Quick-tap mechanism chips in treatment form |
| `services/taxonomy/vertical-outcome-labels.ts` | Exists (10 verticals) | Per-vertical outcome display labels |
| `services/taxonomy/certification-types.ts` | Exists (mobile) | Per-vertical recommended cert types |
| `web/types/certification.types.ts` | Exists (web) | Per-vertical recommended cert types (web mirror) |
| `web/contexts/org-context.tsx` | Exists | Exposes `industryVerticals` to Next.js components |
| `web/lib/compliance/vertical-compliance.ts` | Exists (web mirror) | Same as services/ version for web import paths |
| `supabase/migrations/121_org_industry_verticals.sql` | Exists | `org_settings.industry_verticals` JSONB column |
| `supabase/migrations/123_booking_briefs.sql` | Exists | `bookings.event_vertical` + `booking_briefs.extra_fields` |
| `services/taxonomy/vertical-terminology.ts` | **New — create** | Consolidated terminology map (patientLabel, workplaceLabel, etc.) |
| `services/taxonomy/vertical-form-fields.ts` | **New — create** | Extra form field definitions per vertical |
| `src/contexts/VerticalContext.tsx` | **New — create** | Mobile vertical context (mirrors web OrgProvider) |
| `supabase/functions/generate-incident-report/` | **New — create** | Vertical-dispatched incident report PDF Edge Function |

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| Codebase audit: `services/taxonomy/`, `supabase/migrations/121`, `123`, `web/contexts/org-context.tsx`, `app/treatment/new.tsx` | Direct code inspection | HIGH |
| Codebase audit: `supabase/functions/riddor-f2508-generator/`, `generate-contract-pdf/`, `generate-invoice-pdf/` | Direct code inspection | HIGH |
| `web/package.json` — @react-pdf/renderer 4.3.2, Next.js 15.1.5, @tanstack/react-query 5.90.21 | Direct file read | HIGH |
| `package.json` — Expo SDK 54, WatermelonDB 0.28.0, @supabase/supabase-js 2.95.3 | Direct file read | HIGH |
| PostgreSQL JSONB hybrid column pattern (explicit + JSONB) — verified against migration 123 design | MEDIUM (multi-tenant SaaS literature confirms) | MEDIUM |
| React Context for vertical config — no feature flag library needed | HIGH (existing implementation confirms the pattern works) | HIGH |
| @react-pdf/renderer dispatch strategy — confirmed by existing multi-PDF-type codebase pattern | HIGH | HIGH |
| Feature flag SaaS services (LaunchDarkly, Flagsmith) — ruled out for deterministic vertical config | MEDIUM (WebSearch confirmed typical use cases don't match this need) | MEDIUM |
