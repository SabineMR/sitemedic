---
phase: 24-db-foundation
plan: 03
subsystem: database
tags: [postgres, stripe, subscriptions, organizations, migrations, rls]

# Dependency graph
requires:
  - phase: 24-02
    provides: "Migration 132 org_branding table -- confirmed migration numbering sequence"
provides:
  - "organizations.stripe_customer_id column (TEXT, DEFAULT NULL)"
  - "organizations.stripe_subscription_id column (TEXT, DEFAULT NULL)"
  - "organizations.subscription_tier column (TEXT, DEFAULT NULL, CHECK: starter/growth/enterprise)"
  - "organizations.subscription_status column (TEXT, DEFAULT NULL, CHECK: active/past_due/cancelled)"
  - "Backfill: Apex Safety Solutions (slug='apex') set to 'growth', all other orgs to 'starter'"
affects:
  - phase-25 (billing webhook handler writes stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status)
  - phase-30 (feature gating middleware reads subscription_tier per request)
  - phase-29 (org onboarding flow sets stripe_customer_id when org first subscribes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CHECK constraint on TEXT column allows NULL without explicit IS NULL OR clause (Postgres evaluates NULL IN (...) as NULL, not FALSE)"
    - "Backfill idempotency via AND subscription_tier IS NULL in second UPDATE"
    - "DEFAULT NULL on all new columns makes ALTER TABLE safe for existing rows"

key-files:
  created:
    - supabase/migrations/133_subscription_columns.sql
  modified: []

key-decisions:
  - "All 4 subscription columns are DEFAULT NULL -- safe ALTER TABLE for existing rows, no downtime"
  - "Apex Safety Solutions (slug='apex') gets 'growth' tier; all other existing orgs get 'starter' tier"
  - "No new RLS policies needed -- migration 102 FOR ALL covers platform admin, migration 00004 SELECT covers org users for new columns"
  - "NULL stripe_customer_id = access granted until org goes through onboarding (Phase 29)"
  - "subscription_tier is NOT cached in JWT -- middleware reads DB directly for immediate effect after webhook update"

patterns-established:
  - "Subscription columns on organizations: stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status"
  - "Tier values: 'starter' | 'growth' | 'enterprise' (no 'free' tier -- NULL = legacy access)"
  - "Status values: 'active' | 'past_due' | 'cancelled'"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 24 Plan 03: Subscription Columns Summary

**ALTER TABLE organizations adds 4 Stripe billing columns with CHECK constraints; backfill sets Apex to 'growth' and all other existing orgs to 'starter' for immediate tier-based feature gating**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-18T07:50:06Z
- **Completed:** 2026-02-18T07:51:05Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Added stripe_customer_id, stripe_subscription_id, subscription_tier, and subscription_status columns to organizations table with CHECK constraints enforcing valid values
- Backfilled Apex Safety Solutions (slug='apex') with subscription_tier = 'growth' as the primary launch org
- Backfilled all other existing orgs with subscription_tier = 'starter' as the safe default
- Documented legacy NULL-stripe-customer-id behaviour: application treats NULL as access granted until org onboards through Phase 29

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 133_subscription_columns.sql** - `ab3c1b9` (feat)

**Plan metadata:** (included in next commit)

## Files Created/Modified

- `supabase/migrations/133_subscription_columns.sql` - ALTER TABLE adding 4 subscription columns with CHECK constraints, COMMENT ON COLUMN for each, backfill UPDATEs, and SUMMARY block documenting RLS and legacy NULL behaviour

## Decisions Made

- All 4 columns use DEFAULT NULL so the ALTER TABLE is safe for existing rows (no value required at migration time)
- Apex identified by slug = 'apex' (confirmed as the primary launch org across project decisions)
- Second backfill UPDATE uses AND subscription_tier IS NULL to be idempotent -- safe to re-run
- No new RLS policies needed: migration 102 already has FOR ALL on organizations for platform admins; migration 00004 SELECT policy automatically covers new columns for org users
- NULL stripe_customer_id means "not yet onboarded to Stripe billing" -- application grants access until Phase 29 onboarding flow sets the ID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration will be applied via standard Supabase migration process.

## Next Phase Readiness

- organizations table now has all 4 subscription columns required by Phase 25 and Phase 30
- Existing orgs have non-NULL subscription_tier values, so tier-based logic can work immediately after Phase 30 middleware ships
- Phase 25 billing webhook handler can write to all 4 columns after Stripe events fire
- Phase 30 feature gating middleware can read subscription_tier from organizations on every request without JWT cache concerns

---
*Phase: 24-db-foundation*
*Completed: 2026-02-18*
