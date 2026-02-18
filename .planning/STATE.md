# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v2.0 Multi-Vertical Platform Expansion — Phase 22: Football / Sports Vertical

## Current Position

Phase: 22 of 23 (Football / Sports Vertical)
Plan: 22-02 of 4 in current phase complete
Status: In progress — 22-01 (UI) and 22-02 (FOOT-04 RIDDOR gate) complete; 22-03 and 22-04 remain
Last activity: 2026-02-18 — Completed 22-02-PLAN.md: FOOT-04 RIDDOR gate verified, annotated, and test-locked

Progress: [██████████] v1.1 complete | [██████░░░░] v2.0 11/27 plans (Phase 18 + 18.5 + 21 + 22-02 complete)

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
| 18–23 (v2.0) | 7/25 | ~8 min | ~1 min |

**Recent Trend:**
- Last plan: 22-02 — FOOT-04 RIDDOR gate verify + annotate + Deno test block (1 min)
- Phase 22 plans so far: 22-01 (football patient type UI), 22-02 (RIDDOR gate FOOT-04)
- Trend: Stable — consistent 1–4 min for vertical surgical additions

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

### Research Flags (Phase-Blocking)

- **Phase 19 (Motorsport PDF):** Obtain physical Motorsport UK Accident Form from Incident Pack V8.0 before building `motorsport-incident-generator` Edge Function. Field names inferred from regulatory text only — do not build the PDF template without the actual form.
- **Phase 22 (Football scope):** Confirm with client whether SGSA form is required for v2.0 (professional clubs) or only FA form (grassroots). Determines whether `fa-incident-generator` must output two formats.
- **Phase 23 (Compliance score formula):** Formula must be agreed and frozen before building the trend chart. Recommend: PostgreSQL view with `formula_version` column so historical scores remain interpretable after formula updates.

### Pending Todos

- Configure external services for production deployment (Stripe API keys, Google Maps, Resend API keys, Stripe + Resend webhooks, pg_cron jobs, Vault secrets) — carried from v1.1

### Blockers/Concerns

None. v2.0 roadmap is complete and ready. Phase 18 has no external blockers — all patterns are fully specified in `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md`.

## Session Continuity

Last session: 2026-02-18T04:12:12Z
Stopped at: Completed 22-02-PLAN.md — FOOT-04 RIDDOR gate verified, annotated, and test-locked
Resume file: None
