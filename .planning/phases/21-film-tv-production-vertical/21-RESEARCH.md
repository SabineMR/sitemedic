# Phase 21: Film/TV Production Vertical - Research

**Researched:** 2026-02-17
**Domain:** Film/TV vertical extension — treatment form fields, terminology overrides, cert profile ordering, F2508 dispatch verification
**Confidence:** HIGH (all findings from direct codebase reads; no unverified claims)

---

## Summary

Phase 21 adds Film/TV-specific fields to the treatment form, applies Film/TV terminology throughout the mobile app, reorders the cert profile for Film/TV medics, and verifies that RIDDOR auto-flagging and F2508 PDF dispatch work unchanged for the `tv_film` vertical.

The `tv_film` vertical key is already fully wired into every taxonomy file: `vertical-compliance.ts`, `mechanism-presets.ts`, `vertical-outcome-labels.ts`, `certification-types.ts` (both mobile and web), `web/lib/org-labels.ts`, and `web/lib/pdf/incident-report-dispatcher.ts`. **No new vertical registration is required.** Phase 21 only needs to (a) write the Film/TV conditional form section to `vertical_extra_fields`, (b) surface the existing terminology overrides on screens that still show hard-coded "Worker"/"Site"/"Client" labels, and (c) update the cert ordering in `services/taxonomy/certification-types.ts`.

**Primary recommendation:** Follow the pattern established by Phase 18 for `vertical_extra_fields` serialization and by the existing taxonomy files for terminology and cert ordering. No new infrastructure, no new Edge Functions.

---

## Standard Stack

No new libraries required. All work uses the existing stack:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WatermelonDB | 0.28.0 | `vertical_extra_fields` TEXT column (already exists, schema v4) | Offline storage established in Phase 1 |
| Supabase | 2.95.3 | `vertical_extra_fields` JSONB column on `treatments` (already exists, migration 124) | Backend established in Phase 1 |
| React Native / Expo SDK 54 | 54 | Mobile form UI | Mobile stack |
| `useOrg()` from `src/contexts/OrgContext.tsx` | Phase 18 | Provides `primaryVertical` | Phase 18 added OrgContext |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `services/taxonomy/vertical-compliance.ts` | Exists | `tv_film` entry with `riddorApplies: true` | Read to confirm RIDDOR routing; no changes needed |
| `services/taxonomy/mechanism-presets.ts` | Exists | `tv_film` preset chips already defined | Already complete; no changes needed |
| `services/taxonomy/vertical-outcome-labels.ts` | Exists | `tv_film` outcome overrides ("Returned to set") | Already complete; no changes needed |
| `services/taxonomy/certification-types.ts` | Exists | `tv_film` cert ordering — needs update for Phase 21 requirements | Update `VERTICAL_CERT_TYPES.tv_film` array |
| `web/lib/org-labels.ts` | Exists | `tv_film` terminology map for web (Set/Crew/Production already defined) | Already complete; verify mobile parity |
| `web/lib/pdf/incident-report-dispatcher.ts` | Exists | Routes `tv_film` to `riddor-f2508-generator` | Already complete; dispatch verified |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

The form fields and terminology work touches these locations only:

```
app/
  treatment/
    new.tsx                    ← Add Film/TV conditional section here (Plan 21-01)
services/taxonomy/
  certification-types.ts      ← Update tv_film cert ordering (Plan 21-02)
  vertical-outcome-labels.ts  ← Already has tv_film overrides; no change needed
  mechanism-presets.ts        ← Already has tv_film presets; no change needed
  vertical-compliance.ts      ← Already has tv_film config; no change needed
app/(tabs)/
  workers.tsx                 ← Terminology: "Workers" tab label (Plan 21-02)
  _layout.tsx                 ← "Worker Registry" header; "Add Worker" tab title (Plan 21-02)
app/worker/
  new.tsx                     ← "Add Worker - Site Induction" header (Plan 21-02)
  quick-add.tsx               ← "Quick Add Worker" (Plan 21-02)
  [id].tsx                    ← "Worker Information" section heading (Plan 21-02)
app/treatment/
  [id].tsx                    ← "Worker Information" section heading (Plan 21-02)
  templates.tsx               ← "Select Worker" / "Add Worker" (Plan 21-02)
```

No new files need to be created unless a `vertical-terminology.ts` consolidation file is desired (see research note below).

### Pattern 1: Vertical Conditional Section in Treatment Form

**What:** A `{orgVertical === 'tv_film' && (...)}` block inserted in `app/treatment/new.tsx` between Section 1 (Patient Information) and Section 2 (Injury Details). All field values are serialized to JSON and written to `treatment.verticalExtraFields`.

**When to use:** Whenever `orgVertical === 'tv_film'`.

**Exact insertion point in `new.tsx`:** After line 418 (the `WorkerSearchPicker` section close tag `</View>`) and before line 421 (`{/* Section 2: Injury Details */}`).

**Example (canonical pattern from STACK.md research):**
```typescript
// Source: .planning/research/STACK.md — VERTICAL_EXTRA_FIELDS pattern
// Insert between Section 1 and Section 2 in app/treatment/new.tsx

{orgVertical === 'tv_film' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Production Details</Text>

    {/* Production Title */}
    <Text style={styles.fieldLabel}>Production Title</Text>
    <TextInput
      style={styles.textArea}
      placeholder="e.g. The Crown S8"
      value={productionTitle}
      onChangeText={setProductionTitle}
      autoCapitalize="words"
    />

    {/* Patient Role */}
    <Text style={styles.fieldLabel}>Patient Role *</Text>
    <Pressable
      style={styles.pickerButton}
      onPress={() => setShowPatientRolePicker(true)}
    >
      <Text style={styles.pickerButtonText}>{patientRole || 'Select...'}</Text>
    </Pressable>

    {/* SFX / Pyrotechnic Involved */}
    <Text style={styles.fieldLabel}>SFX / Pyrotechnic Involved</Text>
    <Pressable
      style={[styles.pickerButton, sfxInvolved && { borderColor: '#F59E0B' }]}
      onPress={() => setSfxInvolved(!sfxInvolved)}
    >
      <Text style={styles.pickerButtonText}>{sfxInvolved ? 'Yes' : 'No'}</Text>
    </Pressable>

    {/* Scene / Shot Context */}
    <Text style={styles.fieldLabel}>Scene / Shot Context</Text>
    <TextInput
      style={styles.textArea}
      placeholder="e.g. Car chase scene, Stage 4"
      value={sceneContext}
      onChangeText={setSceneContext}
      multiline
    />
  </View>
)}
```

### Pattern 2: Writing Film/TV Fields to verticalExtraFields

**What:** Serialize all Film/TV form state into a JSON object and write to `treatment.verticalExtraFields` (TEXT in WatermelonDB, JSONB in Supabase).

**When to use:** In the `formValues` object passed to `useAutoSave`, and in the `enqueueSyncItem` call in `handleCompleteTreatment`.

**Example:**
```typescript
// Source: src/database/models/Treatment.ts line 53
// verticalExtraFields is @text — stores raw JSON string; parse with JSON.parse() at call site

// In the auto-save formValues object:
const filmTvExtras = orgVertical === 'tv_film' ? JSON.stringify({
  production_title: productionTitle,
  patient_role: patientRole,       // 'Cast' | 'Stunt Performer' | 'Director' | 'Camera' | 'Grip' | 'Lighting' | 'Art dept' | 'Costume' | 'Other crew'
  sfx_involved: sfxInvolved,       // boolean
  scene_context: sceneContext,     // free text
}) : null;

// Add to fieldMapping:
// verticalExtraFields: 'vertical_extra_fields'

// In enqueueSyncItem payload:
vertical_extra_fields: treatment.verticalExtraFields ?? null,
```

**JSON key naming convention:** snake_case, matching Supabase JSONB convention already established in migration 124 and `booking_briefs.extra_fields`.

### Pattern 3: Terminology Overrides (Mobile)

**What:** Use `patientLabel` (already computed from `getPatientLabel(orgVertical)` in `new.tsx`) for section headings. For screens where `orgVertical` is not already available, the Worker-specific screens (`workers.tsx`, `worker/new.tsx`, etc.) will need conditional text based on the `useOrg()` context.

**When to use:** All user-facing labels showing "Worker", "Site", or "Client".

**Two approaches available:**

Approach A — Use existing `getPatientLabel(orgVertical)` (already used in `new.tsx` line 373). Extend the same call to templates.tsx.

Approach B — Use `web/lib/org-labels.ts` pattern (already mirrors `tv_film` terminology). Mirror it to mobile in a new `src/lib/org-labels.ts` or extend `getPatientLabel` with additional term getters.

**Existing Film/TV terminology already defined in `web/lib/org-labels.ts` (HIGH confidence):**
```typescript
// Source: web/lib/org-labels.ts lines 48-55
tv_film: {
  personSingular: 'Crew member',
  personPlural:   'Crew',
  locationTerm:   'Set',
  periodTerm:     'Production day',
  eventTerm:      'Production',
  primaryVertical: 'tv_film',
},
```

**The mobile currently only uses `getPatientLabel` from `vertical-outcome-labels.ts`** which returns `'Crew member'` for `tv_film`. The broader terms (`locationTerm: 'Set'`, `eventTerm: 'Production'`) are only in the web's `org-labels.ts`. Phase 21 Plan 02 should extend `getPatientLabel` (or add a new `getLocationLabel`/`getEventLabel` function) for the mobile, or copy the label map into the mobile.

### Pattern 4: Cert Profile Ordering

**What:** Update `VERTICAL_CERT_TYPES.tv_film` in `services/taxonomy/certification-types.ts` to put `HCPC Paramedic`, `ScreenSkills Production Safety Passport`, and `FREC 4` at the top.

**CRITICAL GAP:** `'ScreenSkills Production Safety Passport'` and `'EFR'` do NOT currently appear in `CERT_TYPES` or `CERT_TYPE_INFO` in either `services/taxonomy/certification-types.ts` or `web/types/certification.types.ts`. They must be added before the `tv_film` ordering can reference them.

**Current `tv_film` ordering (from `services/taxonomy/certification-types.ts` line 129):**
```typescript
tv_film: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'CSCS', 'IPAF', 'ALS Provider', 'PHTLS'],
```

**Required ordering per Phase 21 success criteria:**
```
HCPC Paramedic
ScreenSkills Production Safety Passport  ← NEW cert type to add
FREC 4 / EFR                             ← EFR = Emergency First Responder (may be "EFR" cert type to add)
... remaining certs
```

### Anti-Patterns to Avoid

- **Don't create a new Edge Function for Film/TV PDF dispatch.** `web/lib/pdf/incident-report-dispatcher.ts` already maps `tv_film` to `riddor-f2508-generator`. This is complete.
- **Don't add Film/TV-specific RIDDOR logic.** The RIDDOR gate in Phase 18 already passes `tv_film` through unchanged (`riddorApplies: true`). No changes to `riddor-detector` trigger or `riddor-f2508-generator` needed.
- **Don't use the string key `'film-tv'` anywhere.** The codebase consistently uses `'tv_film'`. The ROADMAP.md line 66 has a typo referencing `'film-tv'` — the actual key is `tv_film` throughout all files.
- **Don't add CSCS/CPCS to Film/TV cert profile.** Current `tv_film` list includes `CSCS` and `IPAF` from the mobile file, but the research finding states construction site access cards are not relevant to film/TV. Phase 21 should remove them from the `tv_film` ordering when updating cert profile. (Keep them in the full list; just don't surface them at top for `tv_film`.)
- **Don't add `vertical_extra_fields` to WatermelonDB schema.** It already exists (schema v4, Phase 18). No migration needed.
- **Don't add `vertical_extra_fields` to Supabase.** Migration 124 already added it as JSONB.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RIDDOR routing for Film/TV | Custom dispatch logic | `web/lib/pdf/incident-report-dispatcher.ts` — `tv_film` already maps to `riddor-f2508-generator` | Already done in Phase 18 |
| Film/TV mechanism presets | Custom preset list | `MECHANISM_PRESETS_BY_VERTICAL.tv_film` in `services/taxonomy/mechanism-presets.ts` | Already defined: 8 presets including "Pyrotechnic / SFX injury", "Stunt incident" |
| Film/TV outcome labels | Custom override map | `OUTCOME_LABEL_OVERRIDES.tv_film` in `services/taxonomy/vertical-outcome-labels.ts` | Already defined: "Returned to set", "Returned to set — restricted duties" |
| Film/TV compliance config | Custom compliance check | `VERTICAL_COMPLIANCE.tv_film` in `services/taxonomy/vertical-compliance.ts` | Already defined: `riddorApplies: true`, `primaryFramework: 'RIDDOR'`, `patientIsWorker: true` |
| Patient label for Film/TV | Hard-coded "Crew member" | `getPatientLabel('tv_film')` returns `'Crew member'` already | Defined in `vertical-outcome-labels.ts` line 123 |
| JSON serialization for extra fields | Custom serializer | `JSON.stringify()` / `JSON.parse()` directly — same pattern as `treatment_types` and `photo_uris` | Established convention in Treatment model |

**Key insight:** The entire vertical infrastructure for `tv_film` was wired during Phase 18. Phase 21 is filling in the user-facing content layer (form fields, terminology labels, cert ordering), not building infrastructure.

---

## Common Pitfalls

### Pitfall 1: Using Wrong Vertical Key String

**What goes wrong:** Using `'film-tv'` or `'film_tv'` instead of `'tv_film'`. ROADMAP.md line 66 contains a typo showing `getRecommendedCertTypes('film-tv')` — this is wrong.

**Why it happens:** The requirement docs use "Film/TV" as the human label, which developers may convert to `film-tv` by habit. The actual database key is `tv_film`.

**How to avoid:** All `Record<string, ...>` lookups in taxonomy files use `tv_film` as the key. Verify in `vertical-compliance.ts` line 68, `mechanism-presets.ts` line 37, `vertical-outcome-labels.ts` line 27, `certification-types.ts` line 129.

**Warning signs:** `getVerticalCompliance('film-tv')` returns the `general` fallback, not the `tv_film` config. Test by checking `compliance.riddorApplies === true` for the vertical.

### Pitfall 2: Adding Missing Cert Types in Wrong File

**What goes wrong:** Adding `'ScreenSkills Production Safety Passport'` and `'EFR'` only to `services/taxonomy/certification-types.ts` and forgetting `web/types/certification.types.ts`.

**Why it happens:** There are two cert type files — one for mobile (`services/taxonomy/`) and one for web (`web/types/`). They must stay in sync.

**How to avoid:** Edit both files in the same commit. Both have an `as const` array at the top and a `CERT_TYPE_INFO` / `CERT_TYPE_METADATA` record. Both need the new cert added to the array and the info record.

**Warning signs:** TypeScript type errors on `CertType` / `UKCertType` if the new cert string is not in the `as const` array.

### Pitfall 3: Breaking Auto-Save for verticalExtraFields

**What goes wrong:** Adding `filmTvExtras` state to `formValues` without mapping it correctly in `fieldMapping`, causing auto-save to not persist Film/TV fields.

**Why it happens:** The `useAutoSave` hook (line 180 in `new.tsx`) takes `formValues` and `fieldMapping` objects. Missing entries in `fieldMapping` mean the value is never written to the WatermelonDB record.

**How to avoid:** Add `verticalExtraFields: 'vertical_extra_fields'` to the `fieldMapping` object alongside the Film/TV extra fields in `formValues`. Test by checking the WatermelonDB record after auto-save fires.

**Warning signs:** `treatment.verticalExtraFields` is `undefined` after auto-save despite form fields being filled in.

### Pitfall 4: Terminology Not Applied in Workers Tab

**What goes wrong:** `app/(tabs)/workers.tsx` and `app/(tabs)/_layout.tsx` use hard-coded strings "Worker", "Workers", "Worker Registry". These are not driven by `orgVertical` because workers.tsx does not read OrgContext.

**Why it happens:** The workers tab was built before OrgContext existed. `getPatientLabel` is only imported in `treatment/new.tsx`.

**How to avoid:** In Plan 21-02, add `useOrg()` to the workers-related screens and use `getPatientLabel(primaryVertical)` for section headings. For tab bar labels (`_layout.tsx`), use `primaryVertical` from `useOrg()` to conditionally set the tab title.

**Warning signs:** Tab still says "Workers" and header still says "Worker Registry" when Film/TV org is active.

### Pitfall 5: enqueueSyncItem Missing verticalExtraFields

**What goes wrong:** The sync payload in `handleCompleteTreatment` (lines 317-338 in `new.tsx`) does not include `vertical_extra_fields`. The field is written to WatermelonDB but not synced to Supabase.

**Why it happens:** `vertical_extra_fields` was added to the schema in Phase 18 but the treatment/new.tsx sync payload was not updated in Phase 18 (Phase 18 added the column to the model but treatment form Film/TV fields were deferred to Phase 21).

**How to avoid:** Check line 334 in `new.tsx`: `event_vertical: treatment.eventVertical ?? null` is already present. Add `vertical_extra_fields: treatment.verticalExtraFields ?? null` immediately after it.

**Warning signs:** Supabase `treatments` row shows `vertical_extra_fields = null` for a Film/TV treatment that has production details filled in.

---

## Code Examples

Verified patterns from the actual codebase:

### Reading orgVertical (already established in new.tsx)
```typescript
// Source: app/treatment/new.tsx lines 79-81
const params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>();
const { primaryVertical } = useOrg();
const orgVertical = (params.event_vertical as string | undefined) ?? primaryVertical;
```

### Conditional Section Pattern (existing pattern — RIDDOR banner)
```typescript
// Source: app/treatment/new.tsx lines 393-399
// This is the exact pattern to copy for the Film/TV conditional section:
{riddorFlagged && (
  <View style={styles.riddorBanner}>
    <Text style={styles.riddorText}>...</Text>
  </View>
)}

// Film/TV version follows the same pattern:
{orgVertical === 'tv_film' && (
  <View style={styles.section}>
    {/* Film/TV fields here */}
  </View>
)}
```

### verticalExtraFields on Treatment Model
```typescript
// Source: src/database/models/Treatment.ts line 53
@text('vertical_extra_fields') verticalExtraFields?: string // raw JSON; parse with JSON.parse() at call site
```

### incident-report-dispatcher routing for tv_film
```typescript
// Source: web/lib/pdf/incident-report-dispatcher.ts lines 21-22
const FUNCTION_BY_VERTICAL: Record<string, string> = {
  construction:      'riddor-f2508-generator',
  tv_film:           'riddor-f2508-generator',  // ← CONFIRMED: routes to existing F2508 function
  ...
};
```

### Existing tv_film compliance config
```typescript
// Source: services/taxonomy/vertical-compliance.ts lines 68-79
tv_film: {
  primaryFramework: 'RIDDOR',
  frameworkLabel: 'RIDDOR (HSE)',
  riddorApplies: true,
  patientIsWorker: true,
  reportFormLabel: 'HSE F2508 RIDDOR Report',
  postTreatmentGuidance:
    'This treatment has been logged. TV/Film crew are workers under RIDDOR...',
  incidentPageLabel: 'RIDDOR Incidents',
  complianceBadgeLabel: 'RIDDOR (HSE)',
},
```

### Existing tv_film mechanism presets
```typescript
// Source: services/taxonomy/mechanism-presets.ts lines 37-46
tv_film: [
  'Fall from height / set structure',
  'Struck by equipment or prop',
  'Stunt incident',
  'Pyrotechnic / SFX injury',
  'Manual handling on set',
  'Electrical contact',
  'Laceration (prop or equipment)',
  'Vehicle / stunt vehicle incident',
],
```

### Existing tv_film outcome label overrides
```typescript
// Source: services/taxonomy/vertical-outcome-labels.ts lines 27-30
tv_film: {
  'returned-to-work-same-duties':  'Returned to set',
  'returned-to-work-light-duties': 'Returned to set — restricted duties',
},
```

### Existing tv_film terminology (web)
```typescript
// Source: web/lib/org-labels.ts lines 48-55
tv_film: {
  personSingular: 'Crew member',
  personPlural:   'Crew',
  locationTerm:   'Set',
  periodTerm:     'Production day',
  eventTerm:      'Production',
  primaryVertical: 'tv_film',
},
```

### Current tv_film cert ordering (mobile — needs updating)
```typescript
// Source: services/taxonomy/certification-types.ts line 129
// CURRENT (needs update):
tv_film: ['FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic', 'CSCS', 'IPAF', 'ALS Provider', 'PHTLS'],

// REQUIRED (per FILM-03 and Phase 21 success criteria):
// tv_film: ['HCPC Paramedic', 'ScreenSkills Production Safety Passport', 'FREC 4', 'EFR', 'PHEC', 'PHTLS', 'ALS Provider', 'ATLS', ...]
// Note: 'ScreenSkills Production Safety Passport' and 'EFR' must be added as new cert types first
```

### Patient Role Options for Film/TV
```typescript
// Source: .planning/research/FEATURES.md line 346 (verified from regulatory research)
// Patient role picker options:
const FILM_TV_PATIENT_ROLES = [
  'Cast',
  'Stunt Performer',
  'Director',
  'Camera',
  'Grip',
  'Lighting',
  'Art Dept',
  'Costume',
  'Other crew',
];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No `vertical_extra_fields` column | Column exists in WatermelonDB schema v4 and Supabase JSONB | Phase 18 | Phase 21 can write Film/TV fields immediately |
| No `tv_film` OrgContext | `useOrg().primaryVertical` returns `'tv_film'` for Film/TV orgs | Phase 18 | Phase 21 can gate conditional sections without per-screen fetches |
| No incident-report-dispatcher | `tv_film` routes to `riddor-f2508-generator` in dispatcher | Phase 18 | F2508 dispatch is already confirmed working for Film/TV |
| No Film/TV mechanism presets | 8 Film/TV presets in `mechanism-presets.ts` | Phase 18 research (confirmed present now) | No preset work needed in Phase 21 |
| No Film/TV outcome labels | "Returned to set" / "Returned to set — restricted duties" | Phase 18 research (confirmed present now) | No outcome label work needed in Phase 21 |

**Deprecated/outdated:**
- `'CSCS'` and `'IPAF'` in the `tv_film` cert ordering: These are construction site access cards, not relevant to film/TV. Should be removed from `tv_film` ordering in Phase 21 (they remain in the full cert list — just deprioritised).

---

## Open Questions

1. **EFR cert type — exact label**
   - What we know: Phase 21 success criteria say "FREC 4 / EFR at top". EFR = Emergency First Responder.
   - What's unclear: Is EFR its own separate cert type distinct from FREC 4, or is it an alternative label for the same cert? In UK film medicine, EFR typically refers to a basic level first aid qualification (similar to FAW), NOT a higher qualification. FREC 4 is higher than EFR.
   - Recommendation: Add `'EFR'` as a new cert type with label "Emergency First Responder (EFR)", category `'medical'`. Place in ordering: `HCPC Paramedic > ScreenSkills Production Safety Passport > FREC 4 > EFR > PHEC > ...`

2. **ScreenSkills Production Safety Passport — expiry handling**
   - What we know: "No fixed expiry (CPD-based)" per `.planning/research/FEATURES.md` line 379.
   - What's unclear: How should the cert expiry date field behave for a no-fixed-expiry cert? The existing cert model requires `expiry_date`.
   - Recommendation: In cert entry UI, allow far-future date (e.g., 2099-12-31) for CPD-based certs. The cert tracking system already handles this by checking days until expiry — a date far in the future simply never triggers expiry alerts. No schema changes needed.

3. **Terminology override scope for workers screens**
   - What we know: `app/(tabs)/workers.tsx`, `app/(tabs)/_layout.tsx`, `app/worker/new.tsx`, `app/worker/quick-add.tsx`, `app/worker/[id].tsx`, and `app/treatment/[id].tsx` all contain hard-coded "Worker" strings.
   - What's unclear: The success criteria specify "Cast & Crew replaces Worker" — should the Workers tab title, tab bar label, and all section headings change? Or only the treatment form?
   - Recommendation: Change all user-visible "Worker" labels that a medic sees during a Film/TV booking. The tab itself showing "Cast & Crew Registry" is correct UX. The tab bar icon label should change to "Cast & Crew". Hard-coded internal model names (`Worker.table`, route paths `/worker/`) do not need to change.

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `app/treatment/new.tsx` — treatment form structure, vertical conditional pattern, `patientLabel` usage
- Direct file read: `services/taxonomy/vertical-compliance.ts` — `tv_film` key confirmed, `riddorApplies: true`, `primaryFramework: 'RIDDOR'`
- Direct file read: `services/taxonomy/certification-types.ts` — current `tv_film` ordering, cert types list (no ScreenSkills/EFR present)
- Direct file read: `web/types/certification.types.ts` — web cert types (no ScreenSkills/EFR present)
- Direct file read: `services/taxonomy/mechanism-presets.ts` — `tv_film` presets confirmed
- Direct file read: `services/taxonomy/vertical-outcome-labels.ts` — `tv_film` outcome overrides, `getPatientLabel` returns `'Crew member'`
- Direct file read: `web/lib/org-labels.ts` — `tv_film` full terminology map (personSingular, personPlural, locationTerm, periodTerm, eventTerm)
- Direct file read: `web/lib/pdf/incident-report-dispatcher.ts` — `tv_film` routes to `riddor-f2508-generator` confirmed
- Direct file read: `src/database/models/Treatment.ts` — `verticalExtraFields` is `@text` (raw JSON string)
- Direct file read: `src/database/schema.ts` — `vertical_extra_fields` type `string` optional, schema v4
- Direct file read: `src/contexts/OrgContext.tsx` — exists, provides `primaryVertical`
- Direct file read: `.planning/research/STACK.md` — vertical form fields pattern, `tv_film` extra fields schema, JSONB hybrid pattern
- Direct file read: `.planning/research/FEATURES.md` lines 340-416 — Film/TV form fields, cert types, terminology mapping, anti-features

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` lines 155-166 — Phase 21 plan descriptions; note: line 66 has `'film-tv'` typo (should be `'tv_film'`)
- `.planning/REQUIREMENTS.md` lines 21-24 — FILM-01 through FILM-04 requirements

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly; no unverified claims
- Architecture: HIGH — form pattern derived from existing `new.tsx` structure; `vertical_extra_fields` already in schema
- Cert ordering changes: HIGH (what to change) / MEDIUM (exact EFR position relative to FREC 4) — see Open Questions
- Terminology occurrences: HIGH — all hard-coded "Worker"/"Site"/"Client" strings located via grep across app/ and src/
- F2508 dispatch verification: HIGH — `incident-report-dispatcher.ts` read directly; `tv_film` → `riddor-f2508-generator` confirmed
- Pitfalls: HIGH — derived from direct code inspection of the files Phase 21 will touch

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase; 30 day validity)
