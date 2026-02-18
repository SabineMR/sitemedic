# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v2.0 Multi-Vertical Platform Expansion — Phase 23: Analytics — Heat Maps & Trend Charts + Gap Closures (COMPLETE — 7/7 plans done including gap-closure 23-06 and 23-07)

## Current Position

Phase: 23 of 23 (Analytics — Heat Maps & Trend Charts + Gap Closures) — COMPLETE (7/7 plans)
Plan: 23-07 complete (GAP Flow 3 closed: competitor_cleared_to_return checkbox added to motorsport section in app/treatment/new.tsx — outside concussion gate, visible for all motorsport treatments)
Status: Phase 23 complete — v2.0 roadmap fully complete (29/29 plans including gap closures)
Last activity: 2026-02-18 — Completed 23-07-PLAN.md: MOTO-07 checkbox added; medics can now set competitor_cleared_to_return=true; 'Concussion clearance required' badge resolvable

Progress: [██████████] v1.1 complete | [██████████] v2.0 29/29 plans (Phase 18 + 18.5 + 19-01…05 + 20-01…04 + 21 + 22-01…05 + 23-01…07 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 89 (v1.0 + v1.1 + v2.0 so far)
- Average duration: 4.1 min
- Total execution time: ~6.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01–07.5 (v1.0) | 84/84 | ~5.5 hrs | ~4 min |
| 08–17 (v1.1) | 35/35 | ~2.4 hrs | ~4.1 min |
| 18–23 (v2.0) | 12/25 | ~22 min | ~1.8 min |

**Recent Trend:**
- Last plan: 23-07 — GAP Flow 3 gap-closure: competitor_cleared_to_return checkbox added to motorsport treatment form outside concussion gate; MOTO-07 closed; 'Concussion clearance required' badge now resolvable (~1 min)
- Phase 23 plan 23-07: single-file edit to app/treatment/new.tsx; no new styles or helpers needed; reused clearanceCheckbox pattern; concussion gate (lines 420-431) unchanged
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
- 19-04: React.createElement used in motorsport-stats-sheet-generator index.ts (not JSX) — consistent with event-incident-report-generator pattern; avoids JSX pragma in .ts Edge Function files
- 19-04: upsert:true for stats sheet PDF upload — allows regeneration on same booking (same pattern as motorsport-incident-generator and event-incident-report-generator)
- 19-04: CMO name from first treatment's worker — no separate medic query; fallback 'Unknown'
- 19-04: competitor_cleared_to_return !== true in concussion badge (not === false) — undefined and null treated as not cleared (safety-first default)
- 19-04: createClient from @/lib/supabase/client used in booking detail page — matches gdpr/page.tsx and payslips pattern (not createClientComponentClient)
- 19-04: Stats sheet button placed between Site Details and Pre-Event Medical Brief sections — visible without scrolling on typical booking
- 19-05: Phase 19 integration verification complete — all 5 SC + bonus motorsport_concussion alert confirmed PASS; DRAFT watermark on motorsport PDF accepted pending Motorsport UK Incident Pack V8.0 field validation
- 22-05: FAIncidentReportCard mirrors EventIncidentReportCard exactly — same useMutation, Card/Button layout, onSuccess opens signed_url; gap closure Truth 5 satisfied
- 23-01: compliance_score_history writer: formula v1 = 100 - 40 (no daily check) - 30 (RIDDOR deadline) - 20 (overdue followup) - 10 (expired cert); formula_version stored in details JSONB not as column (table has no formula_version column); vertical='general' as NOT NULL sentinel for org-wide compliance; non-blocking upsert (failure logs, PDF continues); onConflict='org_id,vertical,period_start' matches UNIQUE INDEX from migration 130
- 23-01: migration 130 drops compliance_score_history_period_idx (non-unique from migration 124) before creating compliance_score_history_period_unique UNIQUE INDEX — drop required because UNIQUE INDEX cannot coexist with plain index on same columns without conflict
- 23-02: NearMissHeatMap fetches its own data internally via useNearMissGeoData — no data props needed; page stays clean
- 23-02: DashboardNav isActive for /analytics/heat-map href checks pathname?.startsWith('/analytics') — entire analytics section stays highlighted regardless of sub-page
- 23-02: AnalyticsSubNav uses pathname?.includes(tab.href) for active detection — works for exact and prefix matches
- 23-02: Severity config (radius + color) as Record<severity, value> maps — TypeScript enforces all four severity levels; easy to update thresholds without structural change
- 23-03: orgColorMap built in hook (not component) — deterministic per sorted org_id list; component receives stable reference without recomputing colour assignments
- 23-03: ORG_COLORS[index % length] pattern — cycles gracefully when org count exceeds 8-colour palette
- 23-03: Two-step DB query in useAdminNearMissGeoData: near_misses first, then organizations WHERE id IN (uniqueOrgIds) — avoids join complexity; org name fetch failure is non-fatal
- 23-03: Limit 1000 for admin hook vs 500 for org hook — platform admin aggregate view needs more data points for cross-org clustering
- 23-03: 'Heat Map' tab label rendered as literal string (not generic charAt(0).toUpperCase()) — handles hyphen in 'heat-map' slug correctly

- 23-04: chart hooks fetch data internally (no props) — consistent with NearMissHeatMap self-contained pattern from 23-02
- 23-04: IncidentFrequencyChart queries near_misses with .is('deleted_at', null) — all non-deleted rows count regardless of GPS coordinates
- 23-04: week_label uses format(weekDate, "'W'I MMM") from date-fns — gives 'W7 Feb' style, compact for chart X-axis
- 23-04: compliance page dynamic import uses .then(m => ({ default: m.NamedExport })) — unwraps named exports for ssr:false compatibility

- 23-05: ComposedChart (not LineChart) required when mixing Line + Area in same Recharts chart — Area elements need ComposedChart as container
- 23-05: Admin compliance hooks fetch all compliance_score_history rows for vertical='general' without org filter — admin RLS allows; client-side grouping avoids multi-tenant SQL complexity
- 23-05: Two-step query (compliance_score_history then organizations WHERE id IN) for org names — consistent with 23-03 useAdminNearMissGeoData pattern
- 23-05: orgScoreMap takes only latest 2 rows per org (rows DESC by period_start) — minimal data for trend (up/down/stable) with no extra query
- 23-05: Top 5 / bottom 5 accent threshold hardcoded as visual convention in OrgComplianceTable
- 23-07: competitor_cleared_to_return checkbox placed OUTSIDE concussion_suspected gate — visible for all motorsport treatments, not just concussion-suspected ones
- 23-07: No change to buildVerticalExtraFields() — field already in INITIAL_MOTORSPORT_FIELDS; JSON.stringify(motorsportFields) covers it automatically
- 23-07: Concussion clearance gate (lines 420-431) left unchanged — still checks only hia_conducted, competitor_stood_down, cmo_notified

### Research Flags (Phase-Blocking)

- **Phase 19 (Motorsport PDF) — DRAFT APPROACH:** `motorsport-incident-generator` built with inferred MOTO-01 fields and DRAFT watermark (user approved "proceed with draft" in 19-03 checkpoint). Obtain physical Motorsport UK Accident Form from Incident Pack V8.0 before regulatory submission to validate field layout.
- **Phase 22 (Football scope) — RESOLVED:** Both FA Match Day Injury Form (player) and SGSA Medical Incident Report (spectator) implemented in 22-03. Both formats wired in fa-incident-generator routed by patient_type.
- **Phase 23 (Compliance score formula):** RESOLVED in 23-01 — Formula v1 frozen: 100 - 40 (no daily check) - 30 (RIDDOR deadlines) - 20 (overdue followups) - 10 (expired certs). `formula_version: 'v1'` stored in `details` JSONB of each compliance_score_history row so historical scores remain interpretable after future formula changes.

### Pending Todos

- Configure external services for production deployment (Stripe API keys, Google Maps, Resend API keys, Stripe + Resend webhooks, pg_cron jobs, Vault secrets) — carried from v1.1

### Blockers/Concerns

None. v2.0 roadmap is complete and ready. Phase 18 has no external blockers — all patterns are fully specified in `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md`.

## Session Continuity

Last session: 2026-02-18T06:24:34Z
Stopped at: Completed 23-07-PLAN.md (GAP Flow 3 closed — competitor_cleared_to_return checkbox added to app/treatment/new.tsx motorsport section; MOTO-07 closed; 'Concussion clearance required' badge now resolvable by medic)
Resume file: None
