# Research Summary — SiteMedic v2.0 Multi-Vertical

**Project:** SiteMedic v2.0 Multi-Vertical Expansion
**Domain:** UK medic compliance platform — Film/TV, Festivals, Motorsport, Football/Sports verticals added to shipped Construction baseline
**Researched:** 2026-02-17
**Confidence:** HIGH (stack/architecture verified against live codebase; features verified against official regulatory sources)

---

## Executive Summary

SiteMedic v2.0 adds four regulated verticals — Film/TV Production, Festivals & Events, Motorsport, and Football/Sports — to a shipped Construction baseline. Each vertical operates under a distinct regulatory framework: HSE RIDDOR 2013 for Film/TV (same as Construction), The Purple Guide for Festivals, Motorsport UK NCR Chapter 11 for Motorsport, and FA guidelines plus SGSA for Football. This means different incident forms, different PDF output formats, different certification requirements, and critically different rules about when RIDDOR applies. The RIDDOR detector, the PDF generator, and the mobile treatment form must all become vertical-aware before any new vertical can be safely activated for real clients.

The good news is that the codebase is structurally well-positioned. The vertical taxonomy (10 verticals defined in TypeScript config), org-level vertical storage (`org_settings.industry_verticals`), booking-level override (`bookings.event_vertical`), and the web dashboard `OrgContext` already exist and are correct. The gaps are focused: the mobile app fetches the vertical on every form mount without caching it, the RIDDOR detector fires on every treatment regardless of vertical, three new regulatory PDF formats have no Edge Functions yet, and the WatermelonDB schema has no `event_vertical` column. These gaps must close before the first non-construction vertical goes live or the system will produce false RIDDOR flags for festival-goers and motorsport competitors.

The highest-risk single item is the Motorsport concussion protocol: Motorsport UK mandates that a concussed competitor's licence must be suspended immediately and the CMO must notify Motorsport UK. No fields for this workflow exist anywhere in the schema or treatment form. Shipping the motorsport vertical without this is a clinical safety failure with direct liability exposure.

---

## Key Findings

### Stack (from STACK.md)

No new npm packages are required for multi-vertical support. All patterns use existing stack capabilities. The one new package needed for the heat map feature is `leaflet.heat` (a 3 KB plugin on top of the already-installed Leaflet 1.9.4). No feature-flag service (LaunchDarkly etc.), no i18n library, and no dynamic form builder are needed.

**Core technology decisions confirmed:**
- Vertical config storage: TypeScript static `Record<string, Config>` files, vertical ID string in DB — no DB config table
- Runtime vertical switching (web): existing `OrgProvider` + `useOrg()` — already correct, no changes needed
- Runtime vertical switching (mobile): new `src/contexts/OrgContext.tsx` mirroring the web pattern — replaces the per-mount `fetchOrgVertical()` call
- Terminology switching: extend `services/taxonomy/` files with a new `vertical-terminology.ts` — no i18n library
- Per-vertical PDF templates: one Edge Function per report-type category with vertical dispatch (not one per vertical)
- Per-vertical form fields: `services/taxonomy/vertical-form-fields.ts` + JSONB `extra_fields` column on treatments

### Features (from FEATURES.md)

All four new verticals have researched and documented regulatory requirements from official sources.

**Film / TV Production:**
- Uses HSE RIDDOR 2013 in full (same as construction) — existing auto-flagging logic still applies
- Extra form fields: production title, scene/stunt context, SFX/pyrotechnic flag, stunt coordinator present, patient role (Cast/Crew/Stunt performer)
- Certs: FREC 4/PHEC + HCPC Paramedic; ATLS for stunt-heavy productions; Enhanced DBS when under-18s on set
- Regulatory trigger: dangerous occurrences (stunt accidents, pyrotechnic incidents) must be reported even without injuries
- Terminology: "Crew member" not "Worker"; "Set/Location" not "Site"; "Shoot day" not "Shift"

**Festivals & Events:**
- Framework: Purple Guide (Events Industry Forum, 2024) — RIDDOR does NOT apply to festival-goers (attendees)
- Extra form fields: TST triage priority (P1/P2/P3/P4), alcohol/substance involvement (mandatory), safeguarding flag (mandatory per Purple Guide 2024), welfare area ID
- Certs: FREC 3 minimum (PHEM D); HCPC Paramedic for Tier 4-5 events as clinical lead
- Regulatory trigger: post-event medical summary report to local authority Safety Advisory Group (SAG)
- Key data model issue: existing work-outcome categories (returned to work, sent home) do not map to Purple Guide TST categories

**Motorsport:**
- Framework: Motorsport UK NCR Chapter 11 + FIA Medical Code for graded events
- Extra form fields: GCS score (mandatory), car/competitor number, extrication required (mandatory), helmet removed (mandatory), circuit section, Clerk of Course notified (mandatory), concussion flag, competitor cleared to return to race
- Certs: HCPC Paramedic or GMC Doctor + Motorsport UK Medical Official Licence (annual, specific to Motorsport UK)
- Regulatory trigger: mandatory concussion protocol — licence suspension required; CMO must notify Motorsport UK
- Aggregate document: Medical Statistics Sheet submitted to Clerk of Course at end of every event
- RIDDOR does NOT apply to competitors (not employees of the circuit)

**Football / Sports:**
- Two distinct patient types requiring different forms: players (FA guidelines) and spectators at licensed grounds (SGSA form)
- Player form extra fields: phase of play (match vs. training), contact/non-contact classification (FA Injury Surveillance requirement), HIA outcome (mandatory since 2024), squad number
- Spectator form: SGSA Standard Medical Incident Report fields (ground, stand/area, nature of injury, outcome)
- Certs: ATMMiF for professional clubs, ITMMiF for mid-level, EFAiF for grassroots; FA Concussion Module mandatory since August 2024
- RIDDOR: player on-pitch injuries are NOT RIDDOR incidents (sports injuries, not workplace accidents); match-day staff injuries are RIDDOR

**What to defer beyond v2.0 scope:**
- Android app, real-time collaboration, AI risk prediction (needs 12+ months data), API integrations, custom white-label

### Architecture (from ARCHITECTURE.md)

The architecture follows a "vertical ID as key" pattern throughout: the DB stores only a string identifier, all configuration for that vertical lives in TypeScript static config files, a provider/context layer resolves the current vertical at runtime. This is already complete for the web app; the mobile app needs the same treatment.

**Major components to build or extend:**

1. **`src/contexts/OrgContext.tsx` (new, mobile)** — fetches `org_settings.industry_verticals` once at auth time, exposes `primaryVertical`, cached for offline use; replaces the per-mount `fetchOrgVertical()` call in `new.tsx`. Must sit inside `AuthProvider`, outside `SyncProvider` in the provider tree.

2. **WatermelonDB schema v4 (single coordinated migration)** — adds `event_vertical TEXT optional`, `vertical_extra_fields TEXT optional` (JSON string), `booking_id TEXT optional`, `gps_lat FLOAT optional`, `gps_lng FLOAT optional` to `treatments` and `near_misses` tables. All columns must be `isOptional: true`. Must be one migration, not accumulated ad-hoc.

3. **Vertical-aware RIDDOR detector** — gate `riddor-detector/index.ts` on `getVerticalCompliance(vertical).riddorApplies` before running detection logic; early-return `{ detected: false }` for non-RIDDOR verticals.

4. **`app/treatment/new.tsx` vertical sections** — conditional sections rendered per `primaryVertical` value; vertical-specific fields write to `vertical_extra_fields` JSONB; booking vertical override passed as route param.

5. **Three new PDF Edge Functions** — `event-incident-report-generator` (Festivals, Purple Guide format), `motorsport-incident-generator` (Motorsport UK Accident Form), `fa-incident-generator` (FA Match Day Injury Form + SGSA format); each mirrors the existing `riddor-f2508-generator` file structure.

6. **`web/lib/pdf/incident-report-dispatcher.ts`** — routes PDF generation to the correct Edge Function based on the treatment's vertical `primaryFramework` field.

7. **`compliance_score_history` table** — new SQL migration; `generate-weekly-report` Edge Function upserts scores on each run; enables trend chart.

8. **`NearMissHeatMap` component** — Leaflet + `leaflet.heat` following the existing `GeofenceMapPicker.tsx` `dynamic(..., { ssr: false })` SSR-bypass pattern. Requires GPS columns added in schema v4.

**Vertical resolution data flow:**

```
org_settings.industry_verticals (DB)
  → OrgProvider (web/mobile) fetches once at auth
  → primaryVertical in context
  → useVerticalLabels() hook: patientLabel, mechanismPresets, outcomeCategories
  → treatment form captures event_vertical + vertical_extra_fields
  → syncs to Supabase treatments table
  → incident-report-dispatcher reads primaryFramework
  → correct PDF Edge Function invoked → signed URL returned
```

**Booking override cascade:** `bookings.event_vertical` takes precedence over org default. Passed as route param `/treatment/new?booking_id=xxx&event_vertical=motorsport`.

### Critical Pitfalls (from PITFALLS.md)

Five pitfalls carry regulatory liability or data corruption risk:

1. **RIDDOR detector is vertical-blind** — fires on every treatment; will produce false RIDDOR flags for festival-goers and motorsport competitors. Prevention: vertical check at top of `riddor-detector/index.ts`. Must fix before any non-RIDDOR vertical activates.

2. **Motorsport concussion protocol completely absent** — no HIA checkbox, no licence suspension flag, no CMO notification field. A concussed competitor could return to racing with no clearance record. Prevention: mandatory post-treatment concussion checklist for motorsport vertical. Must ship with the motorsport vertical — cannot be deferred.

3. **WatermelonDB schema must be planned as one v4 migration** — ad-hoc column additions across sprints cause device version drift and sync conflicts. Prevention: define all new columns in one migration before multi-vertical development begins; all columns `isOptional: true`.

4. **Booking vertical override not wired to treatment form** — `new.tsx` reads only `org_settings.industry_verticals[0]`, ignoring `bookings.event_vertical`. A construction org at a motorsport booking sees construction presets and RIDDOR warnings. Prevention: pass `booking_id` + `event_vertical` as route params.

5. **F2508 PDF generator produces incorrect reports for non-RIDDOR verticals** — the incidents page calls `riddor-f2508-generator` regardless of vertical. Prevention: `incident-report-dispatcher.ts` routes to correct Edge Function; F2508 generator validates vertical on entry and returns 400 for non-RIDDOR verticals.

Two additional pitfalls with high regulatory consequence:
- **Festival triage data structure mismatch**: Purple Guide requires TST triage priority (P1/P2/P3/P4); existing outcome taxonomy cannot represent this. Add `triage_priority TEXT optional` in v4 migration.
- **Terminology bleed across the app**: "Worker Information", "SITE-" prefix, "Worker Registry" tab label, `workerName` variable in treatments list are hardcoded. A cross-cutting terminology PR must precede each non-construction vertical's launch.

---

## Implications for Roadmap

Research produces a clear six-phase build order based on hard dependencies. Schema changes must precede all form work. Mobile context must precede hook usage. Form changes must precede PDF generation. Data collection must precede analytics visualisation.

### Phase 1: Schema Foundation + Critical Detector Fixes

**Rationale:** All subsequent phases depend on these. No new vertical can safely go live without the schema changes and the RIDDOR detector fix. No user-visible output from this phase — it is prerequisite infrastructure.

**Delivers:**
- WatermelonDB schema v4 migration (single batch): `event_vertical`, `vertical_extra_fields`, `booking_id`, `gps_lat`, `gps_lng` on `treatments` and `near_misses`; all columns `isOptional: true`
- Supabase SQL migrations: matching columns on server-side `treatments` and `near_misses` tables; `vertical_extra_fields JSONB` on `treatments`; `compliance_score_history` table with `formula_version` column
- Vertical-aware `riddor-detector/index.ts` — early exit when `riddorApplies === false`
- F2508 generator validation — returns 400 for non-RIDDOR verticals with a clear error message

**Avoids:** Pitfalls 1, 3, 5 (false RIDDOR flags, schema drift, wrong PDF format)

**Research flag:** Standard patterns — fully specified in ARCHITECTURE.md and PITFALLS.md. No additional research needed.

### Phase 2: Mobile Context + Treatment Form Vertical Awareness

**Rationale:** The treatment form is the core medic workflow. Until the mobile app has a cached vertical context and the form captures vertical-specific fields, no non-construction vertical works correctly on mobile.

**Delivers:**
- `src/contexts/OrgContext.tsx` — vertical fetched once at auth, cached in AsyncStorage for offline; exposes `primaryVertical`, `orgId`, `industryVerticals`
- `OrgProvider` registered in `app/_layout.tsx` inside `AuthProvider`, outside `SyncProvider`
- `useVerticalLabels()` hook at `src/hooks/useVerticalLabels.ts` — replaces per-mount `fetchOrgVertical()` across all screens
- Treatment form vertical sections: motorsport fields (GCS, car number, COC), festival fields (triage category), Film/TV fields (stunt flag, production title), football fields (phase of play, HIA)
- `booking_id` + `event_vertical` passed as route params to `new.tsx`; booking-level cascade implemented
- Cross-cutting terminology PR: "Worker Information" header, "SITE-" reference prefix, "Worker Registry" tab label, validation alert messages — all made vertical-aware or changed to neutral ("Patient Register")

**Avoids:** Pitfalls 2 (offline stale presets), 4 (booking mismatch), 7 (terminology bleed), 9 (per-mount network fetch offline)

**Research flag:** Standard patterns — ARCHITECTURE.md has complete TypeScript shapes, provider tree placement, and hook patterns. No additional research needed.

### Phase 3: Motorsport Vertical MVP

**Rationale:** Motorsport has the highest clinical stakes (mandatory concussion protocol with licence suspension). Build and validate in isolation before launching to real clients. Any miss here carries direct liability exposure.

**Delivers:**
- Motorsport conditional sections in treatment form: GCS score, extrication required, helmet removed, circuit section, Clerk of Course notified
- Mandatory concussion checklist as a post-treatment gate: HIA conducted Y/N, competitor stood down Y/N, CMO notified Y/N — form cannot submit without all three if concussion suspected
- `licence_suspension_flag` and `cmo_notified_at` stored on treatment record
- "Concussion clearance required" badge in web dashboard incident list for uncleared motorsport head injuries
- `motorsport-incident-generator` PDF Edge Function (Motorsport UK Accident Form format)
- Medical Statistics Sheet auto-populated from individual accident forms for CMO submission
- Cert profile UI: `getRecommendedCertTypes('motorsport')` orders Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS at top of cert selector

**Avoids:** Pitfalls 2 (concussion protocol), 5 (wrong PDF)

**Research flag:** Needs validation. Motorsport UK Incident Pack V8.0 was confirmed to exist but the exact field names on the Motorsport UK Accident Form were inferred from regulatory text — the PDF was not machine-readable. Obtain the form from Motorsport UK or a registered club before building `MotorsportIncidentDocument.tsx`. Do not build the PDF template without the actual form.

### Phase 4: Festivals Vertical MVP

**Rationale:** Second highest regulatory complexity due to the Purple Guide triage data model conflicting with the existing work-outcome taxonomy. This conflict must be resolved before any festival org captures live records — retrofitting triage priority into existing records is not possible.

**Delivers:**
- TST triage priority field (P1 Immediate / P2 Urgent / P3 Delayed / P4 Expectant) in festival treatment form — supplements, does not replace, outcome category
- Alcohol/substance involvement selector and safeguarding flag (both mandatory per Purple Guide 2024)
- Festival-specific outcome labels (attendee disposition, not worker outcomes)
- RIDDOR detector confirmed NOT firing for festival-goer injuries (Phase 1 fix already in place)
- `event-incident-report-generator` PDF Edge Function (Purple Guide Patient Contact Log format)
- Post-event medical summary PDF: aggregate count by triage priority, presenting complaint, alcohol involvement

**Avoids:** Pitfalls 1 (false RIDDOR flags on attendees), 8 (triage taxonomy mismatch)

**Research flag:** Low risk, well-documented. Purple Guide 2024 is publicly available. TST triage categories confirmed from peer-reviewed Glastonbury Festival study (PMC11035920). Standard patterns after Phase 1 schema work is complete.

### Phase 5: Film/TV and Football/Sports Vertical MVPs

**Rationale:** Both reuse the existing F2508/RIDDOR pipeline (Film/TV in full; Football for staff-only incidents). They can be built together since they share the cert profile wiring and terminology cleanup work. Football's dual-form model (player vs. spectator) is the main complexity.

**Delivers:**
- Film/TV form sections: production title, stunt/SFX flags, patient role (Cast/Crew/Stunt performer), scene context
- Film/TV: existing F2508 generator handles RIDDOR reporting unchanged; no new PDF Edge Function needed
- Football form: dual patient type selection (player vs. spectator), phase of play, contact/non-contact, HIA outcome, squad number
- `fa-incident-generator` PDF Edge Function outputting both FA Match Day Injury Form and SGSA Medical Incident Report
- Cert expiry checker filtered by medic's primary vertical(s) — removes irrelevant cert reminders (e.g., no CSCS alerts to motorsport-only medics)
- Cert profile UI: `getRecommendedCertTypes(vertical)` wired in admin medic edit form for all verticals
- Vertical config unit tests: assert every vertical ID present in `vertical-compliance.ts` exists in `VERTICAL_CERT_TYPES`, `OUTCOME_LABEL_OVERRIDES`, and `getPatientLabel()` — catches config drift on any future vertical addition

**Avoids:** Pitfalls 6 (config drift), 10 (irrelevant cert reminders), 11 (SITE- prefix in Film/TV references)

**Research flag:** Football has two regulatory tracks (FA for players, SGSA for spectators) that interact. Confirm with client whether they target professional clubs (SGSA form mandatory) or grassroots only (FA form sufficient). This determines which form fields are mandatory vs. optional and whether the SGSA Edge Function output is required for v2.0.

### Phase 6: Analytics and Visualisation

**Rationale:** Pure read-only layer. All data it visualises must exist first. Building charts before GPS data and compliance score history are populated produces empty or misleading dashboards. This is the last phase because it depends on all upstream data being captured and the compliance score formula being frozen.

**Delivers:**
- Compliance score formula defined in a PostgreSQL view with `formula_version` column — frozen before chart is built
- `ComplianceScoreChart` component (Recharts `LineChart`, reads from `compliance_score_history`)
- `IncidentFrequencyChart` component (Recharts `AreaChart`, incident counts by vertical framework per week)
- `generate-weekly-report` Edge Function updated to upsert into `compliance_score_history` table
- `NearMissHeatMap` component (Leaflet + `leaflet.heat`, GPS from near-misses and treatments)
- Heat map page in web dashboard

**Avoids:** Pitfall 13 (compliance score formula must be frozen before first data point is recorded)

**Research flag:** Verify `leaflet.heat` compatibility with `react-leaflet@5.0.0` before starting. The plugin targets Leaflet 1.x which should work with Leaflet 1.9.4, but confirm before investing in the component. Fallback: Leaflet `CircleMarker` components scaled by severity (zero new dependencies, ships today with existing packages).

### Phase Ordering Rationale

- Schema v4 migration must precede all form changes: WatermelonDB requires device migration before new columns exist
- Mobile context must precede form work: `useVerticalLabels()` depends on `OrgContext`
- RIDDOR detector fix must precede any non-construction vertical activating: one false RIDDOR flag sent to an HSE-aware client will damage credibility immediately
- Motorsport before Festivals: concussion protocol carries higher clinical liability than Purple Guide triage; isolate highest-risk vertical first
- PDF Edge Functions come after form changes: they need accurate `event_vertical` in the treatment record to dispatch correctly
- Analytics last: pure read layer requiring all upstream data to exist and the score formula to be stable

### Research Flags

**Needs human input or additional research before implementation:**

- **Phase 3 (Motorsport PDF):** Obtain physical copy of Motorsport UK Accident Form from Motorsport UK Incident Pack V8.0. The exact field names and injury code taxonomy were confirmed to exist but the PDF was not machine-readable during research. Do not build the PDF template without the actual form.
- **Phase 5 (Football scope):** Confirm with client whether they target professional clubs (SGSA form mandatory) or only grassroots (FA form sufficient). This is a product decision that determines whether `fa-incident-generator` must output two form formats.
- **Phase 6 (compliance score formula):** The compliance score formula is not yet defined. Must be agreed and documented before building the chart — changing the formula after data is collected makes historical scores incomparable.

**Standard patterns (no research-phase needed):**
- Phase 1: implementation fully specified in ARCHITECTURE.md and PITFALLS.md
- Phase 2: TypeScript shapes, provider tree, and hook patterns fully specified in ARCHITECTURE.md
- Phase 4: Purple Guide requirements publicly documented to high confidence
- Phase 6: Recharts and Leaflet patterns are established in the existing codebase with 4+ active usage sites

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All claims verified by direct codebase inspection. No new packages needed except `leaflet.heat`. Version pins confirmed in `package.json`. |
| Features — Film/TV | HIGH | HSE INDG360 and RIDDOR 2013 are official HSE sources. Film/TV is RIDDOR-applicable with vocabulary changes. |
| Features — Festivals | HIGH | Purple Guide 2024 (Events Industry Forum) is the authoritative source. TST triage confirmed via peer-reviewed Glastonbury Festival study (PMC11035920). |
| Features — Motorsport | MEDIUM-HIGH | NCR Chapter 11 confirmed official. Specific field names on Motorsport UK Accident Form inferred from regulatory text — PDF not machine-readable. Concussion policy confirmed HIGH. |
| Features — Football | HIGH | FA and SGSA sources are official. Two-track framework (player vs. spectator) confirmed from multiple official FA and SGSA pages. |
| Architecture | HIGH | Every "already exists" claim verified against a specific file and line number read during research. No hypotheticals. |
| Pitfalls | HIGH | All pitfalls grounded in direct code inspection of the shipped codebase. Each pitfall cites the specific file and line where the gap was found. |

**Overall confidence:** HIGH

### Gaps to Address

- **Motorsport UK Accident Form exact fields:** The form must be obtained before building the PDF Edge Function. Field names were inferred from regulatory text only.
- **Compliance score formula:** Not defined anywhere in the codebase. Must be agreed before `compliance_score_history` records are meaningful. Recommend: define as a PostgreSQL view with `formula_version` so historical scores remain interpretable after formula updates.
- **Multi-vertical org UX:** If an org has two active verticals (e.g., `["construction", "festivals"]`), the treatment form defaults to `industry_verticals[0]`. Confirm whether the medic should be prompted to select the active vertical at shift start, or whether the `booking_id` route param is always sufficient to resolve the correct vertical.
- **Booking-to-treatment navigation path:** Confirm whether the mobile app currently passes `booking_id` as a route param when navigating to `new.tsx` from a booking detail screen. If absent, Phase 2 must add the navigation path before the booking vertical cascade can work.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection (all "already exists" claims): `services/taxonomy/`, `src/database/schema.ts`, `app/treatment/new.tsx`, `web/contexts/org-context.tsx`, `supabase/functions/riddor-*/`, `supabase/migrations/121, 123`, `web/package.json`, `app/_layout.tsx`
- HSE RIDDOR 2013 and HSE INDG360 (`hse.gov.uk`) — Film/TV regulatory framework
- The Purple Guide, Events Industry Forum (2024 edition, `thepurpleguide.co.uk`) — Festivals framework
- Motorsport UK NCR 2025 Chapter 11 and Concussion Policy 2024 (`motorsportuk.org`) — Motorsport requirements
- England Football Learning, official FA platform (`learn.englandfootball.com`) — Football cert requirements
- SGSA Standard Medical Incident Report Form and guidance (`sgsa.org.uk`) — Football spectator framework
- Glastonbury Festival Electronic Patient Record study, Prehospital and Disaster Medicine 2024 (PMC11035920) — Purple Guide triage fields

### Secondary (MEDIUM confidence)
- Premier Medics UK, MEDIREK, Location Medical Services — Film/TV medic practice and cert requirements
- Team Medic, Event First Aid UK — Purple Guide practical interpretation
- SMMC Motorsport Medical Group, D4U Medical — Motorsport UK cert requirements in practice
- Nexus Medical — Ten Second Triage (TST) 2024 rollout
- BASEM, FMPA — Football sports medicine context

### Tertiary (LOW confidence — needs verification)
- Motorsport UK Incident Pack V8.0 field names — PDF confirmed to exist; content not extractable. Field names inferred from regulatory description text only.
- `leaflet.heat` compatibility with `react-leaflet@5.0.0` — package exists on npm; cross-version compatibility not explicitly verified.

---

*v1.0 research (Construction baseline): 2026-02-15*
*v2.0 research (multi-vertical addendum): 2026-02-17*
*Synthesized by: SUMMARY agent after STACK, FEATURES, ARCHITECTURE, PITFALLS agents completed in parallel*
*Ready for roadmap: yes*
