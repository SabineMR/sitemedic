# Phase 22: Football / Sports Vertical — Research

**Researched:** 2026-02-17
**Domain:** Football vertical form, dual patient type (Player/Spectator), FA incident reporting, SGSA spectator reporting, RIDDOR gate verification, cert profile extension
**Confidence:** HIGH for codebase state; MEDIUM for SGSA form field specifics; LOW for FA form field enumeration (official PDFs not publicly machine-readable)

---

## Summary

Phase 22 builds the football vertical on top of the infrastructure established in Phase 18. The foundational infrastructure is complete: the `sporting_events` vertical is registered in all taxonomy files, `vertical_extra_fields JSONB` exists on the `treatments` table (migration 124), the `fa-incident-generator` Edge Function stub routes correctly, the `incident-report-dispatcher.ts` maps `sporting_events` to `fa-incident-generator`, and the RIDDOR gate in `riddor-detector/index.ts` correctly gates `sporting_events` with `{ detected: false }`. Phase 22's primary work is: (1) building the dual-patient-type form UI in mobile `new.tsx` (Player fields vs Spectator fields written into `vertical_extra_fields`), (2) fleshing out the `fa-incident-generator` Edge Function to produce two PDF formats, and (3) wiring the football-specific cert types and terminology.

The key regulatory split is between players and spectators. Player on-pitch injuries fall under the FA Match Day Injury Report framework (grassroots + professional). Spectator injuries at licensed grounds (Premier League, EFL Championship and above) fall under SGSA requirements. The **research flag** from the roadmap — "confirm whether SGSA form is mandatory (professional clubs) or only FA form (grassroots)" — is answered as follows: if clients are at professional grounds (licensed under the Sports Grounds Safety Authority), SGSA reporting is mandatory. If clients are purely grassroots, the FA incident report is sufficient. For v2.0 scope the `fa-incident-generator` must output **two PDF formats** routed by `patient_type` in `vertical_extra_fields`: FA Match Day Injury Form for `patient_type: 'player'` and SGSA Medical Incident Report for `patient_type: 'spectator'`.

The dual patient type architecture is unique in the platform. No prior vertical has had two entirely different form paths inside one vertical. The `patient_type` value must be stored in `vertical_extra_fields` JSONB (the column already exists) and must drive both: the mobile form field set shown, and the Edge Function PDF route selection. The `fa-incident-generator` reads `patient_type` from `vertical_extra_fields` when determining which PDF template to render. The vertical ID stays `sporting_events` throughout — there is no `football` vertical ID.

**Primary recommendation:** Implement player/spectator selector as the first UI element on the treatment form when `orgVertical === 'sporting_events'`; store `patient_type` in `vertical_extra_fields` and use it as the sole routing key in the PDF generator. No schema changes needed — `vertical_extra_fields` JSONB already exists.

---

## Standard Stack

### Core (no new packages needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@nozbe/watermelondb` | (existing, schema v4) | Mobile offline DB — `vertical_extra_fields` already in schema | Confirmed in `src/database/schema.ts` v4 |
| `npm:@react-pdf/renderer@4.3.2` | 4.3.2 | PDF rendering in Deno Edge Functions | Confirmed in `riddor-f2508-generator/index.ts` line 12 |
| `npm:@supabase/supabase-js@2` | 2 | Supabase client in Edge Functions | All existing Edge Functions |
| `npm:react@18.3.1` | 18.3.1 | React for PDF Document components in Deno | Confirmed in `F2508Document.tsx` line 8 |
| `expo-router` `useLocalSearchParams` | (existing) | Pass `event_vertical` as route param | Already in `app/treatment/new.tsx` line 79 |
| `@supabase/supabase-js` | 2 | Web Supabase client for PDF dispatch | `web/lib/pdf/incident-report-dispatcher.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-native-async-storage/async-storage` | 2.2.0 | Org vertical cache | Already in OrgContext.tsx |

**Installation:** No new packages required for Phase 22.

---

## Architecture Patterns

### Recommended Project Structure

Phase 22 adds to the existing structure:

```
app/treatment/
  new.tsx                        # Add football dual-patient-type section (conditional on orgVertical === 'sporting_events')

supabase/functions/fa-incident-generator/
  index.ts                       # Replace 501 stub with full PDF routing logic
  types.ts                       # Expand FAIncidentData to include football fields
  FAPlayerDocument.tsx           # NEW: FA Match Day Injury Form PDF component
  FASpectatorDocument.tsx        # NEW: SGSA Medical Incident Report PDF component
  fa-player-mapping.ts           # NEW: Map treatment + vertical_extra_fields to FA player PDF fields
  fa-spectator-mapping.ts        # NEW: Map treatment + vertical_extra_fields to SGSA spectator PDF fields

services/taxonomy/
  certification-types.ts         # Add football cert types (ATMMiF, ITMMiF, FA Advanced Trauma, FA Concussion Module)
  vertical-outcome-labels.ts     # No change needed (sporting_events already has 'Returned to play')

web/lib/org-labels.ts            # No change needed (sporting_events already mapped to 'Participant'/'Stadium'/'Match day')
```

### Pattern 1: Dual Patient Type Selector

**What:** When `orgVertical === 'sporting_events'`, the first UI element in the treatment form is a patient type toggle — "Player" or "Spectator". The selection drives which subsequent fields render.

**When to use:** Only inside `sporting_events` vertical context.

**State stored in `vertical_extra_fields`:** JSON-serialised at treatment completion and included in sync payload.

```typescript
// Source: pattern from app/treatment/new.tsx line 113 (eventVertical set at treatment init)
// New state in new.tsx for football vertical:

const isFootball = orgVertical === 'sporting_events';

// Patient type state (football only)
const [footballPatientType, setFootballPatientType] = useState<'player' | 'spectator' | null>(null);

// Player-specific fields
const [phaseOfPlay, setPhaseOfPlay] = useState<string>('');          // 'in_play' | 'warm_up' | 'half_time' | 'training'
const [contactType, setContactType] = useState<string>('');           // 'contact' | 'non_contact'
const [hiaOutcome, setHiaOutcome] = useState<string>('');             // 'no_hia' | 'hia_passed' | 'hia_failed_removed'
const [faSeverity, setFaSeverity] = useState<string>('');             // 'minor' | 'moderate' | 'severe' | 'major'
const [squadNumber, setSquadNumber] = useState<string>('');

// Spectator-specific fields
const [standLocation, setStandLocation] = useState<string>('');
const [referralOutcome, setReferralOutcome] = useState<string>('');   // 'treated_on_site' | 'referred_to_hospital' | 'ambulance_conveyed'
const [safeguardingFlag, setSafeguardingFlag] = useState<boolean>(false);
```

**Writing to `vertical_extra_fields`:** At `handleCompleteTreatment`, build the JSON object and write it:

```typescript
// Source: vertical_extra_fields is stored as raw JSON string in WatermelonDB (Treatment.ts line 53)
// In handleCompleteTreatment, before enqueueSyncItem:

let verticalExtraFields: Record<string, unknown> | null = null;

if (isFootball && footballPatientType) {
  if (footballPatientType === 'player') {
    verticalExtraFields = {
      patient_type: 'player',
      phase_of_play: phaseOfPlay,
      contact_type: contactType,
      hia_outcome: hiaOutcome,
      fa_severity: faSeverity,
      squad_number: squadNumber || null,
    };
  } else {
    verticalExtraFields = {
      patient_type: 'spectator',
      stand_location: standLocation,
      referral_outcome: referralOutcome,
      safeguarding_flag: safeguardingFlag,
    };
  }
}

// Update treatment record before sync
await treatment.update((t) => {
  t.status = 'complete';
  t.verticalExtraFields = verticalExtraFields ? JSON.stringify(verticalExtraFields) : undefined;
  t.updatedAt = Date.now();
  t.lastModifiedAt = Date.now();
});

// Add to sync payload (existing enqueueSyncItem call):
// vertical_extra_fields: verticalExtraFields ?? null,
```

### Pattern 2: RIDDOR Gate Verification

**What:** The RIDDOR gate in `riddor-detector/index.ts` (lines 75–99) already gates `sporting_events` as a non-RIDDOR vertical. Phase 22 must **verify** this gate works — no new code is needed.

**Verification query:** The gate constant is:
```typescript
// Source: supabase/functions/riddor-detector/index.ts line 75
const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];
```

`sporting_events` is present. Player on-pitch injuries correctly return `{ detected: false, category: null, reason: 'RIDDOR does not apply to vertical: sporting_events' }`.

**The player vs spectator distinction is irrelevant for RIDDOR gating.** Both player and spectator incidents at a `sporting_events` vertical pass through this same gate — neither triggers RIDDOR. (Staff/crew injuries at the ground could theoretically be RIDDOR-reportable, but the architecture note in `vertical-compliance.ts` line 158 already flags this: "For STAFF injuries, RIDDOR may apply.") For Phase 22, no additional RIDDOR gate logic is needed.

### Pattern 3: FA Incident Generator — Dual PDF Routing

**What:** Replace the 501 stub in `fa-incident-generator/index.ts` with logic that reads `patient_type` from `vertical_extra_fields` and routes to two PDF components.

**Routing logic:**

```typescript
// Source: replace stub in supabase/functions/fa-incident-generator/index.ts
// After fetching treatment + joining vertical_extra_fields:

const extraFields = treatment.vertical_extra_fields as Record<string, unknown> | null;
const patientType = extraFields?.patient_type as 'player' | 'spectator' | undefined;

if (!patientType) {
  return new Response(
    JSON.stringify({ error: 'vertical_extra_fields.patient_type is required for football incidents' }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

// Route PDF generation
if (patientType === 'player') {
  const pdfData = mapTreatmentToFAPlayer(treatment, extraFields);
  const pdfBuffer = await renderToBuffer(<FAPlayerDocument data={pdfData} />);
  // Upload to storage bucket: 'fa-incident-reports' path: `${incidentId}/FA-Player-${Date.now()}.pdf`
} else {
  const pdfData = mapTreatmentToSGSASpectator(treatment, extraFields);
  const pdfBuffer = await renderToBuffer(<FASpectatorDocument data={pdfData} />);
  // Upload to storage bucket: 'fa-incident-reports' path: `${incidentId}/SGSA-Spectator-${Date.now()}.pdf`
}
```

**Request body:** The dispatcher already passes `{ incident_id: incidentId, event_vertical: vertical }`. For Phase 22 the generator needs `treatment_id` (to fetch `vertical_extra_fields`). The dispatcher should pass `treatment_id`. Alternatively, the generator fetches the treatment by `incident_id` via a `treatments` join (same pattern as `riddor-f2508-generator` which joins `treatments` via `riddor_incidents`).

**Storage bucket:** Create a new Supabase Storage bucket `fa-incident-reports` (analogous to `riddor-reports`). The Phase 22 SQL migration should include the bucket creation via `storage.buckets` INSERT or Supabase dashboard setup.

### Pattern 4: FA Player PDF — Field Mapping

**What:** The FA Match Day Injury Form for player incidents needs these fields (MEDIUM confidence — derived from FA surveillance study data categories and consensus statement):

| Field | Source in `vertical_extra_fields` | FA Form Section |
|-------|----------------------------------|-----------------|
| Phase of play | `phase_of_play` | Injury circumstance |
| Contact / Non-contact | `contact_type` | Mechanism |
| HIA Outcome | `hia_outcome` | Head injury |
| FA Severity (days lost) | `fa_severity` | Severity |
| Squad number | `squad_number` | Player info |

Plus from standard treatment record:
- Player name (`worker.first_name`, `worker.last_name`)
- Position on field (from `treatment_notes` or `body_part`)
- Date of incident (`treatment.created_at`)
- Injury type (`treatment.injury_type`)
- Body part (`treatment.body_part`)
- Treatment given (`treatment.treatment_types`)
- Outcome (`treatment.outcome`)
- Club / org (`org_settings.company_name` or similar)

### Pattern 5: SGSA Spectator PDF — Field Mapping

**What:** The SGSA Standard Medical Incident Report Form for spectator incidents (confirmed available from sgsa.org.uk, February 2024 version, MEDIUM confidence — PDF binary not parsed but categories confirmed from SGSA statistics publications):

| Field | Source in `vertical_extra_fields` | SGSA Form Section |
|-------|----------------------------------|-------------------|
| Stand location | `stand_location` | Location / venue |
| Medical referral outcome | `referral_outcome` | Outcome |
| Safeguarding flag | `safeguarding_flag` | Safeguarding |

Plus from standard treatment record:
- Date / time of incident
- Age (if known — from `workers` table)
- Sex (if known)
- Injury / illness type
- Treatment given
- Admitted to hospital (derived from `referral_outcome === 'referred_to_hospital'`)
- Ground / venue name
- Match (from booking brief)

**Confirmed SGSA data categories from statistics page:** The SGSA publishes "a summary of reported injuries" from Premier League and Football League clubs, covering competitive league and cup games. The categories the SGSA tracks include: injury type, whether ambulance was called, whether admitted to hospital, and demographic data. The form aligns with these categories.

### Pattern 6: Football Cert Types

**What:** Add football-specific cert types to `services/taxonomy/certification-types.ts` and wire `VERTICAL_CERT_TYPES['sporting_events']` to include them.

**Current state:** `sporting_events` in `VERTICAL_CERT_TYPES` (line 133) is:
```typescript
sporting_events: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider', 'AED Trained', 'SIA Door Supervisor', 'Event Safety Awareness'],
```

**Phase 22 update:** Add to `CERT_TYPES` array and `CERT_TYPE_INFO`:
```typescript
// Add to CERT_TYPES (services/taxonomy/certification-types.ts)
// -- Football / Sporting events ──────────────────────────────────────────
'ATMMiF',                        // Advanced Trauma Medical Management in Football
'ITMMiF',                        // Intermediate Trauma Medical Management in Football
'FA Advanced Trauma Management', // ATMMiF reaccreditation / equivalent
'FA Concussion Module',          // England Football concussion guidelines module (free online)
```

**Update `VERTICAL_CERT_TYPES['sporting_events']`:**
```typescript
sporting_events: [
  'ATMMiF',                        // Most relevant for football pitchside — FA highest medical qual
  'ITMMiF',                        // Mid-level football specific trauma
  'FA Advanced Trauma Management', // Alias / reaccreditation path
  'FA Concussion Module',          // Concussion awareness mandatory for all football medics
  'FREC 4', 'PHEC', 'HCPC Paramedic', 'ALS Provider',
  'FREC 3', 'AED Trained', 'SIA Door Supervisor', 'Event Safety Awareness',
],
```

**Source:** England Football Learning website confirms ATMMiF is "the highest medical qualification" for football; ITMMiF is the intermediate; FA Concussion Module is available as a free online module; FA Advanced Trauma Management Reaccreditation is the renewal path.

### Pattern 7: Football Terminology

**What:** The requirement FOOT-05 says "Player" replaces "Worker", "Pitch / Ground" replaces "Site", "Club" replaces "Client".

**Current state:** `org-labels.ts` already defines `sporting_events`:
```typescript
sporting_events: {
  personSingular: 'Participant',
  personPlural:   'Participants',
  locationTerm:   'Stadium',
  periodTerm:     'Match day',
  eventTerm:      'Event',
}
```

**Phase 22 update needed:** The requirement specifies "Player" (not "Participant") and "Pitch / Ground" (not "Stadium") and "Club" (not "Event"). Update `org-labels.ts` for `sporting_events`:
```typescript
sporting_events: {
  personSingular: 'Player',           // Changed from 'Participant'
  personPlural:   'Players',          // Changed from 'Participants'
  locationTerm:   'Pitch / Ground',   // Changed from 'Stadium'
  periodTerm:     'Match day',        // No change
  eventTerm:      'Club',             // Changed from 'Event'
  primaryVertical: 'sporting_events',
}
```

**Note:** The mobile `getPatientLabel()` in `vertical-outcome-labels.ts` returns `'Participant'` for `sporting_events`. Phase 22 must update this to `'Player'` to match FOOT-05.

**Anti-pattern:** Do NOT add a separate `'football'` vertical ID. The DB vertical ID is and remains `'sporting_events'`. The football-specific UI language is purely a label concern.

### Anti-Patterns to Avoid

- **Do NOT introduce a `'football'` vertical ID** — all existing infrastructure uses `'sporting_events'`; adding a separate ID would require updating RIDDOR gate, dispatcher, compliance config, cert types, mechanism presets, and booking vertical selector
- **Do NOT use separate WatermelonDB tables for football fields** — `vertical_extra_fields JSONB` already exists for this exact purpose; adding columns for football would bloat the schema
- **Do NOT gate RIDDOR per patient_type within the vertical** — the RIDDOR gate fires at the vertical level (sporting_events → not RIDDOR); there is no need for player-vs-spectator sub-gating
- **Do NOT add `patient_type` as a top-level treatment column** — it belongs in `vertical_extra_fields`; other verticals do not need it
- **Do NOT split `fa-incident-generator` into two Edge Functions** — one function handles both PDF types via `patient_type` routing; this avoids doubling the Supabase function count and the dispatcher stays simple

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical ID for football | New `'football'` vertical | Existing `'sporting_events'` | All infrastructure (RIDDOR gate, dispatcher, compliance config) already uses this ID |
| Football form field storage | New DB columns | `vertical_extra_fields JSONB` (already in schema v4) | Column exists and is typed for this exact purpose |
| PDF generation library | Custom HTML/CSS PDF | `npm:@react-pdf/renderer@4.3.2` | Already used in `riddor-f2508-generator`; pattern established |
| Supabase client in Deno | Custom HTTP client | `npm:@supabase/supabase-js@2` | Already in all Edge Functions |
| PDF dispatch routing | New dispatcher | Existing `web/lib/pdf/incident-report-dispatcher.ts` | Already maps `sporting_events` to `fa-incident-generator`; no changes needed to dispatcher |
| RIDDOR gate for football | New vertical check | Existing gate in `riddor-detector/index.ts` | `sporting_events` is already in `NON_RIDDOR_VERTICALS`; gate already works |

**Key insight:** Phase 18 deliberately scaffolded `fa-incident-generator` with a note "Phase 22+". All routing, gating, and storage infrastructure exists. Phase 22 replaces the 501 stub with real PDF logic and adds the mobile form fields. No architectural decisions remain open.

---

## Common Pitfalls

### Pitfall 1: Reading `vertical_extra_fields` as JSONB in Deno Without Parsing

**What goes wrong:** In WatermelonDB, `vertical_extra_fields` is stored as a raw JSON string (TEXT type in SQLite). When synced to Supabase, the column is JSONB — Supabase returns it already parsed. In Deno Edge Functions, `treatment.vertical_extra_fields` will be a JS object (not a string). Attempting `JSON.parse(treatment.vertical_extra_fields)` will throw if it's already parsed.

**How to avoid:** In `fa-incident-generator/index.ts`, cast directly: `const extraFields = treatment.vertical_extra_fields as Record<string, unknown> | null`. Do not call `JSON.parse()`.

**In mobile `new.tsx`:** `verticalExtraFields` is stored via `Treatment.verticalExtraFields` which is `@text` (string). Use `JSON.stringify()` when writing and `JSON.parse()` when reading locally.

### Pitfall 2: Patient Type Selector Blocks Form Completion if Not Selected

**What goes wrong:** If the football patient-type selector renders as required but the medic hasn't tapped Player or Spectator, `handleCompleteTreatment()` will have `footballPatientType === null`. The validation check catches this but the error message may be confusing.

**How to avoid:** Add explicit validation: `if (isFootball && !footballPatientType) { Alert.alert('Missing Information', 'Please select patient type: Player or Spectator'); return; }`. Place this check alongside existing `workerId` and `injuryTypeId` validation at lines 290–301 in `new.tsx`.

### Pitfall 3: SGSA Form is Only Mandatory for Licensed Grounds

**What goes wrong:** The plan (22-03) says "SGSA Medical Incident Report for spectator incidents" but the SGSA's standard form only applies to grounds licensed under the Safety of Sports Grounds Act 1975 (SSGA) — primarily Premier League and Championship grounds. For grassroots football clubs, no statutory SGSA obligation exists.

**How to avoid:** For Phase 22, implement the SGSA form for ALL spectator incidents at `sporting_events` vertical (it's best practice even where not mandatory). Document in the Edge Function that this is SGSA-aligned but not limited to licensed grounds. This is the safest position and avoids needing a "professional vs grassroots" sub-flag.

**Note on research flag:** The roadmap's research flag asked "confirm whether SGSA form required for v2.0". Answer: implement it for all spectator incidents — it is the correct form regardless of ground tier, and avoids a complex licensing-tier sub-branching that would require knowing each club's tier.

### Pitfall 4: FA Match Day Injury Form is Not a Public Machine-Readable Document

**What goes wrong:** The FA injury form structure must be inferred from research (surveillance studies, FA medical guidance) rather than scraped from an official PDF, because the official FA form is not publicly downloadable from the FA website in a parseable format.

**How to avoid:** The PDF template for `FAPlayerDocument.tsx` should be designed to capture the clinically-standard categories: patient identity, injury classification (body part, type, mechanism), phase of play, contact/non-contact, HIA outcome, FA severity (days-lost classification), and outcome. These fields match the FA/FIFA injury surveillance consensus statement data categories. Do not wait for an official form PDF — design from the consensus fields.

**FA severity classification (confirmed from multiple FA surveillance studies):**
- `minor`: 1–7 days absence from training/match
- `moderate`: 8–28 days absence
- `severe`: 29–89 days absence
- `major`: 90+ days absence (also called "serious")
- `medical_attention`: treated on-pitch, no absence (i.e. able to return to play same day)

### Pitfall 5: HIA Outcome Options Must Align With FA Concussion Protocol

**What goes wrong:** The FA concussion protocol (confirmed from `englandfootball.com/concussion`) requires immediate removal from play for any suspected concussion. The HIA outcome options in the form must reflect FA guidance, not old-style "return to play same day after assessment" which is no longer permitted.

**How to avoid:** Use these HIA outcome options:
- `'no_hia'` — No head injury or concussion suspected
- `'hia_assessed_returned'` — HIA conducted, no concussion found, player cleared to return (FA only allows this for non-concussion head contacts)
- `'hia_concussion_confirmed'` — Concussion suspected or confirmed; player permanently removed from match per FA protocol
- `'hia_hospital_referred'` — Player referred to hospital for further assessment

Do NOT include a "return to play after HIA clearance" option for concussion — the FA protocol prohibits same-day return after concussion.

### Pitfall 6: `fa-incident-generator` Receives Treatment ID, Not RIDDOR Incident ID

**What goes wrong:** The current stub's `FAIncidentData` type (types.ts line 1) has `incident_id` but this is ambiguous — the RIDDOR generator uses `riddor_incident_id` and fetches via `riddor_incidents` table. For football, there is no `riddor_incidents` table entry (RIDDOR is gated out). The dispatcher passes `incident_id` which should be the treatment ID directly.

**How to avoid:** In `fa-incident-generator/index.ts`, treat `incident_id` as the **treatment ID**. Fetch directly from `treatments` table using:
```typescript
const { data: treatment } = await supabase
  .from('treatments')
  .select(`*, workers(first_name, last_name, role, company), organizations(company_name)`)
  .eq('id', body.incident_id)
  .single();
```
Update `FAIncidentData` type to make this explicit: rename `incident_id` → `treatment_id` and update the dispatcher body accordingly.

### Pitfall 7: Supabase Storage Bucket for FA Reports Does Not Exist

**What goes wrong:** The `riddor-f2508-generator` uploads to `riddor-reports` bucket. The `fa-incident-generator` needs its own bucket. If the bucket doesn't exist, `storage.upload()` returns an error and the Edge Function fails.

**How to avoid:** The Phase 22 migration (22-SQL) must create the `fa-incident-reports` bucket. Use Supabase's storage API via a migration or dashboard. Include a RLS policy allowing `org_members` to download (same pattern as `riddor-reports`).

---

## Code Examples

### Existing Edge Function pattern to replace (stub → real)

```typescript
// Source: supabase/functions/fa-incident-generator/index.ts (current 501 stub)
// Current: returns 501 with "Phase 22+" note
// Phase 22: replace with real fetch + PDF generation

// Pattern to follow: supabase/functions/riddor-f2508-generator/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';

Deno.serve(async (req: Request) => {
  // CORS, parse body, validate incident_id
  // ...

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch treatment with worker + org joins
  const { data: treatment } = await supabase
    .from('treatments')
    .select(`
      id, injury_type, body_part, severity, mechanism_of_injury,
      treatment_types, outcome, created_at, reference_number,
      event_vertical, vertical_extra_fields,
      workers(first_name, last_name, role, company),
      organizations(company_name, site_address)
    `)
    .eq('id', body.incident_id)
    .single();

  // Route by patient_type in vertical_extra_fields
  const extraFields = treatment.vertical_extra_fields as Record<string, unknown> | null;
  const patientType = extraFields?.patient_type as 'player' | 'spectator' | undefined;

  let pdfBuffer: ArrayBuffer;
  let fileName: string;

  if (patientType === 'player') {
    const data = mapTreatmentToFAPlayer(treatment, extraFields);
    pdfBuffer = await renderToBuffer(<FAPlayerDocument data={data} generatedAt={generatedAt} />);
    fileName = `${body.incident_id}/FA-Player-${Date.now()}.pdf`;
  } else {
    const data = mapTreatmentToSGSASpectator(treatment, extraFields);
    pdfBuffer = await renderToBuffer(<FASpectatorDocument data={data} generatedAt={generatedAt} />);
    fileName = `${body.incident_id}/SGSA-Spectator-${Date.now()}.pdf`;
  }

  // Upload to 'fa-incident-reports' bucket
  await supabase.storage.from('fa-incident-reports').upload(fileName, pdfBuffer, {
    contentType: 'application/pdf', upsert: false,
  });

  // Return signed URL (7-day expiry)
  const { data: signedUrlData } = await supabase.storage
    .from('fa-incident-reports')
    .createSignedUrl(fileName, 604800);

  return new Response(JSON.stringify({ success: true, signed_url: signedUrlData?.signedUrl }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
```

### Mobile: Football patient type selector pattern

```typescript
// Source: pattern from app/treatment/new.tsx line 411 (section pattern)
// Insert as new Section 0 when isFootball === true:

{isFootball && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Patient Type *</Text>
    <View style={styles.patientTypeRow}>
      <Pressable
        style={[styles.patientTypeButton, footballPatientType === 'player' && styles.patientTypeButtonSelected]}
        onPress={() => setFootballPatientType('player')}
      >
        <Text style={styles.patientTypeText}>Player</Text>
      </Pressable>
      <Pressable
        style={[styles.patientTypeButton, footballPatientType === 'spectator' && styles.patientTypeButtonSelected]}
        onPress={() => setFootballPatientType('spectator')}
      >
        <Text style={styles.patientTypeText}>Spectator</Text>
      </Pressable>
    </View>
  </View>
)}

{/* Player-specific fields */}
{isFootball && footballPatientType === 'player' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Player Information</Text>
    {/* Phase of play, contact type, HIA outcome, FA severity, squad number */}
  </View>
)}

{/* Spectator-specific fields */}
{isFootball && footballPatientType === 'spectator' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Spectator Information</Text>
    {/* Stand location, referral outcome, safeguarding flag */}
  </View>
)}
```

### Dispatcher: no changes needed

```typescript
// Source: web/lib/pdf/incident-report-dispatcher.ts line 30
// Already routes sporting_events to fa-incident-generator:
sporting_events: 'fa-incident-generator',
// No changes needed to dispatcher for Phase 22.
```

### Cert types addition pattern

```typescript
// Source: services/taxonomy/certification-types.ts lines 18-65 (CERT_TYPES as const array)
// Add to CERT_TYPES:
  // ── Football / Sporting events ──────────────────────────────────────────
  'ATMMiF',
  'ITMMiF',
  'FA Advanced Trauma Management',
  'FA Concussion Module',

// Add to CERT_TYPE_INFO:
  'ATMMiF': { label: 'ATMMiF', category: 'sporting_events' as any, description: 'Advanced Trauma Medical Management in Football (FA)' },
  'ITMMiF': { label: 'ITMMiF', category: 'sporting_events' as any, description: 'Intermediate Trauma Medical Management in Football (FA)' },
  'FA Advanced Trauma Management': { label: 'FA Advanced Trauma Mgmt', category: 'sporting_events' as any, description: 'ATMMiF reaccreditation / equivalent (England Football)' },
  'FA Concussion Module': { label: 'FA Concussion Module', category: 'sporting_events' as any, description: 'England Football concussion guidelines online module' },
```

**Note on CertCategory type:** Currently `CertCategory` only has `'medical' | 'construction' | 'dbs' | 'motorsport' | 'events' | 'education' | 'outdoor'`. Add `'sporting_events'` to the union type.

---

## What Already Exists vs What Needs to Be Built

### STATUS: ALREADY COMPLETE (Phase 18)

| Item | File | Status |
|------|------|--------|
| `sporting_events` vertical ID in all taxonomy files | Multiple | COMPLETE |
| `vertical_extra_fields JSONB` on treatments table | `supabase/migrations/124_vertical_schema_v4.sql` | COMPLETE |
| `verticalExtraFields` field on Treatment model | `src/database/models/Treatment.ts` line 53 | COMPLETE |
| RIDDOR gate for `sporting_events` | `supabase/functions/riddor-detector/index.ts` lines 75–99 | COMPLETE |
| F2508 generator returns 400 for `sporting_events` | `supabase/functions/riddor-f2508-generator/index.ts` lines 103–110 | COMPLETE |
| Dispatcher routes `sporting_events` to `fa-incident-generator` | `web/lib/pdf/incident-report-dispatcher.ts` line 30 | COMPLETE |
| `fa-incident-generator` stub (validates vertical, returns 501) | `supabase/functions/fa-incident-generator/index.ts` | COMPLETE (stub) |
| `event_vertical` sync payload inclusion | `app/treatment/new.tsx` line 334 | COMPLETE |
| `booking_id` sync payload inclusion | `app/treatment/new.tsx` line 335 | COMPLETE |
| OrgContext providing `primaryVertical` | `src/contexts/OrgContext.tsx` | COMPLETE (Phase 18) |
| Mechanism presets for `sporting_events` | `services/taxonomy/mechanism-presets.ts` lines 70–79 | COMPLETE |
| Outcome labels for `sporting_events` | `services/taxonomy/vertical-outcome-labels.ts` lines 42–45 | COMPLETE |
| Patient label (`'Participant'`) for `sporting_events` | `services/taxonomy/vertical-outcome-labels.ts` line 131 | COMPLETE (needs update to 'Player') |
| Web org-labels for `sporting_events` | `web/lib/org-labels.ts` lines 64–71 | COMPLETE (needs update per FOOT-05) |
| RIDDOR compliance config for `sporting_events` (non-RIDDOR) | `services/taxonomy/vertical-compliance.ts` lines 150–162 | COMPLETE |

### STATUS: NEEDS WORK (Phase 22)

| Item | File | Work Required |
|------|------|---------------|
| Football patient type selector UI | `app/treatment/new.tsx` | Add conditional Player/Spectator selector block |
| Player-specific fields in treatment form | `app/treatment/new.tsx` | Add phase_of_play, contact_type, hia_outcome, fa_severity, squad_number |
| Spectator-specific fields in treatment form | `app/treatment/new.tsx` | Add stand_location, referral_outcome, safeguarding_flag |
| `vertical_extra_fields` written at completion | `app/treatment/new.tsx` | Build JSON object from football states; include in sync payload |
| Football validation in form completion | `app/treatment/new.tsx` | Require `footballPatientType` when `isFootball` |
| RIDDOR gate verification test | Manual / UAT | Confirm gate fires correctly for sporting_events treatment |
| `fa-incident-generator` full implementation | `supabase/functions/fa-incident-generator/index.ts` | Replace 501 stub with fetch + PDF route |
| `fa-incident-generator` types expansion | `supabase/functions/fa-incident-generator/types.ts` | Add all football fields to `FAIncidentData` |
| `FAPlayerDocument.tsx` (new) | `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` | Create FA Match Day Injury Form PDF component |
| `FASpectatorDocument.tsx` (new) | `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` | Create SGSA Medical Incident Report PDF component |
| `fa-player-mapping.ts` (new) | `supabase/functions/fa-incident-generator/fa-player-mapping.ts` | Map treatment + extra_fields to FA player PDF data |
| `fa-spectator-mapping.ts` (new) | `supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` | Map treatment + extra_fields to SGSA spectator PDF data |
| `fa-incident-reports` storage bucket | Supabase migration / dashboard | Create storage bucket with RLS |
| Football cert types | `services/taxonomy/certification-types.ts` | Add ATMMiF, ITMMiF, FA Advanced Trauma Mgmt, FA Concussion Module |
| `VERTICAL_CERT_TYPES['sporting_events']` update | `services/taxonomy/certification-types.ts` | Prepend FA football certs to the list |
| `getPatientLabel` update for `sporting_events` | `services/taxonomy/vertical-outcome-labels.ts` | Change 'Participant' → 'Player' |
| `org-labels.ts` update for `sporting_events` | `web/lib/org-labels.ts` | Change to 'Player', 'Pitch / Ground', 'Club' per FOOT-05 |
| Admin PDF download trigger | Web admin treatment/incident detail page | Wire `generateIncidentReportPDF()` call (dispatcher already exists) |

---

## Exact File Locations

| Task | File Path | Action |
|------|-----------|--------|
| Football treatment form | `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` | Add patient type selector + conditional Player/Spectator fields |
| FA incident generator | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/index.ts` | Replace 501 stub |
| FA incident types | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/types.ts` | Expand FAIncidentData |
| Player PDF component | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` (new) | Create |
| Spectator PDF component | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` (new) | Create |
| Player field mapping | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/fa-player-mapping.ts` (new) | Create |
| Spectator field mapping | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` (new) | Create |
| Cert types | `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/certification-types.ts` | Add football certs |
| Patient label | `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-outcome-labels.ts` | Change 'Participant' → 'Player' for sporting_events |
| Web org-labels | `/Users/sabineresoagli/GitHub/sitemedic/web/lib/org-labels.ts` | Change sporting_events labels per FOOT-05 |
| Storage bucket migration | `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/125_fa_incident_storage.sql` (new) | Create fa-incident-reports bucket |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-vertical form files | Single `new.tsx` with conditional sections (orgVertical + footballPatientType) | Phase 18 | Phase 22 adds conditional blocks inside existing form |
| Monolithic PDF function | Per-vertical Edge Function stubs in Phase 18, full impl in Phase 22 | Phase 18 → 22 | `fa-incident-generator` gets full implementation in Phase 22 |
| `getPatientLabel('sporting_events')` = 'Participant' | Update to 'Player' per FOOT-05 | Phase 22 | Minor label change in `vertical-outcome-labels.ts` |
| `org-labels.ts` sporting_events = 'Stadium' | Update to 'Pitch / Ground' per FOOT-05 | Phase 22 | Minor label change in `org-labels.ts` |

---

## Open Questions

1. **Admin download UI: where does the "Download PDF" button live?**
   - What we know: `generateIncidentReportPDF()` exists in `web/lib/pdf/incident-report-dispatcher.ts`. The RIDDOR page (`web/app/(dashboard)/riddor/page.tsx`) has an `exportRIDDORIncidentsPDF` call. There is no generic incidents page for non-RIDDOR verticals.
   - What's unclear: Phase 22 plan 22-03 says "admin can download the correct PDF". There is no `sporting_events` incidents page yet in the web app.
   - Recommendation: Add a "Football Incidents" section to the treatments list page or create a new `/incidents` page for non-RIDDOR verticals. The dispatcher already routes correctly; just needs a calling UI component with a Download button.

2. **SGSA form field specifics — age and sex of spectator**
   - What we know: SGSA statistics publications track demographic data. The standard form (February 2024) collects this but the PDF was not machine-readable.
   - What's unclear: Exact field labels for sex (is it "Sex" or "Gender"?) and whether age is a range (e.g. "0-17", "18-64", "65+") or exact age.
   - Recommendation: Use `age_range` (options: `'under_18' | '18_to_64' | '65_plus'`) and `sex` (options: `'male' | 'female' | 'not_given'`) as the safest approach; these are standard UK data collection categories. Capture in `vertical_extra_fields` for spectators.

3. **FA form: is squad number required or optional?**
   - What we know: Squad number uniquely identifies a player and is standard for professional clubs. For grassroots, squad numbers may not be used.
   - What's unclear: Whether the FA injury form mandates squad number.
   - Recommendation: Make `squad_number` optional in both the form (TextInput, can be left blank) and the `FAIncidentData` type (`squad_number?: string`).

4. **Does `incident-report-dispatcher.ts` need updating to pass `treatment_id`?**
   - What we know: Current dispatcher passes `{ incident_id: incidentId, event_vertical: vertical }`. The `fa-incident-generator` needs `treatment_id` to fetch `vertical_extra_fields`.
   - Recommendation: For Phase 22, rename the param in the `fa-incident-generator` to treat `incident_id` as the treatment ID directly. The caller (admin UI or treatment detail page) passes the `treatment.id`. No change to dispatcher signature needed.

---

## Sources

### Primary (HIGH confidence — files read directly)

- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/index.ts` — confirmed 501 stub, vertical validation for `sporting_events`, comment noting "Phase 22+"
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/fa-incident-generator/types.ts` — confirmed `FAIncidentData` interface (minimal — needs expansion)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/index.ts` — confirmed `sporting_events` in `NON_RIDDOR_VERTICALS` at line 75; gate already implemented
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts` — confirmed `sporting_events` guard at lines 103–110
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/F2508Document.tsx` — confirmed PDF component pattern with `npm:react@18.3.1` and `npm:@react-pdf/renderer@4.3.2`
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/pdf/incident-report-dispatcher.ts` — confirmed `sporting_events` maps to `fa-incident-generator`; no changes needed
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/124_vertical_schema_v4.sql` — confirmed `treatments.vertical_extra_fields JSONB` exists
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts` — confirmed schema v4 with `vertical_extra_fields` as `type: 'string', isOptional: true`
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/Treatment.ts` — confirmed `@text('vertical_extra_fields') verticalExtraFields?: string`
- `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` — confirmed `orgVertical`, `bookingId` from params/OrgContext; `vertical_extra_fields` NOT yet written (Phase 22 adds this); form structure fully readable
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/certification-types.ts` — confirmed `sporting_events` cert list; no football-specific certs yet; `CertCategory` type does not include `'sporting_events'`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-compliance.ts` — confirmed `sporting_events` → `fa_incident` framework, `riddorApplies: false`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-outcome-labels.ts` — confirmed `getPatientLabel('sporting_events') === 'Participant'` (needs update to 'Player')
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/mechanism-presets.ts` — confirmed `sporting_events` has 8 football-appropriate presets
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/org-labels.ts` — confirmed `sporting_events` → `personSingular: 'Participant'`, `locationTerm: 'Stadium'` (both need update per FOOT-05)
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/booking/vertical-requirements.ts` — confirmed `sporting_events` requirements including FA governance compliance

### Secondary (MEDIUM confidence — WebSearch verified with official source)

- [England Football Learning — Medical Courses](https://learn.englandfootball.com/courses/medical) — confirmed ATMMiF is "highest medical qualification", ITMMiF is intermediate, FA Concussion Module is free online; both ATMMiF and ITMMiF valid 3 years, reaccreditation required
- [England Football — Concussion](https://www.englandfootball.com/concussion) — confirmed FA protocol requires immediate removal from play; no same-day return after concussion; referenced for HIA outcome options
- [SGSA Medical Incident Report Form page](https://sgsa.org.uk/document/medical-incident-report-form/) — confirmed form exists (February 2024 PDF), categories aligned with SGSA spectator injury statistics; PDF binary not parseable but categories confirmed from publication descriptions
- FA injury severity classification (1–7 minor, 8–28 moderate, 29–89 severe, 90+ major/serious) — confirmed from multiple FA/FIFA surveillance studies cross-referenced

### Tertiary (LOW confidence — single source, unverified)

- SGSA exact form field labels (stand/seat specifics) — PDF not machine-readable; field names inferred from SGSA spectator statistics data categories; flag for validation against actual form
- FA Match Day Injury Form exact field enumeration — not publicly available as machine-readable document; fields inferred from FIFA consensus statement and FA surveillance study data categories

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Codebase state (what Phase 18 built) | HIGH | All files read directly; RIDDOR gate confirmed; dispatcher confirmed; stub confirmed |
| `vertical_extra_fields` JSONB pattern | HIGH | Schema, model, and migration read directly; confirmed available |
| FA football cert types (ATMMiF/ITMMiF) | HIGH | Official England Football Learning website confirms names, levels, validity periods |
| FA concussion protocol (no same-day return) | HIGH | Official England Football website confirms |
| FA injury severity classification | MEDIUM | Multiple peer-reviewed FA/FIFA surveillance studies cross-reference consistently |
| SGSA form existence and purpose | HIGH | Official SGSA website confirms form, February 2024 version |
| SGSA exact form field names | LOW | PDF binary not parsed; field names inferred from SGSA statistics categories |
| FA Match Day Injury Form exact fields | LOW | No public machine-readable document; inferred from consensus statement |
| Football terminology (Player/Pitch/Club) | HIGH | Directly from FOOT-05 requirements |

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase; FA/SGSA forms change rarely)
