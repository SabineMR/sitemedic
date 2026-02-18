-- Migration 130: Compliance score history — unique index + platform admin RLS
-- Phase 23: Analytics — Heat Maps & Trend Charts
--
-- Migration 124 created compliance_score_history with a non-unique composite
-- index (compliance_score_history_period_idx). This migration:
--
--   1. Drops the redundant non-unique index from migration 124
--   2. Creates a UNIQUE index on (org_id, vertical, period_start) to support
--      idempotent upserts from generate-weekly-report
--   3. Adds a platform admin SELECT policy so cross-org trend queries work
--      in plan 23-05 (heat-map analytics API)
--
-- NOTE: The org-scoped member SELECT policy already exists from migration 124.
--       Only the platform admin policy is added here.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop redundant non-unique index (superseded by the unique index below)
-- ─────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS compliance_score_history_period_idx;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Unique composite index — enables ON CONFLICT upsert in generate-weekly-report
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS compliance_score_history_period_unique
  ON compliance_score_history (org_id, vertical, period_start);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Platform admin SELECT policy — allows cross-org compliance trend queries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Platform admins can view all compliance scores"
  ON compliance_score_history FOR SELECT
  USING (is_platform_admin());
