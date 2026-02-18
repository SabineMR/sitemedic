# Phase 20: Festivals & Events Vertical — Research

**Researched:** 2026-02-18
**Domain:** Festival/event form fields, Purple Guide PDF generation, RIDDOR gate verification, dashboard PDF download
**Confidence:** HIGH — all findings from direct source-file inspection of the live codebase post-Phase 18

---

## Summary

Phase 18 built the entire foundation Phase 20 needs. The RIDDOR gate is live in `riddor-detector/index.ts` (verified). The `event-incident-report-generator` Edge Function exists as a stub returning 501 (verified). The `incident-report-dispatcher.ts` routes `festivals` to that function (verified). `vertical_extra_fields JSONB` exists on `treatments` in Supabase (migration 124) and as a `@text('vertical_extra_fields')` field on the WatermelonDB Treatment model. `getPatientLabel('festivals')` returns `'Attendee'`. `getRecommendedCertTypes('festivals')` is FREC 3 first. `VERTICAL_COMPLIANCE.festivals.riddorApplies` is `false`.

Phase 20 work is additive only — no existing logic is altered. The four plans are:

1. **20-01: Festival form fields** — Add a festival-specific section to `app/treatment/new.tsx` (conditional on `orgVertical === 'festivals'`) with a required TST triage priority picker (P1/P2/P3/P4), a boolean alcohol/substance flag, a boolean safeguarding flag, and a disposition picker. Write all four values to `treatment.verticalExtraFields` as a JSON object. Add all four to the `enqueueSyncItem` payload.

2. **20-02: RIDDOR gate verification** — Verify (do NOT rebuild) the existing gate. Write a regression test confirming `{ detected: false }` for a festivals treatment. No code changes required unless a gap is found.

3. **20-03: Purple Guide PDF** — Replace the 501 stub in `event-incident-report-generator/index.ts` with real `@react-pdf/renderer@4.3.2` PDF generation. Add a `PurpleGuideDocument.tsx` component and a `purple-guide-mapping.ts` mapper. Create a `event-incident-reports` storage bucket (migration 125). The function must fetch the treatment record (not a riddor_incidents row), build the Purple Guide Patient Contact Log, store in Supabase Storage, and return a signed URL.

4. **20-04: Festivals wiring** — Connect the dashboard treatment detail page for festivals treatments: show the "Event Incident Report" download card (mirrors the F2508 card on the RIDDOR page). Add `generateEventIncidentPDF()` query function in `web/lib/queries/`. The wiring is in `web/app/(dashboard)/treatments/[id]/page.tsx` — conditionally render the card when `treatment.event_vertical === 'festivals'`.

**Primary recommendation:** Execute 20-01 (form fields, data model) first because 20-03 (PDF) reads from `vertical_extra_fields` — the triage/flags data must be in the DB before the PDF generator can render it.

---

## Standard Stack

### Core (all already installed — no new packages required)

| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| `@react-pdf/renderer` | `4.3.2` (Deno npm import) | PDF generation in Edge Functions | `supabase/functions/riddor-f2508-generator/index.ts` line 12 |
| `@nozbe/watermelondb` | existing | Mobile offline DB with v4 schema | `src/database/schema.ts` version 4 (confirmed) |
| `@supabase/supabase-js@2` | existing | Supabase client in Edge Functions | `riddor-detector/index.ts` line 15 |
| `@tanstack/react-query` | existing | Data fetching / mutations in dashboard | `web/app/(dashboard)/riddor/[id]/page.tsx` |
| `lucide-react` | existing | Icons (FileText, Download) in dashboard | `web/app/(dashboard)/riddor/[id]/page.tsx` |
| `next/navigation` `useParams` | existing | Route param access in dashboard client components | `web/app/(dashboard)/riddor/[id]/page.tsx` |

**Installation:** `pnpm install` — no new packages. All libraries already in use.

---

## Architecture Patterns

### Pattern 1: Festival Form Section in `app/treatment/new.tsx`

**What:** Conditional section rendered only when `orgVertical === 'festivals'`. Form fields write to local state; on complete, merged into `vertical_extra_fields` JSON and included in `enqueueSyncItem` payload.

**Exact insertion point:** After "Section 5: Outcome" (line 513), before "Section 6: Signature" (line 524). This section becomes "Section 5b" (do NOT renumber existing sections — they are referenced in requirements docs).

**State additions (add alongside existing state declarations ~line 59):**
```typescript
// Festival-specific state (only used when orgVertical === 'festivals')
const [triagePriority, setTriagePriority] = useState<string>('');     // Required: P1/P2/P3/P4
const [showTriagePicker, setShowTriagePicker] = useState(false);
const [alcoholSubstanceFlag, setAlcoholSubstanceFlag] = useState(false);
const [safeguardingFlag, setSafeguardingFlag] = useState(false);
const [disposition, setDisposition] = useState<string>('');            // Required: one of 3 options
const [showDispositionPicker, setShowDispositionPicker] = useState(false);
```

**Validation addition in `handleCompleteTreatment` (after existing validation, before the try block ~line 303):**
```typescript
// Festival-specific validation
if (orgVertical === 'festivals') {
  if (!triagePriority) {
    Alert.alert('Missing Information', 'Please select a triage priority (P1-P4)');
    return;
  }
  if (!disposition) {
    Alert.alert('Missing Information', 'Please select attendee disposition');
    return;
  }
}
```

**`vertical_extra_fields` JSON structure for festivals:**
```typescript
// Written as a JSON string to treatment.verticalExtraFields (WatermelonDB TEXT column)
// Parsed back from JSON when needed
interface FestivalExtraFields {
  triage_priority: 'P1' | 'P2' | 'P3' | 'P4';     // Required
  alcohol_substance: boolean;                          // Required (default false)
  safeguarding_concern: boolean;                       // Required (default false)
  disposition: 'discharged_on_site' | 'transferred_to_hospital' | 'refused_treatment'; // Required
}
```

**`enqueueSyncItem` payload addition (after existing fields ~line 335):**
```typescript
// In handleCompleteTreatment, add to the enqueueSyncItem body:
vertical_extra_fields: orgVertical === 'festivals'
  ? JSON.stringify({
      triage_priority: triagePriority,
      alcohol_substance: alcoholSubstanceFlag,
      safeguarding_concern: safeguardingFlag,
      disposition,
    } as FestivalExtraFields)
  : treatment.verticalExtraFields ?? null,
```

**Note:** The `vertical_extra_fields` column in Supabase is JSONB — the sync layer must parse the JSON string from WatermelonDB before inserting into Supabase, or the column can accept a raw string cast to JSONB. Check the sync pipeline's `enqueueSyncItem` implementation to confirm how JSONB columns are handled. If the sync sends raw strings, Supabase will accept a valid JSON string for a JSONB column via the REST API.

**TST Triage Priority picker items:**
```typescript
const TRIAGE_PRIORITIES = [
  { id: 'P1', label: 'P1 — Immediate (Red)' },
  { id: 'P2', label: 'P2 — Urgent (Yellow)' },
  { id: 'P3', label: 'P3 — Delayed (Green)' },
  { id: 'P4', label: 'P4 — Expectant (Black/Blue)' },
];
```

**Disposition picker items:**
```typescript
const FESTIVAL_DISPOSITIONS = [
  { id: 'discharged_on_site', label: 'Discharged on site' },
  { id: 'transferred_to_hospital', label: 'Transferred to hospital' },
  { id: 'refused_treatment', label: 'Refused treatment' },
];
```

**Alcohol/substance flag and safeguarding flag:** Use `Pressable` toggle buttons with a checked state — same styling pattern as `treatmentTypeButton` / `treatmentTypeButtonSelected` already in the form. These are boolean flags, not pickers.

### Pattern 2: RIDDOR Gate Verification (Plan 20-02)

**What:** Regression test confirming the existing gate returns `{ detected: false }` for festivals vertical.

**Where the gate lives:** `supabase/functions/riddor-detector/index.ts` lines 74-99 (confirmed via direct read).

**Gate logic (already live):**
```typescript
// Already in production in riddor-detector/index.ts:
const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];
let effectiveVertical: string | null = treatment.event_vertical ?? null;
if (!effectiveVertical) {
  // ... fetches org_settings.industry_verticals[0]
}
if (NON_RIDDOR_VERTICALS.includes(effectiveVertical)) {
  return new Response(JSON.stringify({ detected: false, category: null, reason: `...` }), ...);
}
```

**Verification approach for Plan 20-02:**
1. `grep -n "NON_RIDDOR_VERTICALS" supabase/functions/riddor-detector/index.ts` — confirm 1 match
2. `grep -n "festivals" supabase/functions/riddor-detector/index.ts` — confirm it appears in the array
3. `grep -n "detected.*false" supabase/functions/riddor-detector/index.ts` — confirm early return exists
4. Dashboard test: create a test treatment for a festivals org, confirm no RIDDOR badge appears
5. The RIDDOR dashboard page (`web/app/(dashboard)/riddor/page.tsx`) shows incidents — confirm none appear for festivals treatments

**No code changes expected** unless the gate is found absent. If absent, insert the same pattern used in Phase 18-02 plan.

### Pattern 3: Purple Guide PDF Edge Function (Plan 20-03)

**What:** Replace the 501 stub in `event-incident-report-generator/index.ts` with real PDF generation using `@react-pdf/renderer@4.3.2`.

**Files to create/modify:**
```
supabase/functions/event-incident-report-generator/
  index.ts              ← MODIFY: replace 501 stub with real flow
  types.ts              ← MODIFY: add PurpleGuideData interface
  PurpleGuideDocument.tsx  ← CREATE: PDF component
  purple-guide-mapping.ts  ← CREATE: maps treatment DB row to PurpleGuideData
```

**Import pattern (matches riddor-f2508-generator exactly):**
```typescript
import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { createClient } from 'npm:@supabase/supabase-js@2';
```

**`PurpleGuideData` interface (types.ts):**
```typescript
export interface PurpleGuideData {
  // Header
  organisationName: string;
  eventName: string;
  eventDate: string;
  reportGeneratedAt: string;

  // Patient Contact Log (Section 1)
  patientIdentifier: string;        // wristband number or name
  timeOfPresentation: string;       // HH:MM

  // Triage (Section 2)
  triageCategory: 'P1' | 'P2' | 'P3' | 'P4';
  triageLabel: string;              // "P1 Immediate (Red)" etc.

  // Complaint & Mechanism (Section 3)
  presentingComplaint: string;
  mechanismOfInjury: string;

  // Treatment (Section 4)
  treatmentGiven: string[];         // list of treatment types applied
  treatmentNotes: string;

  // Flags (Section 5)
  alcoholSubstanceInvolvement: boolean;
  safeguardingConcern: boolean;

  // Disposition (Section 6)
  disposition: 'discharged_on_site' | 'transferred_to_hospital' | 'refused_treatment';
  dispositionLabel: string;

  // Medic (Section 7)
  medicName: string;
  referenceNumber: string;
}
```

**`PurpleGuideDocument.tsx` structure:** Follow `F2508Document.tsx` exactly — `<Document><Page size="A4" style={...}>`. Use purple as header color (`#6B21A8`) to distinguish from F2508 (which uses `#003366`). The Purple Guide is named after the Events Industry Forum publication. Title: `'Purple Guide — Patient Contact Log'`.

**`purple-guide-mapping.ts`:** Maps a treatment DB row (with joined medics/org/vertical_extra_fields) to `PurpleGuideData`.

**Key mapping decisions:**
- `patientIdentifier`: `treatment.workers?.first_name + ' ' + workers?.last_name` or `'Wristband #' + treatment.reference_number` if no worker name
- `triageCategory`: parsed from `vertical_extra_fields.triage_priority`
- `alcoholSubstanceInvolvement`: parsed from `vertical_extra_fields.alcohol_substance`
- `safeguardingConcern`: parsed from `vertical_extra_fields.safeguarding_concern`
- `disposition`: parsed from `vertical_extra_fields.disposition`
- `treatmentGiven`: `treatment.treatment_types` array → human labels (use a static lookup)

**Main `index.ts` flow (replaces 501 stub):**
```typescript
// 1. Parse body: expect { incident_id: string, event_vertical?: string }
//    (incident_id is actually a treatment ID for festivals — not a riddor_incidents ID)
// 2. Validate event_vertical is in EVENT_VERTICALS
// 3. Create Supabase client with service role key
// 4. Fetch treatment with joins:
//    .from('treatments')
//    .select(`*, medics(first_name, last_name), org_settings(company_name), workers(first_name, last_name)`)
//    .eq('id', incident_id)
//    .single()
// 5. Parse vertical_extra_fields JSON
// 6. Call mapTreatmentToPurpleGuide(treatment) → PurpleGuideData
// 7. renderToBuffer(<PurpleGuideDocument data={...} />)
// 8. Upload to 'event-incident-reports' bucket: `${treatment.org_id}/${incident_id}/PurpleGuide-${Date.now()}.pdf`
// 9. createSignedUrl (7-day expiry)
// 10. Return { success: true, pdf_path: fileName, signed_url: signedUrlData?.signedUrl }
```

**Storage bucket needed (migration 125):**
```sql
-- New migration: 125_event_incident_reports_storage.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-incident-reports', 'event-incident-reports', false)
ON CONFLICT (id) DO NOTHING;
-- RLS: authenticated users can SELECT for their org's treatments
-- service_role can INSERT and UPDATE
```

### Pattern 4: Dashboard PDF Download (Plan 20-04)

**What:** Add an "Event Incident Report" download card to the treatment detail page for festivals treatments.

**File to modify:** `web/app/(dashboard)/treatments/[id]/page.tsx`

The current page is a server component that renders treatment data. Add a conditional section at the bottom (after the Signature card, line ~249) showing the incident report card when `treatment.event_vertical === 'festivals'`.

Because the PDF generation requires a client mutation (button click → fetch → open URL), convert this page to use a hybrid approach: keep the server component for data fetching, but add a `EventIncidentReportCard` client component that accepts `treatmentId` and `vertical` as props.

**Pattern mirrors `riddor/[id]/page.tsx` exactly:**
- Button triggers a `useMutation` that calls `generateEventIncidentPDF(treatmentId)`
- On success: `window.open(data.signed_url, '_blank')`
- On error: `alert('Failed to generate Event Incident Report. Please try again.')`

**New query function to create: `web/lib/queries/event-incidents.ts`:**
```typescript
export async function generateEventIncidentPDF(treatmentId: string): Promise<{
  success: boolean;
  pdf_path: string;
  signed_url: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/event-incident-report-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ incident_id: treatmentId, event_vertical: 'festivals' }),
    }
  );
  if (!response.ok) throw new Error('Failed to generate Event Incident Report PDF');
  return response.json();
}
```

**Note on `incident_id` naming:** The dispatcher and stub function use `incident_id` as the body parameter name, but for festivals the value is a `treatment.id` (UUID of the treatment record), not a `riddor_incidents.id`. This is correct — festivals don't have a `riddor_incidents` row; the treatment IS the incident record.

**Terminology displayed in the dashboard card (Plan 20-04):**
- Card title: `'Purple Guide — Event Incident Report'`
- Card description: `'Patient contact log in Purple Guide format for submission to event organiser'`
- Button label: `'Generate Event Incident Report'`
- Section label on treatment detail page: use `getVerticalCompliance('festivals').reportFormLabel` → `'Event Incident Report'`

### Pattern 5: Terminology Labels (already exist — verify wiring)

Phase 18 already built these — Plan 20-04 must verify they render in context:

```typescript
// All already in services/taxonomy/vertical-outcome-labels.ts:
getPatientLabel('festivals')            // → 'Attendee'
getOutcomeLabel('returned-to-work-same-duties', ..., 'festivals')  // → 'Returned to event / crowd'
getOutcomeLabel('returned-to-work-light-duties', ..., 'festivals') // → 'Attended welfare area — monitoring'

// Already in services/taxonomy/certification-types.ts:
getRecommendedCertTypes('festivals')    // → ['FREC 3', 'FREC 4', 'PHEC', ..., 'Purple Guide Certificate', ...]

// Already in services/taxonomy/vertical-compliance.ts:
VERTICAL_COMPLIANCE.festivals.riddorApplies       // → false
VERTICAL_COMPLIANCE.festivals.primaryFramework    // → 'purple_guide'
VERTICAL_COMPLIANCE.festivals.reportFormLabel     // → 'Event Incident Report'
VERTICAL_COMPLIANCE.festivals.postTreatmentGuidance  // → Purple Guide text (confirmed)
VERTICAL_COMPLIANCE.festivals.complianceBadgeLabel   // → 'Purple Guide'
VERTICAL_COMPLIANCE.festivals.incidentPageLabel      // → 'Event Incidents'
```

**For the dashboard treatment detail page (`/treatments/[id]`):** Currently it hardcodes `'Worker Information'` as the card title (line 99). Phase 20-04 should make this vertical-aware: if `treatment.event_vertical === 'festivals'`, show `'Attendee Information'`. Similarly, `'Worker'` references in the treatment list table should be conditionally relabelled.

**For the venue/organiser terminology:** The booking brief may contain the event organiser contact. Phase 20-04 wiring references `'Organiser'` for the booking client. In the dashboard, the treatment detail page should show `'Event Organiser'` instead of `'Client'` when `event_vertical === 'festivals'`. This is a label change only — no DB changes.

### Anti-Patterns to Avoid

- **Do NOT** create a separate `festivals-form.tsx` page — the single `new.tsx` with `orgVertical === 'festivals'` conditional is the decided pattern.
- **Do NOT** use a RIDDOR incident ID as the `incident_id` for the festivals PDF — festivals treatments do NOT create `riddor_incidents` rows. Pass the `treatment.id` directly.
- **Do NOT** add `triage_priority` as a top-level column on the `treatments` table — it lives in `vertical_extra_fields JSONB` by design decision.
- **Do NOT** call the festivals PDF function with `riddor_incident_id` — it expects `incident_id` (the treatment UUID).
- **Do NOT** render the RIDDOR warning banner for festivals — the form already gates on `INJURY_TYPES.find(...).isRiddorReportable`. Confirm the banner is suppressed for festivals (if injury type is flagged riddor-reportable, the vertical gate stops false positive RIDDOR incidents, but the banner may still show on the form — this could be alarming for medics). Fix: in `handleInjuryTypeSelect`, also check `orgVertical` before setting `riddorFlagged`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout primitives | Custom HTML/CSS PDF | `@react-pdf/renderer@4.3.2` with `Document`, `Page`, `Text`, `View` | Already installed, used in F2508; exact same Deno import works |
| Storage bucket creation | Manual Supabase dashboard click | SQL migration `125_event_incident_reports_storage.sql` | Reproducible; follows migration 019 pattern |
| Vertical routing table | New routing service | Existing `web/lib/pdf/incident-report-dispatcher.ts` `FUNCTION_BY_VERTICAL` record | Already maps `festivals` → `event-incident-report-generator` |
| Patient label | New vertical-to-label map | `getPatientLabel('festivals')` from `vertical-outcome-labels.ts` | Already returns `'Attendee'` |
| RIDDOR gate | New gate logic | Existing gate in `riddor-detector/index.ts` lines 74-99 | Already live — verify don't rebuild |
| Disposition field DB column | New `disposition` column on `treatments` | `vertical_extra_fields JSONB` key | Decided and built in Phase 18 |

---

## Common Pitfalls

### Pitfall 1: `vertical_extra_fields` is JSONB in Supabase but TEXT in WatermelonDB

**What goes wrong:** The medic saves triage data to `treatment.verticalExtraFields` (a WatermelonDB TEXT field). The sync payload sends this as a JSON string. Supabase's JSONB column accepts a valid JSON string from the REST API and auto-parses it. However, if the code double-encodes (calls `JSON.stringify` on an already-stringified value), Supabase will store a quoted string instead of a JSONB object, and the PDF generator's `JSON.parse(treatment.vertical_extra_fields)` will fail.

**How to avoid:** In the sync payload, pass `JSON.stringify({ triage_priority, ... })` exactly once. In the PDF generator, call `JSON.parse(treatment.vertical_extra_fields)` and handle `null` / empty string. Never `JSON.stringify` an already-string value.

**Warning sign:** `typeof treatment.vertical_extra_fields === 'string'` in the Edge Function receiving the DB value — this means it arrived as a JSON string, not parsed JSONB. Call `JSON.parse()` on it.

### Pitfall 2: Festival RIDDOR Banner Still Shows on the Treatment Form

**What goes wrong:** The medic selects an injury type that is flagged `isRiddorReportable: true` (e.g., "fracture"). The form sets `riddorFlagged = true` and shows the RIDDOR warning banner, even though `orgVertical === 'festivals'`. This confuses the medic — RIDDOR does not apply to festival attendees.

**How to avoid:** In `handleInjuryTypeSelect` (line 183), gate the RIDDOR flag on vertical:
```typescript
const handleInjuryTypeSelect = (injuryId: string) => {
  setInjuryTypeId(injuryId);
  setShowInjuryPicker(false);
  const injuryType = INJURY_TYPES.find((it) => it.id === injuryId);
  // Only flag RIDDOR when the vertical actually has RIDDOR
  if (injuryType?.isRiddorReportable && orgVertical !== 'festivals') {
    setRiddorFlagged(true);
  } else {
    setRiddorFlagged(false);
  }
};
```

**Warning sign:** RIDDOR banner appears on treatment form when `orgVertical === 'festivals'`.

### Pitfall 3: PDF Generator Receives `riddor_incident_id` Instead of `incident_id`

**What goes wrong:** The existing `generateF2508PDF` function sends `{ riddor_incident_id: incidentId }` to the F2508 Edge Function. The new `generateEventIncidentPDF` function must send `{ incident_id: treatmentId, event_vertical: 'festivals' }`. If the dashboard code copies the F2508 pattern without changing the body key, the festivals generator will return a 400 ("incident_id is required").

**How to avoid:** The `event-incident-report-generator/index.ts` stub already checks `body.incident_id` (not `body.riddor_incident_id`). The new query function must use `incident_id` as the body key, and pass the `treatment.id` (UUID), not a `riddor_incidents.id`.

### Pitfall 4: `'Venue'` and `'Organiser'` Terminology Not Applied to Existing Components

**What goes wrong:** The treatment detail page at `/treatments/[id]` hardcodes "Worker Information" (line 99). The booking-related views use "Client". If Phase 20-04 only adds the PDF download card and does not update the terminology in the treatment detail, the view will be inconsistent (PDF says "Attendee" but the dashboard says "Worker").

**How to avoid:** As part of 20-04, update `web/app/(dashboard)/treatments/[id]/page.tsx` to:
- Rename "Worker Information" card to "Attendee Information" when `treatment.event_vertical === 'festivals'`
- Use `getPatientLabel(treatment.event_vertical)` for the card title
- Label the booking client section "Event Organiser" when the treatment vertical is festivals

### Pitfall 5: Storage Bucket `event-incident-reports` Does Not Exist

**What goes wrong:** The PDF generator uploads to `supabase.storage.from('event-incident-reports').upload(...)`. If the bucket does not exist, the upload returns a storage error. The function will return HTTP 500.

**How to avoid:** Migration 125 must create the bucket before Plan 20-03 is deployed. The bucket name must exactly match the string used in the Edge Function.

### Pitfall 6: `triage_priority` Required Validation Not Server-Side

**What goes wrong:** The mobile form validates `triagePriority` before completing a treatment. But if a treatment is synced from a legacy device or created programmatically without `vertical_extra_fields`, the PDF generator will receive `null` for `triage_priority` and either crash or render "P?" in the PDF.

**How to avoid:** In `purple-guide-mapping.ts`, handle `null`/missing triage gracefully:
```typescript
triageCategory: fields?.triage_priority ?? 'P3',  // Default to Delayed if missing
triageLabel: TRIAGE_LABELS[fields?.triage_priority ?? 'P3'],
```

Also render a clear "Triage not recorded" string in the PDF rather than crashing.

---

## Code Examples

### Festival Section in Treatment Form

```typescript
// Source: app/treatment/new.tsx — insert after Section 5 (Outcome), before Section 6 (Signature)
// File: app/treatment/new.tsx

{/* Section 5b: Festival-Specific Fields (Purple Guide) */}
{orgVertical === 'festivals' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>5b. Purple Guide — Event Triage</Text>

    {/* Triage Priority — Required */}
    <Text style={styles.fieldLabel}>TST Triage Priority *</Text>
    <Pressable style={styles.pickerButton} onPress={() => setShowTriagePicker(true)}>
      <Text style={styles.pickerButtonText}>
        {TRIAGE_PRIORITIES.find(t => t.id === triagePriority)?.label || 'Select triage priority...'}
      </Text>
    </Pressable>

    {/* Alcohol / Substance Involvement — Required boolean */}
    <Text style={styles.fieldLabel}>Alcohol / Substance Involvement</Text>
    <Pressable
      style={[styles.treatmentTypeButton, alcoholSubstanceFlag && styles.treatmentTypeButtonSelected]}
      onPress={() => setAlcoholSubstanceFlag(prev => !prev)}
    >
      <Text style={[styles.treatmentTypeText, alcoholSubstanceFlag && styles.treatmentTypeTextSelected]}>
        {alcoholSubstanceFlag ? '✓ Yes — alcohol or substance involvement confirmed' : 'No involvement'}
      </Text>
    </Pressable>

    {/* Safeguarding Concern — Required boolean */}
    <Text style={styles.fieldLabel}>Safeguarding Concern</Text>
    <Pressable
      style={[styles.treatmentTypeButton, safeguardingFlag && styles.treatmentTypeButtonSelected]}
      onPress={() => setSafeguardingFlag(prev => !prev)}
    >
      <Text style={[styles.treatmentTypeText, safeguardingFlag && styles.treatmentTypeTextSelected]}>
        {safeguardingFlag ? '✓ Safeguarding concern raised' : 'No safeguarding concern'}
      </Text>
    </Pressable>

    {/* Disposition — Required */}
    <Text style={styles.fieldLabel}>Attendee Disposition *</Text>
    <Pressable style={styles.pickerButton} onPress={() => setShowDispositionPicker(true)}>
      <Text style={styles.pickerButtonText}>
        {FESTIVAL_DISPOSITIONS.find(d => d.id === disposition)?.label || 'Select disposition...'}
      </Text>
    </Pressable>
  </View>
)}

{/* Triage picker (add alongside other BottomSheetPicker components at bottom of return) */}
{orgVertical === 'festivals' && (
  <>
    <BottomSheetPicker
      visible={showTriagePicker}
      onClose={() => setShowTriagePicker(false)}
      title="TST Triage Priority"
      items={TRIAGE_PRIORITIES}
      selectedId={triagePriority}
      onSelect={(id) => { setTriagePriority(id); setShowTriagePicker(false); }}
    />
    <BottomSheetPicker
      visible={showDispositionPicker}
      onClose={() => setShowDispositionPicker(false)}
      title="Attendee Disposition"
      items={FESTIVAL_DISPOSITIONS}
      selectedId={disposition}
      onSelect={(id) => { setDisposition(id); setShowDispositionPicker(false); }}
    />
  </>
)}
```

### Purple Guide PDF Document Component

```typescript
// Source: pattern from supabase/functions/riddor-f2508-generator/F2508Document.tsx
// File: supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx

import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import type { PurpleGuideData } from './types.ts';

const TRIAGE_COLORS: Record<string, string> = {
  P1: '#DC2626', // Red
  P2: '#F59E0B', // Yellow
  P3: '#22C55E', // Green
  P4: '#1F2937', // Black/Blue
};

export function PurpleGuideDocument({ data, generatedAt }: { data: PurpleGuideData; generatedAt: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Purple Guide — Patient Contact Log</Text>
          <Text style={styles.subtitle}>Events Industry Forum — Health, Safety and Welfare at Events</Text>
          <Text style={styles.orgLine}>{data.organisationName} | {data.eventName} | {data.eventDate}</Text>
          <Text style={styles.generatedDate}>Generated: {generatedAt}</Text>
        </View>

        {/* Triage Category — large coloured badge */}
        <View style={[styles.triageBadge, { backgroundColor: TRIAGE_COLORS[data.triageCategory] ?? '#6B7280' }]}>
          <Text style={styles.triageBadgeText}>{data.triageLabel}</Text>
        </View>

        {/* Section 1: Patient Identifier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Patient Identifier</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Wristband / Name:</Text>
            <Text style={styles.value}>{data.patientIdentifier}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Time of Presentation:</Text>
            <Text style={styles.value}>{data.timeOfPresentation}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Reference:</Text>
            <Text style={styles.value}>{data.referenceNumber}</Text>
          </View>
        </View>

        {/* Section 2: Presenting Complaint */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Presenting Complaint / Mechanism</Text>
          <View style={styles.field}>
            <Text style={styles.value}>{data.presentingComplaint || data.mechanismOfInjury || 'Not recorded'}</Text>
          </View>
        </View>

        {/* Section 3: Treatment Given */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Treatment Given</Text>
          {data.treatmentGiven.map((t, i) => (
            <Text key={i} style={styles.value}>{'\u2022'} {t}</Text>
          ))}
          {data.treatmentNotes ? (
            <View style={styles.field}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{data.treatmentNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Section 4: Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Flags</Text>
          <View style={styles.flagRow}>
            <Text style={styles.flagLabel}>Alcohol / Substance Involvement:</Text>
            <Text style={[styles.flagValue, data.alcoholSubstanceInvolvement ? styles.flagYes : styles.flagNo]}>
              {data.alcoholSubstanceInvolvement ? 'YES' : 'NO'}
            </Text>
          </View>
          <View style={styles.flagRow}>
            <Text style={styles.flagLabel}>Safeguarding Concern:</Text>
            <Text style={[styles.flagValue, data.safeguardingConcern ? styles.flagYes : styles.flagNo]}>
              {data.safeguardingConcern ? 'YES' : 'NO'}
            </Text>
          </View>
        </View>

        {/* Section 5: Disposition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Attendee Disposition</Text>
          <View style={styles.field}>
            <Text style={styles.value}>{data.dispositionLabel}</Text>
          </View>
        </View>

        {/* Section 6: Medic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Attending Medic</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.medicName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Signature:</Text>
            <Text style={styles.value}>[Captured on mobile device — stored digitally]</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by SiteMedic from treatment record {data.referenceNumber}.
          </Text>
          <Text style={styles.footerText}>
            Purple Guide framework: Events Industry Forum — www.thepurpleguide.co.uk
          </Text>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.5 },
  header: { marginBottom: 16, borderBottom: '2 solid #6B21A8', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#6B21A8', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#666', marginBottom: 4 },
  orgLine: { fontSize: 10, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  generatedDate: { fontSize: 8, color: '#999' },
  triageBadge: {
    padding: '8 16', borderRadius: 4, marginBottom: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  triageBadgeText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  section: { marginBottom: 14, paddingBottom: 10, borderBottom: '1 solid #E5E7EB' },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#1F2937', marginBottom: 6, textTransform: 'uppercase' },
  field: { marginBottom: 4 },
  label: { fontSize: 8, color: '#6B7280', fontWeight: 'bold', marginBottom: 2 },
  value: { fontSize: 10, color: '#1F2937' },
  flagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  flagLabel: { fontSize: 9, color: '#374151', flex: 1 },
  flagValue: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2 },
  flagYes: { color: '#DC2626', backgroundColor: '#FEF2F2' },
  flagNo: { color: '#16A34A', backgroundColor: '#F0FDF4' },
  footer: { marginTop: 16, paddingTop: 10, borderTop: '1 solid #E5E7EB' },
  footerText: { fontSize: 7, color: '#9CA3AF', marginBottom: 3 },
});
```

### Dashboard Event Incident Card

```typescript
// Source: pattern from web/app/(dashboard)/riddor/[id]/page.tsx lines 397-431
// File: web/app/(dashboard)/treatments/[id]/page.tsx (add as client component wrapper)

// New client component: web/components/dashboard/EventIncidentReportCard.tsx
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { generateEventIncidentPDF } from '@/lib/queries/event-incidents';

export function EventIncidentReportCard({ treatmentId }: { treatmentId: string }) {
  const [generating, setGenerating] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      return generateEventIncidentPDF(treatmentId);
    },
    onSuccess: (data) => {
      setGenerating(false);
      if (data.signed_url) window.open(data.signed_url, '_blank');
    },
    onError: () => {
      setGenerating(false);
      alert('Failed to generate Event Incident Report. Please try again.');
    },
  });

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Purple Guide — Event Incident Report</CardTitle>
        <CardDescription>
          Patient contact log in Purple Guide format for submission to the event organiser
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => mutation.mutate()} disabled={generating}>
          {generating ? 'Generating...' : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Event Incident Report
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Generates a pre-filled Purple Guide Patient Contact Log PDF.
          Provide a copy to the event organiser as required.
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Exact File Locations

### Plan 20-01: Festival Form Fields

| File | Path | Action |
|------|------|--------|
| Treatment form | `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` | Add state, validation, conditional section, update `enqueueSyncItem` payload |
| Constants (inline) | `app/treatment/new.tsx` | Add `TRIAGE_PRIORITIES` and `FESTIVAL_DISPOSITIONS` arrays near top of file |
| RIDDOR banner fix | `app/treatment/new.tsx` line ~189 | Gate `setRiddorFlagged(true)` on `orgVertical !== 'festivals'` |

### Plan 20-02: RIDDOR Gate Verification

| File | Path | Action |
|------|------|--------|
| RIDDOR detector | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/index.ts` | Read-only verify — `NON_RIDDOR_VERTICALS` array at lines 74-99 includes `festivals` |
| F2508 generator | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts` | Read-only verify — `NON_RIDDOR_VERTICALS` at lines 102-110 returns 400 for festivals |

### Plan 20-03: Purple Guide PDF

| File | Path | Action |
|------|------|--------|
| Edge Function main | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/index.ts` | Replace 501 stub with real PDF generation flow |
| Types | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/types.ts` | Add `PurpleGuideData` interface |
| PDF component | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx` | Create — Purple Guide PDF layout |
| Mapper | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/purple-guide-mapping.ts` | Create — maps treatment row to PurpleGuideData |
| Storage migration | `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/125_event_incident_reports_storage.sql` | Create — `event-incident-reports` bucket |

### Plan 20-04: Dashboard Wiring

| File | Path | Action |
|------|------|--------|
| Treatment detail page | `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/treatments/[id]/page.tsx` | Add conditional `EventIncidentReportCard` and vertical-aware terminology |
| Event incident card | `/Users/sabineresoagli/GitHub/sitemedic/web/components/dashboard/EventIncidentReportCard.tsx` | Create — client component for PDF download button |
| Query function | `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/event-incidents.ts` | Create — `generateEventIncidentPDF()` |

---

## What Phase 18 Already Built (Do NOT Rebuild)

| Item | Status | Location |
|------|--------|----------|
| `VERTICAL_COMPLIANCE.festivals.riddorApplies = false` | DONE | `services/taxonomy/vertical-compliance.ts` line 127 |
| `getPatientLabel('festivals')` → `'Attendee'` | DONE | `services/taxonomy/vertical-outcome-labels.ts` line 125 |
| `getRecommendedCertTypes('festivals')` → FREC 3 first | DONE | `services/taxonomy/certification-types.ts` line 131 |
| Festival outcome label overrides | DONE | `services/taxonomy/vertical-outcome-labels.ts` lines 37-40 |
| `MECHANISM_PRESETS_BY_VERTICAL.festivals` | DONE | `services/taxonomy/mechanism-presets.ts` lines 59-68 |
| `vertical_extra_fields JSONB` on Supabase `treatments` | DONE | Migration `124_vertical_schema_v4.sql` line 18 |
| `vertical_extra_fields` TEXT on WatermelonDB `treatments` | DONE | `src/database/schema.ts` line 34; `Treatment.ts` line 53 |
| `Treatment.verticalExtraFields` model field | DONE | `src/database/models/Treatment.ts` line 53 |
| `event_vertical` in sync payload | DONE | `app/treatment/new.tsx` line 334 |
| RIDDOR gate in `riddor-detector` | DONE | `supabase/functions/riddor-detector/index.ts` lines 74-99 |
| NON_RIDDOR validation in F2508 generator | DONE | `supabase/functions/riddor-f2508-generator/index.ts` lines 102-110 |
| `event-incident-report-generator` stub | DONE (501) | `supabase/functions/event-incident-report-generator/index.ts` |
| `incident-report-dispatcher.ts` routing `festivals` → `event-incident-report-generator` | DONE | `web/lib/pdf/incident-report-dispatcher.ts` line 26 |
| Mobile `OrgContext` with `primaryVertical` | DONE | `src/contexts/OrgContext.tsx` |
| `orgVertical` read from route params in `new.tsx` | DONE | `app/treatment/new.tsx` lines 79-82 |

---

## State of the Art

| Old Approach | Current Approach | Phase | Impact |
|--------------|------------------|-------|--------|
| No vertical gate — RIDDOR fires for all treatments | NON_RIDDOR_VERTICALS gate in detector | Phase 18-02 | Festivals orgs no longer generate false RIDDOR incidents |
| Single global org vertical | Per-booking `event_vertical` override | Phase 18 | Medic on a multi-vertical org gets correct form for the booking |
| `event-incident-report-generator` returns 501 | Needs full Purple Guide PDF implementation | Phase 20-03 | Festivals organiser can download PDF |
| Treatment detail page has no vertical-aware terminology | Needs conditional card + labels | Phase 20-04 | Dashboard shows "Attendee", "Organiser", "Purple Guide" badge |

---

## Open Questions

1. **Does `enqueueSyncItem` accept JSONB or does it need the raw string?**
   - What we know: The sync payload includes `event_vertical: treatment.eventVertical ?? null` and `booking_id: treatment.bookingId ?? null` as plain strings. The `vertical_extra_fields` is a `TEXT` in WatermelonDB and `JSONB` in Supabase.
   - What's unclear: Does `enqueueSyncItem` send the raw string, which Supabase auto-casts to JSONB? Or does it need to be pre-parsed?
   - Recommendation: Inspect `src/contexts/SyncContext.tsx` (the `enqueueSyncItem` implementation) to confirm the HTTP payload format before writing 20-01. Sending a valid JSON string to a JSONB column via Supabase REST API is accepted — Supabase will parse it. But verify rather than assume.

2. **Does the treatment detail page need to become a client component to render the PDF download card?**
   - What we know: `/treatments/[id]/page.tsx` is currently a server component (no `'use client'` directive). The PDF download needs `useMutation` which requires a client component.
   - Recommendation: Keep the page as a server component. Extract only the download card into a `EventIncidentReportCard.tsx` client component (the same pattern as `RIDDORStatusBadge` etc). Pass `treatmentId` and `eventVertical` as props from the server component.

3. **Medics table vs workers table for medic name in PDF**
   - What we know: The F2508 generator joins `workers` for the injured person name. The medic who performed the treatment is in the `medics` table (not `workers`). The treatment has `medic_id` column.
   - What's unclear: Does the `medics` table have `first_name` and `last_name` columns, or does it join `profiles`?
   - Recommendation: Inspect the `medics` table migration before writing `purple-guide-mapping.ts`. If `medics` links to `profiles`, the join is `medics!medic_id(profiles(first_name, last_name))`. If `medics` has its own name columns, join directly.

4. **`event_vertical` on treatments: does `fetchTreatmentById` currently return it?**
   - What we know: `fetchTreatmentById` uses `.select('*, worker:workers(*)')` — the wildcard `*` will include all columns, including `event_vertical` and `vertical_extra_fields` added by migration 124.
   - Recommendation: Verify by checking the TypeScript `TreatmentWithWorker` type in `web/types/database.types.ts` — if `event_vertical` and `vertical_extra_fields` are defined there, the type system is aligned. If they're missing from the type, the server component will receive the data but TypeScript will complain about accessing `treatment.event_vertical`. Add the fields to the type as part of 20-04.

---

## Sources

### Primary (HIGH confidence — files read directly from live codebase)

- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/index.ts` — confirmed RIDDOR gate at lines 74-99; `NON_RIDDOR_VERTICALS` includes `festivals`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts` — confirmed NON_RIDDOR validation at lines 102-110; full PDF flow read
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/F2508Document.tsx` — confirmed `@react-pdf/renderer` component pattern; styles; Deno npm imports
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/types.ts` — confirmed `F2508Data` and `RIDDORIncidentData` interfaces
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/index.ts` — confirmed 501 stub; `EVENT_VERTICALS` array; `incident_id` body param
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/types.ts` — confirmed `EventIncidentData` interface (minimal, needs `PurpleGuideData`)
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/pdf/incident-report-dispatcher.ts` — confirmed `FUNCTION_BY_VERTICAL` table maps `festivals` → `event-incident-report-generator`
- `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` — confirmed full form source; `orgVertical` from params/OrgContext; `enqueueSyncItem` payload includes `event_vertical` and `booking_id`; RIDDOR banner logic at line 189
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/Treatment.ts` — confirmed `@text('vertical_extra_fields') verticalExtraFields?: string`
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts` — confirmed version 4; `vertical_extra_fields` column present
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-compliance.ts` — confirmed `festivals.riddorApplies = false`, `festivals.primaryFramework = 'purple_guide'`, full config
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-outcome-labels.ts` — confirmed `getPatientLabel('festivals')` → `'Attendee'`; festival outcome overrides
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/certification-types.ts` — confirmed `VERTICAL_CERT_TYPES.festivals` with FREC 3 first
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/mechanism-presets.ts` — confirmed `MECHANISM_PRESETS_BY_VERTICAL.festivals` (8 presets)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/124_vertical_schema_v4.sql` — confirmed `vertical_extra_fields JSONB` on treatments table
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/019_riddor_reports_storage.sql` — confirmed storage bucket pattern for RIDDOR reports
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/riddor/[id]/page.tsx` — confirmed full F2508 download flow; `useMutation` → `generateF2508PDF` → `window.open(signed_url)` pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/treatments/[id]/page.tsx` — confirmed server component; no event_vertical awareness; hardcoded "Worker Information"
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/riddor.ts` — confirmed `generateF2508PDF` fetch pattern using `NEXT_PUBLIC_SUPABASE_URL/functions/v1/` URL
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/treatments.ts` — confirmed `fetchTreatmentById` uses `select('*, worker:workers(*)')` — wildcard includes `event_vertical`
- `/Users/sabineresoagli/GitHub/sitemedic/src/contexts/OrgContext.tsx` — confirmed exists and exports `useOrg()` with `primaryVertical`
- `.planning/phases/18-vertical-infrastructure-riddor-fix/18-02-SUMMARY.md` — confirmed Phase 18-02 completed; all stubs and dispatcher live

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| RIDDOR gate (Plan 20-02) | HIGH | Read `riddor-detector/index.ts` directly; gate is live at lines 74-99 |
| `vertical_extra_fields` structure | HIGH | Column exists in migration 124; Treatment model has it; form reads `params` and sets `eventVertical` |
| PDF pattern (`@react-pdf/renderer`) | HIGH | Full F2508Document.tsx read; exact import string confirmed |
| `event-incident-report-generator` stub state | HIGH | Read file directly; returns 501 with `incident_id` body param |
| Dashboard PDF download pattern | HIGH | Read full riddor/[id]/page.tsx; useMutation + window.open pattern |
| Storage bucket pattern | HIGH | Read migration 019 in full; bucket name/RLS pattern clear |
| `medics` table structure for medic name | LOW | Not inspected; open question 3 above |
| `TreatmentWithWorker` type completeness | LOW | Not inspected; open question 4 above |

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable codebase, no external API dependencies for the form/PDF work)
