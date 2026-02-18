# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v2.0 Multi-Vertical Platform Expansion — Phase 19: Motorsport Vertical

## Current Position

Phase: 19 of 23 (Motorsport Vertical) — Phase 18 complete
Plan: — (ready to plan)
Status: Phase 18 complete — all 5/5 plans executed and verified (18/18 must-haves passed)
Last activity: 2026-02-18 — Phase 18 complete: vertical infrastructure, RIDDOR gate, OrgContext, booking override, booking API

Progress: [██████████] v1.1 complete | [████░░░░░░] v2.0 5/25 plans (Phase 18 complete)

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
| 18–23 (v2.0) | 6/25 | ~7 min | ~1 min |

**Recent Trend:**
- Last plan: 18-04 — OrgContext wiring + booking vertical override in treatment form (2 min)
- v1.1 last 5: geofence coverage analytics, compliance exports, RIDDOR auto-save, contract detail, geofence exit alerts
- Trend: Stable — consistent 1–2 min for Phase 18 surgical refactors

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

### Research Flags (Phase-Blocking)

- **Phase 19 (Motorsport PDF):** Obtain physical Motorsport UK Accident Form from Incident Pack V8.0 before building `motorsport-incident-generator` Edge Function. Field names inferred from regulatory text only — do not build the PDF template without the actual form.
- **Phase 22 (Football scope):** Confirm with client whether SGSA form is required for v2.0 (professional clubs) or only FA form (grassroots). Determines whether `fa-incident-generator` must output two formats.
- **Phase 23 (Compliance score formula):** Formula must be agreed and frozen before building the trend chart. Recommend: PostgreSQL view with `formula_version` column so historical scores remain interpretable after formula updates.

### Pending Todos

- Configure external services for production deployment (Stripe API keys, Google Maps, Resend API keys, Stripe + Resend webhooks, pg_cron jobs, Vault secrets) — carried from v1.1

### Blockers/Concerns

None. v2.0 roadmap is complete and ready. Phase 18 has no external blockers — all patterns are fully specified in `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md`.

## Session Continuity

Last session: 2026-02-18T03:00:23Z
Stopped at: Completed 18-04-PLAN.md — OrgContext wiring + booking vertical override in treatment form
Resume file: None
