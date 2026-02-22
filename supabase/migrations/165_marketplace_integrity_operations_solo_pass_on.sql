-- Migration 165: Marketplace Integrity Operations (SOLO + PASS-ON)
-- Phase 49: Marketplace Integrity Operations - Plan 01
-- Created: 2026-02-22
-- Purpose: operational lifecycle state for attribution handoffs with append-only custody ledger.

-- =============================================================================
-- 1) Handoff state table (SOLO + PASS-ON only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketplace_attribution_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  origin_company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE RESTRICT,
  current_from_company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE RESTRICT,
  target_company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE RESTRICT,
  source_provenance_snapshot TEXT NOT NULL CHECK (source_provenance_snapshot IN ('self_sourced', 'marketplace_sourced')),
  fee_policy_snapshot TEXT NOT NULL CHECK (fee_policy_snapshot IN ('subscription', 'marketplace_commission', 'co_share_blended')),
  status TEXT NOT NULL CHECK (status IN ('pass_on_pending', 'pass_on_accepted', 'pass_on_declined')),
  reason TEXT NOT NULL,
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  declined_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_attribution_handoffs_company_diff_check CHECK (current_from_company_id <> target_company_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_attribution_single_pending_handoff
  ON marketplace_attribution_handoffs(event_id)
  WHERE status = 'pass_on_pending';

CREATE INDEX IF NOT EXISTS idx_marketplace_attribution_handoffs_event
  ON marketplace_attribution_handoffs(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_attribution_handoffs_target
  ON marketplace_attribution_handoffs(target_company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_attribution_handoffs_origin
  ON marketplace_attribution_handoffs(origin_company_id, created_at DESC);

COMMENT ON TABLE marketplace_attribution_handoffs IS 'Operational handoff state for pass-on attribution lifecycle';

-- =============================================================================
-- 2) Append-only custody ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketplace_attribution_custody (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  handoff_id UUID REFERENCES marketplace_attribution_handoffs(id) ON DELETE SET NULL,
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('solo', 'pass_on_pending', 'pass_on_accepted', 'pass_on_declined')),
  event_type TEXT NOT NULL CHECK (event_type IN ('solo_initialized', 'pass_on_initiated', 'pass_on_accepted', 'pass_on_declined')),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_company_id UUID REFERENCES marketplace_companies(id) ON DELETE SET NULL,
  source_provenance_snapshot TEXT NOT NULL CHECK (source_provenance_snapshot IN ('self_sourced', 'marketplace_sourced')),
  fee_policy_snapshot TEXT NOT NULL CHECK (fee_policy_snapshot IN ('subscription', 'marketplace_commission', 'co_share_blended')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_attribution_custody_event
  ON marketplace_attribution_custody(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_attribution_custody_handoff
  ON marketplace_attribution_custody(handoff_id, created_at DESC);

COMMENT ON TABLE marketplace_attribution_custody IS 'Append-only chain-of-custody events for attribution lifecycle';

-- =============================================================================
-- 3) Lifecycle integrity + immutability helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION ensure_handoff_matches_event_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  event_source_provenance TEXT;
  event_fee_policy TEXT;
BEGIN
  SELECT source_provenance, fee_policy
  INTO event_source_provenance, event_fee_policy
  FROM marketplace_events
  WHERE id = NEW.event_id;

  IF event_source_provenance IS NULL THEN
    RAISE EXCEPTION 'Event % not found for handoff integrity check', NEW.event_id;
  END IF;

  IF NEW.source_provenance_snapshot <> event_source_provenance THEN
    RAISE EXCEPTION 'Handoff provenance snapshot must match event provenance';
  END IF;

  IF NEW.fee_policy_snapshot <> event_fee_policy THEN
    RAISE EXCEPTION 'Handoff fee policy snapshot must match event fee policy';
  END IF;

  IF NEW.status = 'pass_on_accepted' AND (NEW.accepted_by IS NULL OR NEW.accepted_at IS NULL) THEN
    RAISE EXCEPTION 'Accepted handoff requires accepted_by and accepted_at';
  END IF;

  IF NEW.status = 'pass_on_declined' AND (NEW.declined_by IS NULL OR NEW.declined_at IS NULL) THEN
    RAISE EXCEPTION 'Declined handoff requires declined_by and declined_at';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_attribution_handoff_integrity ON marketplace_attribution_handoffs;
CREATE TRIGGER trg_marketplace_attribution_handoff_integrity
  BEFORE INSERT OR UPDATE ON marketplace_attribution_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_handoff_matches_event_integrity();

CREATE OR REPLACE FUNCTION block_custody_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_attribution_custody is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_attribution_custody_no_update ON marketplace_attribution_custody;
CREATE TRIGGER trg_marketplace_attribution_custody_no_update
  BEFORE UPDATE ON marketplace_attribution_custody
  FOR EACH ROW
  EXECUTE FUNCTION block_custody_mutation();

DROP TRIGGER IF EXISTS trg_marketplace_attribution_custody_no_delete ON marketplace_attribution_custody;
CREATE TRIGGER trg_marketplace_attribution_custody_no_delete
  BEFORE DELETE ON marketplace_attribution_custody
  FOR EACH ROW
  EXECUTE FUNCTION block_custody_mutation();

-- =============================================================================
-- 4) RLS policies
-- =============================================================================

ALTER TABLE marketplace_attribution_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_attribution_custody ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_handoffs"
  ON marketplace_attribution_handoffs FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "company_admin_read_handoffs"
  ON marketplace_attribution_handoffs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id IN (origin_company_id, current_from_company_id, target_company_id)
    )
  );

CREATE POLICY "company_admin_insert_handoffs"
  ON marketplace_attribution_handoffs FOR INSERT
  WITH CHECK (
    initiated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id = current_from_company_id
    )
  );

CREATE POLICY "company_admin_update_target_handoffs"
  ON marketplace_attribution_handoffs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id = target_company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id = target_company_id
    )
  );

CREATE POLICY "platform_admin_all_custody"
  ON marketplace_attribution_custody FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "company_admin_read_custody"
  ON marketplace_attribution_custody FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM marketplace_attribution_handoffs h
      JOIN marketplace_companies mc
        ON mc.admin_user_id = auth.uid()
      WHERE h.event_id = marketplace_attribution_custody.event_id
        AND mc.id IN (h.origin_company_id, h.current_from_company_id, h.target_company_id)
    )
    OR EXISTS (
      SELECT 1
      FROM marketplace_events e
      JOIN marketplace_companies mc
        ON mc.admin_user_id = auth.uid()
      WHERE e.id = marketplace_attribution_custody.event_id
        AND e.posted_by = mc.admin_user_id
    )
  );

CREATE POLICY "company_admin_insert_custody"
  ON marketplace_attribution_custody FOR INSERT
  WITH CHECK (actor_user_id = auth.uid());
