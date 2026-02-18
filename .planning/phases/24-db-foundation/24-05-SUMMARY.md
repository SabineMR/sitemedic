---
phase: 24-db-foundation
plan: 05
subsystem: database
tags: [postgres, supabase, rls, migration, stripe, storage]

# Dependency graph
requires:
  - phase: 24-02
    provides: Migration 132 org_branding table with RLS
  - phase: 24-03
    provides: Migration 133 subscription columns on organizations
  - phase: 24-04
    provides: Migration 134 org-logos public storage bucket with RLS
provides:
  - Verified all 3 Phase 24 DB migrations are structurally correct
  - Legacy org behaviour documented for Phases 25-31
  - NULL stripe field access-granted convention established
affects: [25-stripe-billing, 26-subdomain-routing, 27-white-label-portal, 28-pdf-reports, 29-onboarding, 30-feature-gating, 31-branding-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NULL stripe_customer_id = access granted (legacy org convention)"
    - "NULL subscription_status = treat as active (legacy org convention)"
    - "subscription_tier always populated after migration 133 backfill"
    - "org_branding row pre-exists for all orgs after migration 132 backfill"

key-files:
  created:
    - supabase/migrations/132_org_branding.sql
    - supabase/migrations/133_subscription_columns.sql
    - supabase/migrations/134_org_logos_bucket.sql
  modified: []

key-decisions:
  - "All 3 Phase 24 migrations verified correct before production application"
  - "Legacy NULL stripe_customer_id = access granted — documented for downstream phases"
  - "New orgs post-migration 132 need explicit org_branding INSERT in onboarding flow"
  - "Apex slug assumption in migration 133 backfill is a deployment dependency"

patterns-established:
  - "Verification plan pattern: read migration files, run grep checks, confirm all checklist items before production apply"
  - "Legacy access-granted pattern: NULL Stripe fields = unrestricted access until onboarding"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 24 Plan 05: Migration Verification & Legacy Org Behaviour Summary

**All 3 Phase 24 DB migrations (132 org_branding, 133 subscription_columns, 134 org-logos bucket) verified structurally correct; legacy NULL stripe field = access-granted convention documented for Phases 25-31**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-18T07:59:38Z
- **Completed:** 2026-02-18T08:00:26Z
- **Tasks:** 2
- **Files modified:** 0 migrations (all passed verification); 1 SUMMARY created

## Accomplishments

- Verified all 3 migration files exist with correct sizes (132: 6.8KB/154 lines, 133: 4.9KB/95 lines, 134: 3.8KB/99 lines)
- Confirmed all checklist items for each migration (20 checks total, all pass — no fixes needed)
- Documented 6 critical legacy org behaviour points for downstream phases 25-31

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify all migration files are complete and correct** - verified (no code changes — all migrations already correct)
2. **Task 2: Document legacy org behaviour for downstream phases** - included in plan metadata commit

**Plan metadata:** (docs commit)

## Files Created/Modified

- `.planning/phases/24-db-foundation/24-05-SUMMARY.md` - This file; verification results and legacy org behaviour documentation

## Verification Results: All Checks Pass

### Migration 132 (org_branding) — 20/20 checks pass

| Check | Expected | Result |
|-------|----------|--------|
| File exists | Yes | PASS — 6869 bytes |
| CREATE TABLE with all 8 columns | Yes | PASS — id, org_id, logo_path, primary_colour_hex, company_name, tagline, created_at, updated_at |
| UNIQUE constraint on org_id | Yes | PASS — `NOT NULL UNIQUE` inline |
| REFERENCES organizations(id) ON DELETE CASCADE | Yes | PASS |
| CHECK primary_colour_hex IS NULL OR regex | Yes | PASS — `IS NULL OR primary_colour_hex ~ '^#[0-9A-Fa-f]{6}$'` |
| uuid_generate_v4() for PK | Yes | PASS |
| gen_random_uuid NOT used | No | PASS — not found |
| Index on org_id | Yes | PASS — `CREATE INDEX idx_org_branding_org ON org_branding (org_id)` |
| Backfill INSERT from organizations.name | Yes | PASS — `INSERT INTO org_branding (org_id, company_name) SELECT id, name FROM organizations` |
| RLS policy count = 5 | 5 | PASS — 5 policies (2 org-scoped, 3 platform admin) |

### Migration 133 (subscription_columns) — checks pass

| Check | Expected | Result |
|-------|----------|--------|
| File exists | Yes | PASS — 4937 bytes |
| ADD COLUMN IF NOT EXISTS for all 4 columns | Yes | PASS — stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status |
| stripe_customer_id TEXT DEFAULT NULL | Yes | PASS |
| stripe_subscription_id TEXT DEFAULT NULL | Yes | PASS |
| subscription_tier CHECK IN (starter/growth/enterprise) | Yes | PASS |
| subscription_status CHECK IN (active/past_due/cancelled) | Yes | PASS |
| Backfill WHERE slug = 'apex' → growth | Yes | PASS |
| Backfill WHERE slug != 'apex' AND IS NULL → starter | Yes | PASS — idempotent guard included |
| No CREATE POLICY statements | 0 | PASS — 0 policies (existing coverage sufficient) |

### Migration 134 (org-logos bucket) — checks pass

| Check | Expected | Result |
|-------|----------|--------|
| File exists | Yes | PASS — 3834 bytes |
| INSERT INTO storage.buckets with id=org-logos | Yes | PASS |
| public=true | Yes | PASS |
| file_size_limit = 2097152 (2MB) | Yes | PASS |
| MIME types: png, jpeg, jpg, svg+xml, webp | Yes | PASS — all 5 present |
| CREATE POLICY count = 7 | 7 | PASS |
| INSERT policies = 2 | 2 | PASS |
| SELECT policies = 1 | 1 | PASS |
| UPDATE policies = 2 | 2 | PASS |
| DELETE policies = 2 | 2 | PASS |
| Org admin policies use [1] folder check | Yes | PASS — `(storage.foldername(name))[1] = get_user_org_id()::text` |
| Platform admin policies have NO folder check | Yes | PASS |
| ON CONFLICT (id) DO NOTHING | Yes | PASS |

---

## Legacy Org Behaviour

**Critical conventions for Phases 25-31 to honour:**

These 6 points define how ALL existing orgs behave after Phase 24 migrations run in production. Downstream phases must not violate these conventions.

---

### 1. NULL stripe_customer_id = Access Granted

`organizations.stripe_customer_id` is `NULL` for every org after migration 133 runs. This means the org has not gone through Stripe onboarding. Application code in Phases 25-30 **MUST treat `NULL stripe_customer_id` as "access granted"** — no billing enforcement is applied.

This is intentional. Existing orgs continue to operate without interruption during the v3.0 rollout. Billing enforcement only activates once an org has a non-NULL `stripe_customer_id` (i.e., after Phase 29 onboarding completes for that org).

```
if (org.stripe_customer_id === null) return GRANTED;  // legacy org — no billing check
```

---

### 2. NULL subscription_status = Treat as Active

`organizations.subscription_status` is `NULL` for every org after migration 133. Same meaning as `NULL stripe_customer_id`: the org is not yet on Stripe billing. Application code **MUST treat `NULL subscription_status` as `'active'`** for access control purposes.

Do NOT gate access based on `subscription_status === 'active'` — that logic would block all legacy orgs. Instead gate on `subscription_status !== 'cancelled'` (which is `NULL !== 'cancelled'` = `true`).

```
const isActive = org.subscription_status !== 'cancelled';  // NULL passes correctly
```

---

### 3. subscription_tier Is Always Populated After Backfill

Unlike the Stripe ID and status columns, `subscription_tier` is **NOT NULL for any org** after migration 133 backfill runs:

- Apex Safety Solutions (`slug = 'apex'`): `subscription_tier = 'growth'`
- All other existing orgs: `subscription_tier = 'starter'`

Feature gating in Phase 30 can safely read `subscription_tier` immediately without null-checking. This was the explicit design goal of the backfill — orgs have a tier even before they go through Stripe onboarding.

---

### 4. org_branding Rows Exist for All Existing Orgs

Migration 132 backfill runs `INSERT INTO org_branding (org_id, company_name) SELECT id, name FROM organizations`. After migration, **every existing org has exactly one `org_branding` row**.

- `company_name`: pre-populated from `organizations.name` — no empty-state problem
- `logo_path`: `NULL` — no logo uploaded yet
- `primary_colour_hex`: `NULL` — no brand colour configured yet
- `tagline`: `NULL` — no tagline set yet

Phases 27-30 can assume an `org_branding` row exists for any org that existed before migration 132. They do not need to handle a "missing row" case for legacy orgs.

---

### 5. New Orgs Post-Migration 132 Will NOT Auto-Get an org_branding Row

The migration 132 backfill runs once at migration time. New orgs created **after** migration 132 will NOT automatically get an `org_branding` row — there is no trigger or default to create it.

The onboarding flow in **Phase 29** MUST explicitly `INSERT INTO org_branding (org_id, company_name) VALUES (new_org_id, new_org_name)` when creating a new organisation. If this is omitted, Phases 27-30 will encounter a missing-row error for new orgs.

This is a critical implementation dependency for Phase 29.

---

### 6. Apex Slug Assumption in Migration 133 Backfill

Migration 133 identifies Apex Safety Solutions using `WHERE slug = 'apex'`. If the Apex org's slug changes in the database before migration 133 runs in production, the backfill will silently fail for that org (it will be set to `starter` via the second UPDATE instead of `growth`).

**If deploying to a fresh environment or if slugs have changed:** verify `SELECT slug FROM organizations WHERE name ILIKE '%apex%'` before applying migration 133, and update the backfill SQL if needed.

This assumption is safe for the current production state (slug confirmed as `'apex'` in STATE.md accumulated context from plan 24-03).

---

## Decisions Made

- All 3 Phase 24 migrations confirmed correct with no fixes required — migrations are ready for production application to Supabase
- Legacy org behaviour documented here (rather than in a separate file) so it lives alongside the migration verification context and is referenced by future plan summaries

## Deviations from Plan

None - plan executed exactly as written. All 3 migration files passed every checklist item on first inspection. No fixes were required.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. This was a verification-and-documentation plan only.

## Next Phase Readiness

- All Phase 24 DB migrations verified correct and ready to apply to Supabase production
- Legacy org behaviour documented — Phases 25-31 have the full picture for NULL stripe field handling
- Phase 25 (Stripe billing webhook handler) can proceed: it knows stripe_customer_id/stripe_subscription_id are NULL for all current orgs and that writing them triggers billing enforcement for that org
- Phase 29 (Onboarding flow) dependency flagged: must INSERT org_branding row when creating new org
- **No blockers** — Phase 24 DB Foundation is complete

---
*Phase: 24-db-foundation*
*Completed: 2026-02-18*
