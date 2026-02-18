# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v2.0 Multi-Vertical Platform Expansion — Phase 22: Football / Sports Vertical — 4/4 plans executed, 1 gap pending (admin PDF download card for sporting_events)

## Current Position

Phase: 22 of 23 (Football / Sports Vertical) — plans complete, 1 gap pending
Plan: 22-01, 22-02, 22-03, 22-04 all complete; 1 gap: FAIncidentReportCard missing from web admin treatment detail page
Status: Phase 22 plans complete — verifier found gap: admin UI trigger for fa-incident-generator not present on sporting_events treatment detail page; gap closure plan needed
Last activity: 2026-02-18 — Phase 22 executed; 4/5 must-haves pass; gap: no FAIncidentReportCard in web/app/(dashboard)/treatments/[id]/page.tsx for sporting_events

Progress: [██████████] v1.1 complete | [████████░░] v2.0 19/27 plans (Phase 18 + 18.5 + 19-01 + 19-02 + 19-03 + 20-01 + 20-02 + 20-03 + 20-04 + 21 + 22-01 + 22-02 + 22-03 + 22-04 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 87 (v1.0 + v1.1)
- Average duration: 4.1 min
- Total execution time: ~6.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01–07.5 (v1.0) | 84/84 | ~5.5 hrs | ~4 min |
| 08–17 (v1.1) | 35/35 | ~2.4 hrs | ~4.1 min |
| 18–23 (v2.0) | 8/25 | ~10 min | ~1 min |

**Recent Trend:**
- Last plan: 19-03 — MotorsportIncidentDocument + mapping + storage bucket + 501 stub replaced (4 min)
- Phase 19 plans: 19-01 (MOTO-01/02/03 form + gate + alert), 19-02 (cert taxonomy + TreatmentWithWorker), 19-03 (PDF generator) — 3 of 5 complete
- Phase 20 plans: 20-01 (FEST-01/02 form fields), 20-02 (RIDDOR gate), 20-03 (Purple Guide PDF backend), 20-04 (compliance frontend) — ALL COMPLETE
- Phase 22 plans: 22-01 (football dual patient type form + HIA + FA severity), 22-02 (RIDDOR gate FOOT-04), 22-03 (FA/SGSA PDF), 22-04 (cert types + terminology) — ALL COMPLETE
- Trend: Stable — consistent 1–8 min for vertical surgical additions

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- Phase 18.5 inserted after Phase 18: Construction & Infrastructure Vertical — formalizes construction as first-class vertical in multi-vertical system; 2 plans; lightest vertical phase since v1.0 logic already exists

### Decisions

Key decisions affecting v2.0:
- Vertical config storage: TypeScript static `Record<string, Config>` files, vertical ID string in DB — no DB config table needed
- WatermelonDB schema v4: single coordinated migration before any vertical form work begins — all columns `isOptional: true`
- RIDDOR gate (18-02): `NON_RIDDOR_VERTICALS` array + early-return in `riddor-detector/index.ts` before `detectRIDDOR()`; vertical resolved from `treatment.event_vertical` or `org_settings.industry_verticals[0]`
- Motorsport concussion protocol: mandatory three-part clearance checklist before form submission — cannot be deferred
- PDF dispatch (18-02): `incident-report-dispatcher.ts` FUNCTION_BY_VERTICAL routing table; F2508 returns 400 for non-RIDDOR verticals; three Edge Function stubs (event-incident/motorsport-incident/fa-incident) return 501 until Phase 19+/22+
- 18-01: `verticalExtraFields` uses `@text` not `@json` in Treatment model — raw JSON string, parsed at call site; keeps model agnostic of vertical-specific data shapes
- 18-01: `compliance_score_history` created in migration 124 (not deferred to Phase 23) — table must exist before Phase 23 analytics can write to it
- 18-01: `booking_id` uses `ON DELETE SET NULL` — treatments survive booking deletion (audit trail preserved)
- 18-03: OrgContext cache key `sitemedic.org.vertical_cache` stores `{ orgId, verticals }` — cache invalidates if org changes; `primaryVertical` defaults to `'general'`; cache-first pattern chosen for zero-signal construction sites
- 18-05: `eventVertical` placed before `pricing` in BookingRequest interfaces — groups identity/context fields before financial fields
- 18-05: `?? null` used for eventVertical (not `|| null`) — preserves distinction between undefined and empty string
- 18-04: `orgVertical` variable name preserved in new.tsx — downstream usages (getMechanismPresets, getVerticalOutcomeCategories, getPatientLabel, getVerticalCompliance) unchanged
- 18-04: `t.bookingId = bookingId ?? undefined` (not null) — WatermelonDB optional field; sync payload uses `?? null` for Supabase NULL compatibility
- 18.5-01: `services/taxonomy/verticals.ts` created as NEW canonical `VERTICAL_CONFIG` file — construction is the reference entry; Phases 19–22 add their verticals here; does NOT replace existing taxonomy files (vertical-compliance.ts, certification-types.ts remain the runtime sources)
- 21-01: Film/TV form section uses `orgVertical === 'tv_film'` guard; verticalExtraFields JSON string serialized at formValues build time (4 fields: production_title, patient_role, sfx_involved, scene_context)
- 21-01: ScreenSkills Production Safety Passport and EFR use 'medical' category — no new CertCategory union member needed
- 21-01: VERTICAL_CERT_TYPES for tv_film NOT updated — Plan 21-02 handles cert ordering; new cert types added to array + info/metadata records only
- 21-02: Workers tab plural label uses 'Cast & Crew' directly for tv_film (not getPatientLabel + 's') — matches Film/TV industry convention
- 21-02: getLocationLabel and getEventLabel placed in vertical-outcome-labels.ts alongside getPatientLabel — single file for all vertical noun helpers
- 21-02: CSCS + IPAF removed from tv_film VERTICAL_CERT_TYPES ordering only — remain in master CERT_TYPES arrays
- 21-02: FILM-04 confirmed — incident-report-dispatcher.ts already routes tv_film to riddor-f2508-generator; no code change needed
- 22-02: FOOT-04 confirmed — 'sporting_events' is in NON_RIDDOR_VERTICALS at index.ts:78; KNOWN_NON_RIDDOR_VERTICALS literal used in test.ts (cannot import local const from serve() handler; grep verify catches drift)
- 22-04: Football cert types use 'sporting_events' CertCategory (new union member) — not 'medical' or 'events'; ATMMiF leads VERTICAL_CERT_TYPES sporting_events list; locationTerm is 'Pitch / Ground' (not Stadium); eventTerm is 'Club' (not Event)
- 19-02: Motorsport UK Medical Official Licence and BASM Diploma use 'motorsport' category — Motorsport UK Official Licence is administrative registration (not clinical); BASM Diploma is sport medicine diploma with motorsport-specific relevance
- 19-02: vertical_extra_fields typed as Record<string, unknown> | null in web/types/database.types.ts (not string | null) — web layer parses JSON before type use; mobile WatermelonDB uses @text raw string per 18-01 decision
- 19-02: All three Phase 18 Treatment columns (booking_id, event_vertical, vertical_extra_fields) added together to database.types.ts — one cohesive Phase 18 schema column set; TreatmentWithWorker inherits via extends Treatment
- 20-01: Festival state vars prefixed with 'festival' (festivalAlcoholSubstanceFlag, festivalSafeguardingFlag) to avoid collision with football spectator flags (alcoholInvolvement, safeguardingFlag); RIDDOR suppression applied at form level in handleInjuryTypeSelect via orgVertical !== 'festivals' guard
- 19-01: buildVerticalExtraFields() helper centralises all vertical JSON serialisation in new.tsx — single function replaces per-vertical ternary chains in formValues and enqueueSyncItem; motorsport is the first vertical to use it
- 19-01: motorsport_concussion alert guarded by treatment.bookingId — medic_alerts.booking_id is NOT NULL; walk-in (unlinked) motorsport treatments cannot insert an alert; alert is non-blocking (try/catch, failure logs only)
- 19-01: GCS score stored as number | null in MotorsportExtraFields — null = not assessed; validated 3-15 at TextInput onChangeText (immediate feedback, not at submission)
- 22-01: isFootball declared after orgVertical (hooks before orgVertical, isFootball constant after) — avoids temporal dead zone; all 13 useState hooks at top level per React constraint
- 22-01: buildVerticalExtraFields() helper used for football vertical_extra_fields — football cases added to existing helper (from motorsport refactor); not duplicated inline
- 22-01: hia_outcome excluded from payload entirely (not set to null) when hia_performed is false — payload contains only truthy clinical data
- 22-01: stand_location stores display string ('North Stand' etc.) matching SGSA form field labels rather than a lowercase slug
- 22-01: Safeguarding notes cleared (state reset) when safeguardingFlag toggled off — prevents stale notes from persisting if flag toggled back on
- 20-03: upsert:true for event-incident-reports storage upload (vs F2508 upsert:false) — allows PDF regeneration without timestamp uniqueness constraint
- 20-03: triageCategory defaults to 'P3' (Delayed/Green) when vertical_extra_fields null — safest assumption; PDF always renders
- 20-03: RLS SELECT policy for event-incident-reports joins via treatments table (not a separate incidents table)
- 22-03: Migration numbering gap — fa-incident-reports uses migration 127 (125 = event-incident-reports Phase 20, 126 = motorsport concussion Phase 19)
- 22-03: React.createElement() used in fa-incident-generator index.ts (not JSX) — avoids JSX pragma in .ts Edge Function files
- 22-03: fa-incident-generator routes patient_type='player' to FA Match Day Injury Form, 'spectator' to SGSA Medical Incident Report; missing patient_type returns 400
- 20-04: EventIncidentReportCard uses useMutation pattern matching RIDDOR F2508 card — consistent across all vertical PDF generation
- 20-04: useOrg() used in medic profile for industryVerticals — avoids extra Supabase fetch since OrgContext already caches org_settings
- 20-04: Venue/Site displayed from vertical_extra_fields.venue_name / site_name — no new query or schema change needed
- 19-03: DRAFT watermark on motorsport PDF — user approved draft approach; watermark applied at opacity 0.08, rotate -45deg, 36pt font
- 19-03: motorsport-reports bucket uses migration 128 (not 125 as planned) — 125/126/127 already occupied by event-incident-reports, motorsport concussion alert, and fa-incident-reports respectively
- 19-03: Concussion clearance section always rendered in motorsport PDF even when hia_conducted=false — blank fields visible for completeness
- 19-03: upsert:true for motorsport-reports storage — allows PDF regeneration; consistent with event-incident-reports pattern (20-03)

### Research Flags (Phase-Blocking)

- **Phase 19 (Motorsport PDF) — DRAFT APPROACH:** `motorsport-incident-generator` built with inferred MOTO-01 fields and DRAFT watermark (user approved "proceed with draft" in 19-03 checkpoint). Obtain physical Motorsport UK Accident Form from Incident Pack V8.0 before regulatory submission to validate field layout.
- **Phase 22 (Football scope) — RESOLVED:** Both FA Match Day Injury Form (player) and SGSA Medical Incident Report (spectator) implemented in 22-03. Both formats wired in fa-incident-generator routed by patient_type.
- **Phase 23 (Compliance score formula):** Formula must be agreed and frozen before building the trend chart. Recommend: PostgreSQL view with `formula_version` column so historical scores remain interpretable after formula updates.

### Pending Todos

- Configure external services for production deployment (Stripe API keys, Google Maps, Resend API keys, Stripe + Resend webhooks, pg_cron jobs, Vault secrets) — carried from v1.1

### Blockers/Concerns

None. v2.0 roadmap is complete and ready. Phase 18 has no external blockers — all patterns are fully specified in `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md`.

## Session Continuity

Last session: 2026-02-18T04:30:08Z
Stopped at: Completed 19-03-PLAN.md (MotorsportIncidentDocument.tsx + motorsport-mapping.ts + types.ts expansion + 501 stub replaced in index.ts + migration 128 motorsport-reports bucket)
Resume file: None
