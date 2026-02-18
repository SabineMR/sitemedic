# Phase 19: Motorsport Vertical — Research

**Researched:** 2026-02-17
**Domain:** Motorsport UK compliance, concussion clearance workflow, Medical Statistics Sheet PDF generation, web dashboard badge
**Confidence:** MEDIUM — codebase inspection HIGH; Motorsport UK form field specifics LOW (PDF binaries could not be extracted; regulatory text cross-confirmed from web)

---

## Summary

Phase 19 builds on the vertical infrastructure delivered in Phase 18. The schema (v4), RIDDOR gate, OrgContext, `vertical_extra_fields` JSONB column, and the `motorsport-incident-generator` Edge Function stub all exist. Phase 19 fills the stub with a real implementation: motorsport-specific form fields captured on mobile, a concussion clearance gate that cannot be bypassed, a Medical Statistics Sheet aggregation PDF, and a web dashboard badge for uncleared concussion cases.

The key regulatory driver is Motorsport UK's Concussion Policy (2024): when concussion is suspected, the competitor must be stood down from the event, the competitor's competition licence must be suspended and retained by the Event Secretary, and the case must be forwarded to Motorsport UK's Medical Department. This three-step workflow (HIA conducted, competitor stood down, CMO notified) must be enforced at the form-submission level — not just advisory text. The mobile form must not allow `status: complete` unless all three items are checked.

The Motorsport UK Incident Pack V8.0 (dated 2025-03-12) is the physical source for the Accident Form template. The pack's PDF could not be parsed during this research session (binary-compressed). The research flag in the phase description is therefore confirmed: **`MotorsportIncidentDocument.tsx` must NOT be built without obtaining a readable copy of the Incident Pack or the actual form fields**. A proxy approach (using known regulatory requirements + MOTO-01 field list) is viable for sub-plans 19-01 and 19-02, but the PDF document component for 19-03 must wait for the physical form.

**Primary recommendation:** Build sub-plans 19-01 (form fields) and 19-02 (concussion gate) using the requirements from MOTO-01 and the confirmed Motorsport UK Concussion Policy workflow. Block 19-03 (PDF rendering) until the Incident Pack V8.0 form fields are confirmed by reading the physical PDF offline. Build 19-04 (Medical Statistics Sheet + dashboard badge) using the F2508 generator as the structural pattern.

---

## Motorsport UK Form Fields

### Confirmed Fields from Requirements (MOTO-01)

These fields are explicitly required by the phase requirements. Store in `treatments.vertical_extra_fields` as JSONB:

| Field ID | Type | Label | Required |
|----------|------|-------|----------|
| `gcs_score` | integer (3–15) | GCS Score | Yes |
| `extrication_required` | boolean | Extrication Required | Yes |
| `helmet_removed` | boolean | Helmet Removed at Scene | Yes |
| `concussion_suspected` | boolean | Concussion Suspected | Yes — triggers gate |
| `competitor_car_number` | string | Competitor Car / Race Number | Yes |
| `circuit_section` | string | Circuit Section / Location | Yes |
| `clerk_of_course_notified` | boolean | Clerk of Course Notified | Yes |
| `competitor_cleared_to_return` | boolean | Competitor Cleared to Return to Race | Conditional |

### Concussion Clearance Gate Fields (MOTO-02 / MOTO-03)

Only required when `concussion_suspected === true`. All three must be `true` before `handleCompleteTreatment` is allowed to proceed:

| Field ID | Type | Label |
|----------|------|-------|
| `hia_conducted` | boolean | HIA (Head Injury Assessment) Conducted |
| `competitor_stood_down` | boolean | Competitor Stood Down from Event |
| `cmo_notified` | boolean | Chief Medical Officer (CMO) Notified |

### Additional Fields Inferred from Motorsport UK Regulations

These are present on physical Motorsport UK Accident Forms based on regulatory documents. Confidence: MEDIUM (confirmed from regulatory text, not verified against Incident Pack V8.0 form):

| Field ID | Type | Label | Notes |
|----------|------|-------|-------|
| `competitor_name` | string | Competitor Name | Different from generic patient name |
| `vehicle_type` | string | Vehicle Type (Car / Kart / Bike) | Motorsport UK tracks vehicle class |
| `incident_type` | enum | Incident Type | e.g. collision, single vehicle, track incident |
| `helmet_condition` | string | Helmet Condition | Physical Incident Pack V8.0 explicitly tracks helmet state |
| `licences_to_msuk` | boolean | Competition Licences Sent to Motorsport UK | Required on concussion |

### JSONB Shape (`vertical_extra_fields` for motorsport)

```typescript
// Stored in treatments.vertical_extra_fields (JSONB in Supabase, JSON string in WatermelonDB)
interface MotorsportExtraFields {
  // Core MOTO-01 fields
  gcs_score: number | null;            // 3–15 Glasgow Coma Scale
  extrication_required: boolean;
  helmet_removed: boolean;
  concussion_suspected: boolean;
  competitor_car_number: string;
  circuit_section: string;
  clerk_of_course_notified: boolean;
  competitor_cleared_to_return: boolean;

  // Concussion clearance gate — only relevant when concussion_suspected === true
  hia_conducted: boolean;
  competitor_stood_down: boolean;
  cmo_notified: boolean;

  // Additional vehicle/incident fields (inferred from regulations)
  vehicle_type?: string;
  incident_type?: string;
  helmet_condition?: string;
  licences_to_msuk?: boolean;
}
```

---

## Concussion Clearance Workflow

### Regulatory Basis (MEDIUM confidence — from Motorsport UK Concussion Policy 2024)

When concussion is diagnosed/suspected at a Motorsport UK event:

1. **Competitor must not compete further** in the event, including subsequent event days.
2. **Competition licence must be suspended** and retained by the Event Secretary.
3. **Licence forwarded to Motorsport UK Medical Department** after the event.
4. **Competitor must obtain formal GP clearance** before licence is returned (typically 2–3 weeks).
5. **Repeat concussion within 3 months** requires specialist referral.

The three-part checklist the phase requires maps directly to steps 1–3:
- `hia_conducted` — formal assessment was performed (SCAT/HIA tool)
- `competitor_stood_down` — competitor is not returning to race (step 1)
- `cmo_notified` — CMO informed (step 3, triggers licence forwarding)

### Mobile Gate Implementation

The gate must be enforced in `app/treatment/new.tsx` inside `handleCompleteTreatment`. The existing pattern for blocking submit (cert validation check at lines 276–285) is the correct model:

```typescript
// Source: app/treatment/new.tsx lines 276-285 — cert validation gate pattern
if (!certCheck.valid) {
  Alert.alert('...', '...');
  return;  // hard block
}

// NEW: Motorsport concussion gate
if (orgVertical === 'motorsport' && motorsportFields.concussion_suspected) {
  const { hia_conducted, competitor_stood_down, cmo_notified } = motorsportFields;
  if (!hia_conducted || !competitor_stood_down || !cmo_notified) {
    Alert.alert(
      'Concussion Clearance Required',
      'When concussion is suspected, you must confirm: HIA conducted, competitor stood down, and CMO notified before completing this record.',
      [{ text: 'OK' }]
    );
    return;  // hard block — cannot be bypassed
  }
}
```

### Alert Notification (MOTO-03)

When `concussion_suspected === true` and the treatment is completed, the system must:
1. Create a notification record in Supabase for the org admin.
2. This notification should reference the treatment record and indicate licence suspension workflow is required.

The existing `notification-service` Edge Function (`supabase/functions/notification-service/`) is the pattern to follow. Trigger can be a Supabase Database Function or a server action called after sync.

---

## Medical Statistics Sheet

### Purpose

Per MOTO-02: an end-of-event aggregate document covering all incident records for a motorsport booking. This is standard Motorsport UK practice — the Chief Medical Officer submits a summary to the event organiser and Motorsport UK.

### Fields (MEDIUM confidence — inferred from regulatory requirements, physical form not obtained)

The Medical Statistics Sheet aggregates treatment records for a booking. Likely fields based on regulatory requirements:

| Field | Source |
|-------|--------|
| Event name | `bookings.event_name` or `bookings.extra_fields->>'event_name'` |
| Event date(s) | `bookings.start_date`, `bookings.end_date` |
| Venue / circuit name | `bookings.location` |
| Chief Medical Officer | Medic who generated the sheet (or booking primary medic) |
| Total patient contacts | COUNT of treatments WHERE booking_id = ? |
| Total by severity (minor/moderate/major/critical) | COUNT GROUP BY severity |
| Total by outcome | COUNT GROUP BY outcome |
| Competitors treated (vs spectators/staff) | Not directly available — use competitor_car_number presence as proxy |
| Concussion cases | COUNT WHERE vertical_extra_fields->>'concussion_suspected' = 'true' |
| Extrication cases | COUNT WHERE vertical_extra_fields->>'extrication_required' = 'true' |
| Hospital referrals / ambulances | COUNT WHERE outcome IN ('hospital_referral', 'ambulance_called') |
| GCS < 13 incidents | COUNT WHERE vertical_extra_fields->>'gcs_score' < 13 |
| Incident list (tabular) | All treatment rows for this booking_id |

### PDF Generation Approach

The Medical Statistics Sheet is a separate PDF from the per-incident Accident Form. It is generated on demand by an admin from the booking detail page. The pattern follows the F2508 generator:

- New Edge Function: `supabase/functions/motorsport-stats-sheet-generator/`
- Files: `index.ts`, `MotorsportStatsDocument.tsx`, `stats-mapping.ts`, `types.ts`
- Storage bucket: `motorsport-reports/` (new bucket, separate from `riddor-reports/`)
- Trigger: Admin clicks "Generate Medical Statistics Sheet" button on booking detail page
- Input: `{ booking_id: string }`
- Output: `{ signed_url: string }`

The `renderToBuffer` + `@react-pdf/renderer@4.3.2` pattern from `riddor-f2508-generator` applies exactly.

---

## Data Model (what columns, JSONB shape)

### Supabase Schema — No New Migrations Required

Phase 18 migration 124 already added:
- `treatments.event_vertical TEXT` — already exists
- `treatments.vertical_extra_fields JSONB` — already exists
- `treatments.booking_id UUID REFERENCES bookings(id)` — already exists

No new SQL migration is needed for Phase 19 data storage.

**The one exception:** If an `motorsport_concussion_clearances` table is desired for independent querying of clearance status, that would require a migration. However, the simpler approach (and the one implied by the requirements) is to store clearance state inside `vertical_extra_fields` and query it with a JSONB path expression on the `treatments` table. This avoids a new table.

### New Supabase Table (Conditional — for MOTO-03 notifications)

MOTO-03 requires a "notification record for Motorsport UK" and "admin alerted." The existing `medic_alerts` table (confirmed present from migration 109) may be the correct target. Research finding: use the existing notification infrastructure rather than creating a new table.

If the `medic_alerts` or `notifications` table does not have a suitable `alert_type` value for motorsport concussion, add `'motorsport_concussion'` as a new alert type value — this is a data-only change, no schema migration needed (if the column is TEXT).

### WatermelonDB — No Schema Change Required

`vertical_extra_fields` is already a `text` column in WatermelonDB schema v4 (`src/database/schema.ts` line 34, confirmed). The motorsport fields are stored as a JSON string in this column. No schema bump is needed.

### Supabase Storage Bucket

A new `motorsport-reports` storage bucket is needed for the Medical Statistics Sheet PDFs. This must be created via a migration or via the Supabase dashboard. Follow the `riddor-reports` bucket pattern.

---

## Implementation Approach per Sub-Plan

### 19-01: Motorsport Form Fields

**Goal:** Mobile treatment form shows motorsport-specific fields when `vertical === 'motorsport'`.

**Where:** `app/treatment/new.tsx` — add a conditional section after the existing injury/treatment sections, rendered only when `orgVertical === 'motorsport'`.

**Pattern:** The existing `orgVertical` variable (line 81 of `new.tsx`) already drives conditional rendering. Add a new Section 2.5 or Section 7 "Motorsport Details" card that renders the fields from `MotorsportExtraFields`.

**State management:** Add `motorsportFields` state of type `MotorsportExtraFields` (TypeScript interface in `services/taxonomy/motorsport-fields.ts` — new file). On change, update `treatment.verticalExtraFields` via WatermelonDB update and include in `enqueueSyncItem` payload as `vertical_extra_fields: JSON.stringify(motorsportFields)`.

**GCS Score input:** Use a numeric `TextInput` with `keyboardType="number-pad"` bounded to 3–15 with validation. Not a picker — GCS is a medical score the medic calculates at the scene.

**Checkboxes:** Expo React Native does not have a native Checkbox. Use `Pressable` with a checked/unchecked style toggle, same pattern as `LargeTapButton`. Or use the existing `treatmentTypeButton` / `treatmentTypeButtonSelected` style (already in the form — lines 733–756 of `new.tsx`).

**New file to create:** `services/taxonomy/motorsport-fields.ts` — defines the `MotorsportExtraFields` interface and a `MOTORSPORT_INCIDENT_TYPES` array. This keeps the type co-located with other taxonomy files.

### 19-02: Concussion Clearance Gate

**Goal:** When `concussion_suspected === true`, the form shows a mandatory three-checkbox clearance panel. `handleCompleteTreatment` blocks until all three are checked.

**Where:** Inline in `app/treatment/new.tsx` — conditional section rendered below the motorsport fields section, only visible when `motorsportFields.concussion_suspected === true`.

**UI pattern:** A bordered warning card (amber/red border, matching the RIDDOR banner style at lines 636–648 of `new.tsx`) containing three checkboxes. Each checkbox updates `motorsportFields`.

**Gate implementation:** Insert after the `certCheck` validation block (lines 276–285) but before the treatment completion logic. See "Concussion Clearance Workflow" section above for the exact code pattern.

**Post-completion notification:** After `enqueueSyncItem` succeeds and concussion was suspected, call the notification service or enqueue an admin notification. The simplest approach: include `concussion_flag: true` in the sync payload and handle via a Supabase trigger or Postgres function that fires on treatment INSERT/UPDATE where `vertical_extra_fields->>'concussion_suspected' = 'true'`.

### 19-03: Motorsport PDF Edge Function

**Goal:** `motorsport-incident-generator` Edge Function (currently a 501 stub) renders a Motorsport UK Accident Form PDF.

**CRITICAL BLOCKER:** The physical Motorsport UK Incident Pack V8.0 form fields are required before `MotorsportIncidentDocument.tsx` can be built. The Incident Pack V8.0 PDF URL is confirmed (`https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/03/Incident-Pack-V8.0.pdf`) but the binary was not readable via WebFetch.

**Action required before coding:** Download the Incident Pack V8.0 PDF locally and extract the form field names. Then build `MotorsportIncidentDocument.tsx` to match those fields.

**File structure (following F2508 pattern exactly):**
```
supabase/functions/motorsport-incident-generator/
  index.ts                          ← currently stub; replace with full implementation
  MotorsportIncidentDocument.tsx    ← NEW: @react-pdf/renderer JSX component
  motorsport-mapping.ts             ← NEW: maps treatment + extra_fields to form data
  types.ts                          ← update existing stub with full MotorsportFormData type
```

**Input:** `{ incident_id: string, event_vertical: 'motorsport' }` (matches existing dispatcher in `web/lib/pdf/incident-report-dispatcher.ts`).

**Data fetch:** Join `treatments` with `workers` and `org_settings`. Parse `treatments.vertical_extra_fields` (JSONB) to get motorsport-specific fields.

**Storage:** `motorsport-reports/{incident_id}/MotorsportAccidentForm-{timestamp}.pdf` — requires new `motorsport-reports` storage bucket.

**Signed URL:** 7-day expiry, same as F2508 pattern.

### 19-04: Medical Statistics Sheet + Dashboard Badge

**Goal A (Medical Statistics Sheet):** New Edge Function generates aggregate PDF for a booking.

**New Edge Function:** `supabase/functions/motorsport-stats-sheet-generator/`
- Input: `{ booking_id: string }`
- Fetch all treatments WHERE `booking_id = ? AND event_vertical = 'motorsport'`
- Aggregate counts, build `MotorsportStatsDocument.tsx`
- Store in `motorsport-reports/{booking_id}/MedicalStatsSheet-{timestamp}.pdf`
- Return signed URL

**Trigger point on web:** New "Generate Medical Statistics Sheet" button on the booking detail page (`web/app/(dashboard)/...` — booking detail route). This button calls `supabase.functions.invoke('motorsport-stats-sheet-generator', { body: { booking_id } })`.

**Goal B (Dashboard Badge):** On the treatments list page (`web/app/(dashboard)/treatments/page.tsx`) and/or the incidents/RIDDOR page, any motorsport treatment where `vertical_extra_fields->>'concussion_suspected' = 'true'` AND no clearance record exists shows a red "Concussion clearance required" badge.

**Badge implementation:** In `web/components/dashboard/treatments-columns.tsx` add a new column cell that checks `row.original.event_vertical === 'motorsport' && row.original.vertical_extra_fields?.concussion_suspected === true && !row.original.vertical_extra_fields?.competitor_stood_down`. Render `<Badge variant="destructive">Concussion clearance required</Badge>`.

**Supabase query change:** `fetchTreatments` in `web/lib/queries/treatments.ts` must include `vertical_extra_fields` in the SELECT. Currently it uses `*` which should include JSONB columns — verify this includes `vertical_extra_fields` at runtime.

**Type update:** `TreatmentWithWorker` in `web/types/database.types.ts` must include `vertical_extra_fields: Record<string, unknown> | null`.

### 19-05: Motorsport Vertical Wiring

**Goal:** Connect all the pieces; ensure the cert profile shows motorsport-specific certs first.

**Cert profile ordering:** `VERTICAL_CERT_TYPES['motorsport']` in `services/taxonomy/certification-types.ts` already lists:
`['FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'ATLS', 'PHTLS', 'FIA Grade 1', 'FIA Grade 2', 'FIA Grade 3', 'Motorsport UK CMO Letter', 'MSA First Aider']`

Requirement MOTO-06 says cert types should include `Motorsport UK Medical Official Licence`, `ATLS`, and `BASM`. The current taxonomy uses `Motorsport UK CMO Letter` (the approval letter) and FIA Grades, but does NOT have `Motorsport UK Medical Official Licence` or `BASM` as cert types. These must be ADDED to both `services/taxonomy/certification-types.ts` and `web/types/certification.types.ts`.

**BASM note:** BASM (British Association of Sport and Medicine — now BASEM) is an accreditation body. A "BASM qualification" in the motorsport context likely refers to an introductory sports medicine course or membership. Confidence: LOW. The plan should add `'BASM Diploma'` or `'BASM Membership'` as a cert type and mark it for validation against actual Motorsport UK medical official requirements.

**`Motorsport UK Medical Official Licence` cert type:** This IS the official Motorsport UK document issued to medical officials (Registered Doctor / Registered Paramedic / Registered Medical Assistant). It is distinct from the CMO Letter. Add as a new cert type.

**RIDDOR gate verification:** The `supabase/functions/riddor-detector/index.ts` already has the vertical gate (per Phase 18). Confirm `motorsport` is in `NON_RIDDOR_VERTICALS` — it is, per the Phase 18 research. No change needed here for Phase 19.

**Terminology update (MOTO-05):** The taxonomy files already use correct labels:
- `getPatientLabel('motorsport')` returns `'Driver / Competitor'` — correct for MOTO-05 "Competitor"
- `incidentPageLabel` for motorsport is `'Race Incidents'`
- `postTreatmentGuidance` references `Clerk of the Course` and `CMO`

However, "Organiser" (MOTO-05) is not surfaced in any existing label. The phase description says terminology should include "Organiser" — this likely means the `Clerk of Course` notification label, which is already in the extra fields. No taxonomy change needed for this term specifically unless the requirement means something more.

---

## File Map

### Files to Create

| File | Purpose |
|------|---------|
| `services/taxonomy/motorsport-fields.ts` | `MotorsportExtraFields` interface + `MOTORSPORT_INCIDENT_TYPES` |
| `supabase/functions/motorsport-incident-generator/MotorsportIncidentDocument.tsx` | PDF component — **BLOCKED on physical form** |
| `supabase/functions/motorsport-incident-generator/motorsport-mapping.ts` | Map treatment to form data |
| `supabase/functions/motorsport-stats-sheet-generator/index.ts` | Stats sheet Edge Function |
| `supabase/functions/motorsport-stats-sheet-generator/MotorsportStatsDocument.tsx` | Stats sheet PDF component |
| `supabase/functions/motorsport-stats-sheet-generator/stats-mapping.ts` | Aggregate treatment data |
| `supabase/functions/motorsport-stats-sheet-generator/types.ts` | MotorsportStatsData type |
| `supabase/migrations/125_motorsport_storage_bucket.sql` | Create `motorsport-reports` storage bucket + RLS |
| `web/components/dashboard/ConcussionClearanceBadge.tsx` | Badge component for treatments table |

### Files to Modify

| File | Change |
|------|--------|
| `app/treatment/new.tsx` | Add motorsport fields section + concussion gate |
| `supabase/functions/motorsport-incident-generator/index.ts` | Replace 501 stub with full PDF generation |
| `supabase/functions/motorsport-incident-generator/types.ts` | Expand `MotorsportIncidentData` with full field list |
| `services/taxonomy/certification-types.ts` | Add `Motorsport UK Medical Official Licence` and `BASM Diploma` cert types |
| `web/types/certification.types.ts` | Mirror cert type additions |
| `web/types/database.types.ts` | Add `vertical_extra_fields` to `TreatmentWithWorker` |
| `web/lib/queries/treatments.ts` | Verify `*` select includes JSONB columns; add filter for concussion badge query |
| `web/components/dashboard/treatments-columns.tsx` | Add concussion clearance badge column |

### Files to Verify (No Change Expected)

| File | What to Verify |
|------|---------------|
| `supabase/functions/riddor-detector/index.ts` | `motorsport` is in `NON_RIDDOR_VERTICALS` — confirm present |
| `supabase/functions/riddor-f2508-generator/index.ts` | Motorsport vertical returns 400 — confirm present |
| `web/lib/pdf/incident-report-dispatcher.ts` | `motorsport` maps to `motorsport-incident-generator` — confirm |
| `services/taxonomy/vertical-compliance.ts` | `motorsport.riddorApplies = false` — confirm |
| `src/contexts/OrgContext.tsx` | Exists and exports `useOrg()` — confirm Phase 18 delivered |
| `src/database/schema.ts` | `vertical_extra_fields` column present — confirmed v4 |
| `src/database/models/Treatment.ts` | `verticalExtraFields?: string` decorator — confirmed |

---

## Common Pitfalls

### Pitfall 1: Building MotorsportIncidentDocument.tsx Without the Physical Form

**What goes wrong:** Developer infers field names from regulatory text and produces a PDF that does not match the Motorsport UK Accident Form layout. Motorsport UK requires specific form compliance — a custom-layout document will not satisfy the Clerk of Course.

**How to avoid:** Sub-plan 19-03 must have an explicit prerequisite step: "Download and read Incident Pack V8.0 PDF, extract field names." The PDF is at `https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/03/Incident-Pack-V8.0.pdf`. Use a local PDF reader, not a web fetch.

**Fallback:** If the form cannot be obtained, build a "close approximation" document flagged clearly as "Draft — awaiting official form validation" and document the gap. Do not silently produce a non-compliant form.

### Pitfall 2: Concussion Gate Can Be Bypassed if `vertical` is Not 'motorsport'

**What goes wrong:** The concussion gate only fires when `orgVertical === 'motorsport'`. If a medic is booked into a multi-vertical org and the treatment is logged without a booking_id param (falling back to org default of e.g. 'general'), the gate won't fire even if the patient is a motorsport competitor.

**How to avoid:** The gate must check `orgVertical` (which already prefers `params.event_vertical` over org default). If a booking is provided, the booking's `event_vertical` wins. This is already the correct logic in Phase 18's treatment form. Verify that booking navigation from a motorsport booking always passes `event_vertical=motorsport` as a route param.

### Pitfall 3: JSONB `vertical_extra_fields` Not Included in Web Query SELECT

**What goes wrong:** `fetchTreatments` uses `.select('*, worker:workers(...)')`. In Supabase, `*` on a table does include JSONB columns. However, if the column is null (for pre-Phase 18 treatments), parsing `JSON.parse(treatment.vertical_extra_fields)` will throw. The badge logic must null-check before parsing.

**How to avoid:** In `treatments-columns.tsx` badge cell: `const extraFields = row.original.vertical_extra_fields ? (row.original.vertical_extra_fields as MotorsportExtraFields) : null`. Always null-check before accessing nested properties.

### Pitfall 4: Medical Statistics Sheet Aggregate Misses Treatments Not Linked to Booking

**What goes wrong:** Treatments logged without a `booking_id` (walk-in at the event, or device did not receive booking params) won't appear in the Medical Statistics Sheet query `WHERE booking_id = ?`. The sheet will under-count incidents.

**How to avoid:** The stats sheet Edge Function should also accept an optional `org_id + date_range` fallback query. Primary: `WHERE booking_id = ?`. Secondary (if no booking_id): query by `org_id + event date range + event_vertical = 'motorsport'`. Document this limitation in the PDF footer.

### Pitfall 5: `vertical_extra_fields` Stored as WatermelonDB String, Sent as JSONB to Supabase

**What goes wrong:** WatermelonDB stores `vertical_extra_fields` as a JSON string (TEXT column). The `enqueueSyncItem` payload sends this string. The Supabase sync endpoint must parse the string and insert as JSONB, OR the treatment creation via sync API must use `JSON.parse()` before upsert.

**How to avoid:** In `enqueueSyncItem`, pass `vertical_extra_fields` as the parsed object (not the string):
```typescript
vertical_extra_fields: treatment.verticalExtraFields
  ? JSON.parse(treatment.verticalExtraFields)
  : null,
```
This ensures Supabase receives a native JSON object for the JSONB column, not a string. Confirm the existing sync handler handles this correctly — the Phase 18 research noted this in the sync payload inclusion, but it was not verified at the handler level.

### Pitfall 6: New Cert Types Not Added to Both taxonomy Files

**What goes wrong:** `services/taxonomy/certification-types.ts` (mobile) and `web/types/certification.types.ts` (web) are parallel files that must be kept in sync. Adding `Motorsport UK Medical Official Licence` to only one will cause TypeScript errors or missing display labels on the other platform.

**How to avoid:** Sub-plan 19-05 must update BOTH files in the same commit.

---

## Code Examples

### Pattern: Conditional Vertical Section in Treatment Form

```typescript
// Source: app/treatment/new.tsx — existing orgVertical pattern (lines 79-82)
// + conditional rendering model from riddorBanner (lines 393-399)

// In the ScrollView content (after Section 5: Outcome):
{orgVertical === 'motorsport' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>7. Motorsport Details</Text>

    {/* GCS Score */}
    <Text style={styles.fieldLabel}>GCS Score (3–15) *</Text>
    <TextInput
      style={styles.textArea}
      keyboardType="number-pad"
      placeholder="Enter GCS score..."
      value={motorsportFields.gcs_score?.toString() ?? ''}
      onChangeText={(v) => {
        const n = parseInt(v, 10);
        if (!isNaN(n) && n >= 3 && n <= 15) {
          setMotorsportFields((prev) => ({ ...prev, gcs_score: n }));
        }
      }}
    />

    {/* Competitor Car Number */}
    <Text style={styles.fieldLabel}>Competitor Car Number *</Text>
    <TextInput
      style={styles.textArea}
      placeholder="e.g. 42"
      value={motorsportFields.competitor_car_number}
      onChangeText={(v) =>
        setMotorsportFields((prev) => ({ ...prev, competitor_car_number: v }))
      }
    />

    {/* Circuit Section */}
    <Text style={styles.fieldLabel}>Circuit Section / Location *</Text>
    <TextInput
      style={styles.textArea}
      placeholder="e.g. Turn 3, Paddock, Pit Lane"
      value={motorsportFields.circuit_section}
      onChangeText={(v) =>
        setMotorsportFields((prev) => ({ ...prev, circuit_section: v }))
      }
    />

    {/* Boolean checkboxes — using existing treatmentTypeButton style */}
    {([
      { key: 'extrication_required', label: 'Extrication Required' },
      { key: 'helmet_removed', label: 'Helmet Removed at Scene' },
      { key: 'clerk_of_course_notified', label: 'Clerk of Course Notified' },
      { key: 'concussion_suspected', label: 'Concussion Suspected' },
    ] as const).map(({ key, label }) => {
      const isSelected = motorsportFields[key] === true;
      return (
        <Pressable
          key={key}
          style={[styles.treatmentTypeButton, isSelected && styles.treatmentTypeButtonSelected]}
          onPress={() =>
            setMotorsportFields((prev) => ({ ...prev, [key]: !prev[key] }))
          }
        >
          <Text style={[styles.treatmentTypeText, isSelected && styles.treatmentTypeTextSelected]}>
            {isSelected ? '✓ ' : ''}{label}
          </Text>
        </Pressable>
      );
    })}
  </View>
)}
```

### Pattern: Concussion Clearance Gate Panel

```typescript
// Source: app/treatment/new.tsx — riddorBanner style (lines 636-648) + gate model (lines 276-285)

{orgVertical === 'motorsport' && motorsportFields.concussion_suspected && (
  <View style={styles.concussionGateBanner}>
    <Text style={styles.concussionGateTitle}>
      Concussion Clearance Required
    </Text>
    <Text style={styles.concussionGateSubtitle}>
      All three items must be confirmed before completing this record
    </Text>
    {([
      { key: 'hia_conducted', label: 'HIA (Head Injury Assessment) conducted' },
      { key: 'competitor_stood_down', label: 'Competitor stood down from event' },
      { key: 'cmo_notified', label: 'Chief Medical Officer (CMO) notified' },
    ] as const).map(({ key, label }) => {
      const checked = motorsportFields[key] === true;
      return (
        <Pressable
          key={key}
          style={[styles.clearanceCheckbox, checked && styles.clearanceCheckboxChecked]}
          onPress={() => setMotorsportFields((prev) => ({ ...prev, [key]: !prev[key] }))}
        >
          <Text style={styles.clearanceCheckboxText}>
            {checked ? '✓ ' : '  '}{label}
          </Text>
        </Pressable>
      );
    })}
  </View>
)}
```

### Pattern: Medical Statistics Sheet Edge Function Structure

```typescript
// Source: supabase/functions/riddor-f2508-generator/index.ts — follow exact pattern
// New file: supabase/functions/motorsport-stats-sheet-generator/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { MotorsportStatsDocument } from './MotorsportStatsDocument.tsx';
import { mapBookingToStats } from './stats-mapping.ts';
import type { MotorsportStatsRequest } from './types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { booking_id } = await req.json() as MotorsportStatsRequest;
  if (!booking_id) return new Response(
    JSON.stringify({ error: 'booking_id is required' }),
    { status: 400, headers: corsHeaders }
  );

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch booking + all treatments for this booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, org_settings(*)')
    .eq('id', booking_id)
    .single();

  const { data: treatments } = await supabase
    .from('treatments')
    .select('*, worker:workers(first_name, last_name)')
    .eq('booking_id', booking_id)
    .eq('event_vertical', 'motorsport');

  const statsData = mapBookingToStats(booking, treatments ?? []);
  const pdfBuffer = await renderToBuffer(<MotorsportStatsDocument data={statsData} />);

  const fileName = `${booking_id}/MedicalStatsSheet-${Date.now()}.pdf`;
  await supabase.storage.from('motorsport-reports').upload(fileName, pdfBuffer, {
    contentType: 'application/pdf', upsert: false,
  });

  const { data: signedUrlData } = await supabase.storage
    .from('motorsport-reports')
    .createSignedUrl(fileName, 604800);

  return new Response(
    JSON.stringify({ success: true, signed_url: signedUrlData?.signedUrl }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
});
```

### Pattern: Concussion Badge in Treatments Column

```typescript
// Source: web/components/dashboard/treatments-columns.tsx — follow RIDDOR badge pattern (lines 89-97)
// New column to add to treatmentColumns array:

{
  id: 'motorsport_concussion',
  header: 'Clearance',
  cell: ({ row }) => {
    const vertical = row.original.event_vertical;
    const extraFields = row.original.vertical_extra_fields as Record<string, unknown> | null;
    if (vertical !== 'motorsport' || !extraFields) return null;
    if (extraFields.concussion_suspected === true && !extraFields.competitor_stood_down) {
      return (
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          Concussion clearance required
        </Badge>
      );
    }
    return null;
  },
},
```

---

## Open Questions / Risks

### 1. Physical Motorsport UK Accident Form (HIGH RISK — BLOCKING for 19-03)

**What we know:** The Incident Pack V8.0 PDF exists at a known URL (released 2025-03-12). The field names inferred from regulatory text are consistent with MOTO-01 requirements. The `MotorsportExtraFields` interface above captures the required fields.

**What's unclear:** Whether the official Motorsport UK Accident Form uses these exact field names, whether there are additional fields required by the form template, and whether the physical layout has specific sections or ordering that must be reproduced.

**Recommendation:** This is a hard prerequisite for sub-plan 19-03. Add an explicit task in 19-03 PLAN.md: "Developer must download Incident Pack V8.0, open in PDF reader, and document all form field names before building `MotorsportIncidentDocument.tsx`."

### 2. BASM Certification Type (LOW CONFIDENCE)

**What we know:** MOTO-06 requires `BASM` as a cert type. BASM (now BASEM — British Association of Sport and Exercise Medicine) issues introductory/diploma courses. Their relevance to Motorsport UK is as a desirable qualification for Medical Officials.

**What's unclear:** The specific BASM qualification Motorsport UK recognises — is it a "BASM Diploma", "BASEM Membership", or a specific course certificate?

**Recommendation:** Add `'BASM Diploma'` as the cert type (safest guess matching the regulatory language) and note it needs validation. Do not block the phase for this.

### 3. `Motorsport UK Medical Official Licence` vs `Motorsport UK CMO Letter` (MEDIUM CONFIDENCE)

**What we know:** The codebase currently has `'Motorsport UK CMO Letter'` (the approval letter from a CMO to a specific official). The Motorsport UK website confirms a separate "Medical Official Licence" exists (the official registration that grants the holder coverage under Motorsport UK's Master Liability insurance policy).

**What's unclear:** Whether these are two distinct items both worth tracking, or whether one supersedes the other.

**Recommendation:** Add `'Motorsport UK Medical Official Licence'` as a new cert type. Keep `'Motorsport UK CMO Letter'` (it is different — it is the CMO's endorsement, while the licence is the official's own credential from Motorsport UK).

### 4. Notification Table Target for MOTO-03 (MEDIUM CONFIDENCE)

**What we know:** MOTO-03 requires an "admin alerted" notification and a "notification record for Motorsport UK." The system has a `notification-service` Edge Function and presumably a `notifications` or `medic_alerts` table.

**What's unclear:** The exact table name, column structure, and whether a concussion notification type is already defined.

**Recommendation:** Sub-plan 19-02 PLAN.md must include a task to inspect `supabase/functions/notification-service/` and the relevant notification tables before implementing MOTO-03 notification dispatch.

### 5. Medical Statistics Sheet Query — Orphaned Treatments (LOW RISK)

**What we know:** Some treatments may not have a `booking_id` if logged without a booking link.

**What's unclear:** How common this will be in practice and whether the stats sheet should include all same-day/same-event treatments regardless of booking_id.

**Recommendation:** Implement primary query by `booking_id`. Add a note in the PDF footer: "Treatments not linked to this booking (e.g. walk-in contacts) may not be included." This is acceptable for Phase 19 — a more complete solution can follow.

---

## Sources

### Primary (HIGH confidence — files read directly from codebase)

- `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` — full treatment form with existing vertical awareness
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts` — confirmed v4 schema; `vertical_extra_fields` present
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/Treatment.ts` — confirmed `verticalExtraFields?: string` decorator
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/124_vertical_schema_v4.sql` — confirmed `treatments.vertical_extra_fields JSONB` exists
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/motorsport-incident-generator/index.ts` — confirmed 501 stub exists
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/motorsport-incident-generator/types.ts` — confirmed minimal `MotorsportIncidentData` interface
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts` — full F2508 pattern for PDF Edge Function structure
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/F2508Document.tsx` — PDF component pattern
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/f2508-mapping.ts` — mapping pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/pdf/incident-report-dispatcher.ts` — confirmed `motorsport` maps to `motorsport-incident-generator`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-compliance.ts` — confirmed `motorsport.riddorApplies = false`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/certification-types.ts` — confirmed existing motorsport cert types; gap identified (Medical Official Licence, BASM)
- `/Users/sabineresoagli/GitHub/sitemedic/web/types/certification.types.ts` — confirmed parallel cert type file on web
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/mechanism-presets.ts` — confirmed motorsport presets exist
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-outcome-labels.ts` — confirmed motorsport labels
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/dashboard/treatments-columns.tsx` — badge pattern for treatments table
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/treatments.ts` — confirmed `*` select in fetchTreatments
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/riddor/page.tsx` — vertical-aware incidents page pattern
- `/Users/sabineresoagli/GitHub/sitemedic/.planning/phases/18-vertical-infrastructure-riddor-fix/18-RESEARCH.md` — Phase 18 context

### Secondary (MEDIUM confidence — web sources, verified against multiple references)

- Motorsport UK Concussion Policy 2024 — `https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/Motorsport-UK-Concussion-Policy-2024.pdf` — PDF binary not parseable; content confirmed via multiple web search results citing the policy
- Motorsport UK Medical Officials page — `https://www.motorsportuk.org/volunteers/officials/medical-officials/` — confirmed licence categories (Registered Doctor, Registered Paramedic, Registered Medical Assistant, Junior Doctor) and desirable qualifications (ATLS, PHTLS, PHEC, ALS, ATNC)
- Motorsport UK Licence Suspensions Register — `https://www.motorsportuk.org/the-sport/motorsport-uk-suspensions-register/` — confirms licence suspension is a real workflow step for concussion

### Tertiary (LOW confidence — not verified against official form)

- Incident Pack V8.0 field names — `https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/03/Incident-Pack-V8.0.pdf` — URL confirmed; binary not readable; specific form fields INFERRED from regulatory requirements, not extracted from the form
- BASM qualification type — confirmed organisation exists (now BASEM), motorsport applicability inferred from Motorsport UK Medical Officials page listing "ATNC, PHTLS, PHEC, ALS, PHPLS, APLS or ATLS observer" as desirable

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Codebase state (what exists, what's a stub) | HIGH | Direct file reads |
| JSONB field storage pattern | HIGH | Migration 124 and schema confirmed |
| Concussion workflow (3-step gate) | MEDIUM | Official policy PDF URL confirmed; binary unreadable; text of policy quoted in web results |
| Medical Official Licence cert types | MEDIUM | Medical Officials page read directly; BASM gap confirmed |
| Motorsport UK Accident Form exact fields | LOW | Incident Pack URL confirmed; form fields INFERRED, not verified |
| Medical Statistics Sheet exact fields | LOW | Standard regulatory requirements only; no official form obtained |
| PDF generation pattern | HIGH | F2508Document.tsx fully read; pattern is clear |
| Dashboard badge implementation | HIGH | treatments-columns.tsx fully read; Badge component confirmed |

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (Motorsport UK regulations stable; codebase stable)
