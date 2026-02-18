# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v2.0 Multi-Vertical Platform Expansion — Phase 18: Vertical Infrastructure & RIDDOR Fix

## Current Position

Phase: 18 of 23 (Vertical Infrastructure & RIDDOR Fix)
Plan: — (ready to plan)
Status: Ready to plan — v2.0 roadmap created, Phase 18 is next
Last activity: 2026-02-17 — v2.0 roadmap created, all 36 requirements mapped to phases 18–23

Progress: [██████████] v1.1 complete | [░░░░░░░░░░] v2.0 0/6 phases

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
| 18–23 (v2.0) | 0/25 | — | — |

**Recent Trend:**
- Last 5 plans: v1.1 complete — geofence coverage analytics, compliance exports, RIDDOR auto-save, contract detail, geofence exit alerts
- Trend: Stable — consistent 4 min average maintained across v1.1

*Updated after each plan completion*

## Accumulated Context

### Decisions

Key decisions affecting v2.0:
- Vertical config storage: TypeScript static `Record<string, Config>` files, vertical ID string in DB — no DB config table needed
- WatermelonDB schema v4: single coordinated migration before any vertical form work begins — all columns `isOptional: true`
- RIDDOR gate: `getVerticalCompliance(vertical).riddorApplies` check at top of `riddor-detector/index.ts` — early-return `{ detected: false }` for non-RIDDOR verticals
- Motorsport concussion protocol: mandatory three-part clearance checklist before form submission — cannot be deferred
- PDF dispatch: `incident-report-dispatcher.ts` routes to correct Edge Function based on treatment vertical; F2508 validates vertical and returns 400 for non-RIDDOR verticals

### Research Flags (Phase-Blocking)

- **Phase 19 (Motorsport PDF):** Obtain physical Motorsport UK Accident Form from Incident Pack V8.0 before building `motorsport-incident-generator` Edge Function. Field names inferred from regulatory text only — do not build the PDF template without the actual form.
- **Phase 22 (Football scope):** Confirm with client whether SGSA form is required for v2.0 (professional clubs) or only FA form (grassroots). Determines whether `fa-incident-generator` must output two formats.
- **Phase 23 (Compliance score formula):** Formula must be agreed and frozen before building the trend chart. Recommend: PostgreSQL view with `formula_version` column so historical scores remain interpretable after formula updates.

### Pending Todos

- Configure external services for production deployment (Stripe API keys, Google Maps, Resend API keys, Stripe + Resend webhooks, pg_cron jobs, Vault secrets) — carried from v1.1

### Blockers/Concerns

None. v2.0 roadmap is complete and ready. Phase 18 has no external blockers — all patterns are fully specified in `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md`.

## Session Continuity

Last session: 2026-02-17T21:10:00Z
Stopped at: v2.0 roadmap created — all 36 requirements mapped to 6 phases (18–23), REQUIREMENTS.md traceability complete, STATE.md updated
Resume file: None
