# SiteMedic Roadmap

## Milestones

- ✅ **v1.0 MVP** — Phases 01–07.5 (13 phases, 84 plans — shipped 2026-02-16)
- ✅ **v1.1 Post-MVP Polish & Data Completeness** — Phases 08–17 (10 phases, 35 plans — shipped 2026-02-17)
- 📋 **v2.0 Multi-Vertical Platform Expansion** — Phases 18–23 (6 phases, planned)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 01–07.5) — SHIPPED 2026-02-16</summary>

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-MVP Polish & Data Completeness (Phases 08–17) — SHIPPED 2026-02-17</summary>

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

---

## 📋 v2.0 Multi-Vertical Platform Expansion (Phases 18–23)

**Milestone Goal:** Expand SiteMedic from a construction-only platform to a multi-vertical medic compliance platform. Film/TV, Festivals & Events, Motorsport, and Football each get their own incident forms, RIDDOR rules, PDF outputs, cert types, and in-app terminology. Add near-miss heat maps and compliance trend analytics visible at both org and platform level.

**Phase list:**

- [x] **Phase 18: Vertical Infrastructure & RIDDOR Fix** — Schema v4, RIDDOR detector vertical gate, mobile OrgContext, booking override wiring, admin vertical settings
- [ ] **Phase 19: Motorsport Vertical** — GCS/concussion form, mandatory licence suspension workflow, Medical Statistics Sheet, Motorsport UK PDF
- [x] **Phase 20: Festivals & Events Vertical** — TST triage, Purple Guide PDF, RIDDOR disabled for attendees, safeguarding + substance flags
- [x] **Phase 21: Film/TV Production Vertical** — Production-specific form fields, Film/TV terminology, cert profile, existing RIDDOR pipeline reused
- [ ] **Phase 22: Football / Sports Vertical** — Dual patient type (player/spectator), FA + SGSA forms and PDFs, RIDDOR disabled for players
- [ ] **Phase 23: Analytics — Heat Maps & Trend Charts** — Near-miss heat maps (org + platform), compliance score history, trend charts

---

### Phase 18: Vertical Infrastructure & RIDDOR Fix

**Goal:** The platform's core systems are vertical-aware — RIDDOR never fires for non-applicable verticals, the mobile app knows its vertical without hitting the network on every form mount, the WatermelonDB schema has all columns every subsequent phase requires, and admins and clients can set a vertical.

**Depends on:** Phase 17 (v1.1 complete)

**Requirements:** VERT-01, VERT-02, VERT-03, VERT-04, VERT-05, VERT-06

**Success Criteria** (what must be TRUE when this phase completes):
1. A festival-goer or motorsport competitor treatment does not produce a RIDDOR flag — the detector returns `{ detected: false }` immediately when the treatment's vertical has `riddorApplies: false`
2. The treatment form in the mobile app loads without a Supabase network call to determine the vertical — `OrgContext` provides `primaryVertical` from a single fetch at login, cached in AsyncStorage for offline use
3. When a medic navigates to `treatment/new` from a booking that has a different vertical than the org default (e.g., a motorsport booking at a construction org), the form shows the booking's vertical presets, not the org default
4. An admin can open org settings and set a default vertical for their organisation — the saved value persists and is used by new treatments
5. A client creating a booking can select the event type / vertical — the booking's `event_vertical` field is set and the correct form presets appear when the assigned medic opens that booking

**Plans:** 5 plans

Plans:
- [x] 18-01-PLAN.md — WatermelonDB schema v4: add event_vertical, vertical_extra_fields, booking_id to treatments; gps_lat, gps_lng to near_misses; Supabase SQL migration 124; compliance_score_history table
- [x] 18-02-PLAN.md — Vertical-aware RIDDOR detector: gate riddor-detector on non-RIDDOR verticals; F2508 generator returns 400 for non-RIDDOR; scaffold 3 new Edge Functions; incident-report-dispatcher utility
- [x] 18-03-PLAN.md — Mobile OrgContext: create src/contexts/OrgContext.tsx with AsyncStorage caching; register OrgProvider in app/_layout.tsx between AuthProvider and SyncProvider
- [x] 18-04-PLAN.md — Booking vertical override: remove per-mount fetchOrgVertical from new.tsx; add useOrg + useLocalSearchParams; booking_id + event_vertical in sync payload
- [x] 18-05-PLAN.md — Admin + client vertical settings: add eventVertical to BookingRequest and Supabase insert in /api/bookings/create; verify admin vertical selector already works

---

### Phase 18.5: Construction & Infrastructure Vertical (INSERTED)

**Goal:** Formalize construction as a first-class vertical in the new multi-vertical system. The construction vertical already works end-to-end from v1.0 — this phase wires it into the shared vertical config, cert ordering, and dispatcher so it behaves identically to the new verticals and serves as the reference implementation for Phase 19–22.

**Depends on:** Phase 18 (vertical infrastructure, schema v4, OrgContext, incident-report-dispatcher)

**Requirements:** CONST-01, CONST-02, CONST-03

**Success Criteria** (what must be TRUE when this phase completes):
1. A `construction` entry exists in the vertical config TypeScript file — `riddorApplies: true`, label "Construction & Infrastructure", terminology: "Worker", "Site", "Client"
2. `getRecommendedCertTypes('construction')` returns the correct ordered list — CSCS, CPCS, IPAF, Gas Safe, First Aid at Work at the top
3. The `incident-report-dispatcher` routes construction treatments to the existing F2508 generator — RIDDOR continues to work exactly as in v1.0 with no regression
4. The construction vertical can be selected in admin org settings and booking form — it behaves identically to a newly added vertical from a UI and data perspective

**Plans:** 2 plans

Plans:
- [x] 18.5-01-PLAN.md — Create services/taxonomy/verticals.ts: new canonical VERTICAL_CONFIG file with VerticalConfig interface; construction as reference entry (riddorApplies: true, patientTerm Worker, locationTerm Site, clientTerm Client, certOrdering CSCS-first, pdfGenerator riddor-f2508-generator)
- [x] 18.5-02-PLAN.md — Smoke-test verification: confirm FUNCTION_BY_VERTICAL['construction'] routes to riddor-f2508-generator; confirm construction absent from NON_RIDDOR_VERTICALS; confirm getRecommendedCertTypes includes CSCS/CPCS/IPAF/Gas Safe/PASMA; no code changes

---

### Phase 19: Motorsport Vertical

**Goal:** Medics at motorsport events can log incidents in a Motorsport UK-compliant format. A concussed competitor triggers a mandatory clearance workflow that cannot be bypassed. The event ends with an auto-generated Medical Statistics Sheet. The web dashboard shows uncleared concussion cases with a visible warning badge.

**Depends on:** Phase 18 (vertical infrastructure, schema v4, OrgContext, booking override)

**Requirements:** MOTO-01, MOTO-02, MOTO-03, MOTO-04, MOTO-05, MOTO-06, MOTO-07

**Research flag:** Obtain the physical Motorsport UK Accident Form from Motorsport UK Incident Pack V8.0 before building the PDF template. Field names were inferred from regulatory text — do not build `MotorsportIncidentDocument.tsx` without the actual form.

**Success Criteria** (what must be TRUE when this phase completes):
1. A medic logging a motorsport incident sees the Motorsport UK fields — GCS score, extrication required, helmet removed, circuit section, Clerk of Course notified, competitor car number — and cannot submit with concussion suspected unless the three-part clearance checklist (HIA conducted, competitor stood down, CMO notified) is completed
2. A motorsport treatment record does not produce a RIDDOR flag under any circumstance — the vertical detector exits before RIDDOR logic runs
3. On the web dashboard incidents list, any motorsport head injury with no clearance record shows a "Concussion clearance required" badge — it remains visible until the CMO notification is recorded
4. At the end of a motorsport booking, an admin can generate a Medical Statistics Sheet PDF that aggregates all incident records from that booking (competitor count, injury types, GCS range, extrication count) — the document matches the Motorsport UK submission format
5. A medic's certification profile when the motorsport vertical is active shows Motorsport UK Medical Official Licence, HCPC Paramedic, and PHTLS at the top of the cert selector

**Plans:** 5 plans

- [ ] 19-01-PLAN.md — Motorsport form fields + concussion gate: MotorsportExtraFields interface, conditional form section in app/treatment/new.tsx with GCS score, extrication, helmet, circuit section, Clerk of Course, car number; mandatory three-step concussion clearance gate blocking form submission
- [ ] 19-02-PLAN.md — Cert types + RIDDOR verification: add Motorsport UK Medical Official Licence and BASM Diploma to both cert registries; reorder motorsport cert priority; extend TreatmentWithWorker type; verify RIDDOR gate
- [ ] 19-03-PLAN.md — Motorsport PDF Edge Function: replace 501 stub in motorsport-incident-generator with full PDF generation; motorsport-reports storage bucket migration 125; checkpoint for Incident Pack V8.0 download
- [ ] 19-04-PLAN.md — Medical Statistics Sheet + dashboard badge: motorsport-stats-sheet-generator Edge Function for per-booking aggregate PDF; concussion clearance badge on treatments table; Generate Stats Sheet button on booking detail
- [ ] 19-05-PLAN.md — Integration verification: automated check of all 5 success criteria across all plans; human-verify checkpoint for end-to-end flow

---

### Phase 20: Festivals & Events Vertical

**Goal:** Medics at festivals and events can log incidents using Purple Guide triage categories. The triage data model works correctly alongside — not as a replacement for — existing outcome fields. Festival-goer treatments never trigger RIDDOR. The event organiser receives a Purple Guide-format incident report PDF per treatment.

**Depends on:** Phase 18 (schema v4 with `triage_priority` column, RIDDOR gate)

**Requirements:** FEST-01, FEST-02, FEST-03, FEST-04, FEST-05, FEST-06

**Success Criteria** (what must be TRUE when this phase completes):
1. A medic at a festival event sees a required triage category field (P1 Immediate / P2 Urgent / P3 Delayed / P4 Expectant) — the form cannot be completed without selecting a triage priority
2. A medic can flag Alcohol/Substance Involvement and Safeguarding Concern on a festival treatment — both flags are mandatory fields that the form requires before submission
3. A festival-goer treatment never produces a RIDDOR flag — the vertical gate returns `{ detected: false }` for the festivals vertical before any RIDDOR logic runs
4. An event organiser can download a Purple Guide-format event incident report PDF for any festival treatment record — the document includes triage priority, presenting complaint, safeguarding flag, and disposition
5. The app displays "Attendee" instead of "Worker", "Venue" instead of "Site", and "Organiser" instead of "Client" throughout all screens when the festivals vertical is active

**Plans:** 4 plans

Plans:
- [x] 20-01-PLAN.md — Festival form fields: TST triage priority (P1/P2/P3/P4) required field, alcohol/substance flag, safeguarding flag, attendee disposition; RIDDOR banner gate for festivals; all written to vertical_extra_fields JSONB
- [x] 20-02-PLAN.md — RIDDOR gate verification: confirm festivals in NON_RIDDOR_VERTICALS in riddor-detector and F2508 generator; confirm VERTICAL_COMPLIANCE.festivals.riddorApplies is false; read-only verification
- [x] 20-03-PLAN.md — Purple Guide PDF Edge Function: replace 501 stub with full PurpleGuideDocument React-PDF generation; purple-guide-mapping.ts; storage bucket migration 125
- [x] 20-04-PLAN.md — Dashboard wiring: EventIncidentReportCard, generateEventIncidentPDF query, vertical-aware terminology (Attendee/Venue/Organiser), medic profile recommended cert types (FEST-05)

---

### Phase 21: Film/TV Production Vertical

**Goal:** Medics on film and TV productions can log incidents with production-specific context fields. The existing RIDDOR pipeline continues to operate unchanged for crew members (who are workers under HSE). The app uses production terminology throughout, and the medic's cert profile reflects the Film/TV industry.

**Depends on:** Phase 18 (schema v4, OrgContext, booking override, RIDDOR gate — Film/TV passes through RIDDOR unchanged)

**Requirements:** FILM-01, FILM-02, FILM-03, FILM-04

**Success Criteria** (what must be TRUE when this phase completes):
1. A medic on a film production sees Production Title, Patient Role (Cast / Stunt Performer / Crew), and SFX / Pyrotechnic Involved flag on the treatment form — these fields capture production-specific context
2. The app displays "Cast & Crew" instead of "Worker", "Set" instead of "Site", and "Production" instead of "Client" throughout all screens when the Film/TV vertical is active
3. A crew member injury that meets RIDDOR criteria is flagged as RIDDOR-reportable — the existing F2508 generator and RIDDOR workflow runs unchanged for Film/TV vertical treatments
4. A medic's certification profile when the Film/TV vertical is active shows HCPC registration, ScreenSkills Production Safety Passport, and FREC 4 / EFR at the top of the cert selector

**Plans:** 2 plans

Plans:
- [ ] 21-01-PLAN.md — Film/TV form fields: Production Title, Patient Role picker (9 roles), SFX/Pyrotechnic Involved toggle, Scene/Shot Context; verticalExtraFields wired to auto-save and enqueueSyncItem; ScreenSkills Production Safety Passport and EFR cert types added to both cert registries
- [ ] 21-02-PLAN.md — Film/TV vertical wiring: tv_film cert ordering updated (HCPC Paramedic first, ScreenSkills, FREC 4, EFR; CSCS/IPAF removed); getLocationLabel/getEventLabel helpers added; "Cast & Crew" terminology applied across 7 screens; F2508 dispatch confirmed unchanged for tv_film (FILM-04)

---

### Phase 22: Football / Sports Vertical

**Goal:** Medics at football matches can log incidents for two distinct patient types — players and spectators — each with their own form, regulatory framework, and PDF output. Player on-pitch injuries never trigger RIDDOR. The correct PDF (FA or SGSA) is generated automatically based on patient type.

**Depends on:** Phase 18 (schema v4, RIDDOR gate, OrgContext, booking override)

**Requirements:** FOOT-01, FOOT-02, FOOT-03, FOOT-04, FOOT-05, FOOT-06, FOOT-07

**Research flag resolved:** SGSA form implemented for ALL spectator incidents — best practice regardless of ground licensing tier. No sub-branch for professional vs grassroots needed.

**Success Criteria** (what must be TRUE when this phase completes):
1. A medic at a football match is prompted to select patient type (Player or Spectator) at the start of the treatment form — the form fields that follow differ based on this selection
2. A player incident form captures Phase of Play, Contact / Non-Contact classification, HIA Concussion Assessment outcome, and FA severity classification — these fields are present and complete-able before form submission
3. A spectator incident form captures stand location, medical referral outcome, and a safeguarding flag — the SGSA-aligned fields are distinct from the player form fields
4. A player on-pitch injury never produces a RIDDOR flag — the vertical gate prevents RIDDOR detection before any logic runs for the football vertical
5. An admin can download the correct PDF for each football incident — the FA Match Day Injury Form for player incidents and the SGSA Medical Incident Report for spectator incidents

**Plans:** 5 plans

Plans:
- [x] 22-01-PLAN.md — Football dual patient type form: patient type selector (Player / Spectator) at form start; conditional Player fields (squad number, phase of play, contact/non-contact, HIA performed/outcome, FA severity); conditional Spectator fields (stand location, row/seat, referral outcome, safeguarding flag/notes, alcohol involvement); validation guards; all written to vertical_extra_fields JSONB in sync payload
- [x] 22-02-PLAN.md — Football RIDDOR gate: verify 'sporting_events' is in NON_RIDDOR_VERTICALS; annotate FOOT-04; Deno-native test asserting gate; confirm F2508 generator 400 guard
- [x] 22-03-PLAN.md — Football PDF Edge Functions: replace fa-incident-generator 501 stub with full FA Match Day Injury Form (player) and SGSA Medical Incident Report (spectator) PDF generation; FAPlayerDocument.tsx, FASpectatorDocument.tsx, mapping files; fa-incident-reports storage bucket migration 127
- [x] 22-04-PLAN.md — Football vertical wiring: getPatientLabel('sporting_events') → 'Player'; org-labels.ts sporting_events → Player/Pitch+Ground/Club; 4 new football cert types (ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module) + sporting_events CertCategory + VERTICAL_CERT_TYPES update
- [ ] 22-05-PLAN.md — Gap closure: FAIncidentReportCard component, fa-incidents query, sporting_events branch in treatment detail page, stale dispatcher comment fix

---

### Phase 23: Analytics — Heat Maps & Trend Charts

**Goal:** Site managers can see where near-misses are geographically clustering on a heat map. Compliance trends over time are visible as line charts on the org dashboard. Platform admins can compare compliance performance across all orgs. All charts read from properly structured history tables populated by existing background processes.

**Depends on:** Phase 18 (GPS columns in schema v4 — `gps_lat`, `gps_lng` on near_misses; `compliance_score_history` table created; data must be accumulating before charts are meaningful)

**Requirements:** ANLT-01, ANLT-02, ANLT-03, ANLT-04, ANLT-05, ANLT-06

**Research flag:** Verify `leaflet.heat` compatibility with `react-leaflet@5.0.0` before building `NearMissHeatMap`. Fallback: use Leaflet `CircleMarker` components scaled by severity (no new dependencies). Compliance score formula must be agreed and frozen before building the trend chart — changing the formula after data is collected makes historical scores incomparable.

**Success Criteria** (what must be TRUE when this phase completes):
1. A site manager on the org dashboard can view a Leaflet heat map of near-miss incidents — GPS-clustered points appear for their org's near-miss records, with density colouring showing concentration areas
2. A platform admin can view an aggregate near-miss heat map across all orgs — incidents from all orgs appear on the map, colour-coded by org
3. Compliance scores are persisted automatically each week — the `compliance_score_history` table receives a new row each time `generate-weekly-report` runs, so the trend chart has data to display
4. A site manager on the org dashboard can view a compliance score trend chart — the last 12 months of weekly scores are plotted as a line chart, making score improvement or decline visible over time
5. A site manager on the org dashboard can view an incident frequency trend chart — treatment count and near-miss count per week over the last 12 months are plotted, making volume trends visible
6. A platform admin can view aggregate compliance trends across all orgs and identify the top and bottom performing orgs by compliance score

**Plans:** TBD

Plans:
- [ ] 23-01: Compliance score history — `generate-weekly-report` Edge Function updated to upsert into `compliance_score_history` table; compliance score formula defined as a PostgreSQL view with `formula_version` column
- [ ] 23-02: Near-miss heat map (org) — `NearMissHeatMap` component using Leaflet + `leaflet.heat` (or `CircleMarker` fallback); heat map page on org dashboard; reads GPS from `near_misses` table filtered by org
- [ ] 23-03: Near-miss heat map (platform admin) — aggregate heat map on admin dashboard; org colour-coding; reads GPS from all orgs
- [ ] 23-04: Compliance trend charts (org) — `ComplianceScoreChart` (Recharts LineChart, 12-month weekly scores from `compliance_score_history`); `IncidentFrequencyChart` (Recharts AreaChart, treatment + near-miss counts per week)
- [ ] 23-05: Platform admin compliance analytics — aggregate compliance trend across all orgs; top/bottom performing orgs table by compliance score

---

## Progress

**Execution Order:** 18 → 18.5 → 19 → 20 → 21 → 22 → 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. Foundation | v1.0 | 5/5 | Complete | 2026-02-16 |
| 01.5. Business Foundation | v1.0 | 4/4 | Complete | 2026-02-16 |
| 02. Mobile Core | v1.0 | 9/9 | Complete | 2026-02-16 |
| 03. Sync Engine | v1.0 | 7/7 | Complete | 2026-02-16 |
| 04. Web Dashboard | v1.0 | 6/6 | Complete | 2026-02-16 |
| 04.5. Marketing & Booking | v1.0 | 5/5 | Complete | 2026-02-16 |
| 04.6. Customer Onboarding | v1.0 | 7/7 | Complete | 2026-02-16 |
| 05. PDF Generation | v1.0 | 4/4 | Complete | 2026-02-16 |
| 05.5. Admin Operations | v1.0 | 6/6 | Complete | 2026-02-16 |
| 06. RIDDOR Auto-Flagging | v1.0 | 8/8 | Complete | 2026-02-16 |
| 06.5. Payments & Payouts | v1.0 | 12/12 | Complete | 2026-02-16 |
| 07. Certification Tracking | v1.0 | 6/6 | Complete | 2026-02-16 |
| 07.5. Territory Auto-Assignment | v1.0 | 5/5 | Complete | 2026-02-16 |
| 08. Lead Capture & CRM | v1.1 | 3/3 | Complete | 2026-02-17 |
| 09. Booking Data Completeness | v1.1 | 3/3 | Complete | 2026-02-17 |
| 10. Real-Time Operations | v1.1 | 5/5 | Complete | 2026-02-17 |
| 11. Organisation Settings | v1.1 | 2/2 | Complete | 2026-02-17 |
| 12. Analytics Dashboard | v1.1 | 5/5 | Complete | 2026-02-17 |
| 13. UX Polish | v1.1 | 4/4 | Complete | 2026-02-17 |
| 14. RIDDOR Auto-Save | v1.1 | 4/4 | Complete | 2026-02-17 |
| 15. Compliance Exports | v1.1 | 3/3 | Complete | 2026-02-17 |
| 16. Contract Detail | v1.1 | 2/2 | Complete | 2026-02-17 |
| 17. Geofence Coverage | v1.1 | 1/1 | Complete | 2026-02-17 |
| 18. Vertical Infrastructure & RIDDOR Fix | v2.0 | 5/5 | Complete | 2026-02-18 |
| 18.5. Construction & Infrastructure Vertical | v2.0 | 2/2 | Complete | 2026-02-18 |
| 19. Motorsport Vertical | v2.0 | 0/5 | Not started | - |
| 20. Festivals & Events Vertical | v2.0 | 4/4 | Complete | 2026-02-17 |
| 21. Film/TV Production Vertical | v2.0 | 2/2 | Complete | 2026-02-17 |
| 22. Football / Sports Vertical | v2.0 | 4/5 | Gap closure in progress | - |
| 23. Analytics — Heat Maps & Trend Charts | v2.0 | 0/5 | Not started | - |
