# 53-01 Runbook: Integrity Promotion Safety

## Purpose

Provide one canonical workflow for promoting integrity-related releases with migration safety checks and post-promotion smoke validation.

## Preconditions

- Local repo on target release commit.
- `supabase` CLI installed and authenticated for the target environment if remote checks are required.
- `pnpm` available for web and web-marketplace verification commands.

## Standard Promotion Guard Command

From repo root:

```bash
pnpm run ops:promote-integrity
```

This performs:
1. migration preflight (`scripts/ops/migration-preflight.cjs --strict-cli`)
2. `web` typecheck + lint
3. `web-marketplace` typecheck + lint
4. integrity unit tests
5. integrity smoke checks (`scripts/ops/integrity-smoke.cjs`)

## Manual Breakdown (if needed)

```bash
pnpm run ops:migration-preflight
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
pnpm --dir web-marketplace exec tsc --noEmit
pnpm --dir web-marketplace lint
pnpm --dir web exec vitest run "lib/marketplace/attribution/__tests__/pass-on-invariants.test.ts" "lib/marketplace/integrity/__tests__/signals-risk-band.test.ts"
pnpm run ops:integrity-smoke
```

## Expected Outcome

- All commands complete without blocking errors.
- Lint may contain warnings, but no errors.
- Smoke checks report PASS for migration/config/signal/case-route coverage.

## Recovery Guide

- **Preflight fails on migration naming/order**: fix migration filename or explicit allowlist before promotion.
- **Typecheck fails**: block promotion, fix compile regression, rerun full guard command.
- **Lint fails**: fix blocking lint error, rerun full guard command.
- **Smoke fails**: do not promote; inspect missing route/signal wiring and rerun after fix.

## Notes

- Legacy migration filename exception (`149b_remainder_charge_cron.sql`) is intentionally tolerated by preflight.
- For remote promotion, run environment-specific DB apply steps separately after guardrails pass.
