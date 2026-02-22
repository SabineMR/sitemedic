-- Migration 166: Marketplace Integrity Signals + Risk Scores
-- Phase 50: Marketplace Integrity Detection - Plan 01
-- Created: 2026-02-22
-- Purpose: Persist explainable integrity signals and event risk scores.

CREATE TABLE IF NOT EXISTS marketplace_integrity_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  related_event_id UUID REFERENCES marketplace_events(id) ON DELETE SET NULL,
  related_conversation_id UUID REFERENCES marketplace_conversations(id) ON DELETE SET NULL,
  company_id UUID REFERENCES marketplace_companies(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN (
      'THREAD_NO_CONVERT',
      'PROXIMITY_CLONE',
      'MARKETPLACE_TO_DIRECT_SWITCH',
      'PASS_ON_ACTIVITY'
    )
  ),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  weight INT NOT NULL CHECK (weight >= 0 AND weight <= 100),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_signals_event_created
  ON marketplace_integrity_signals(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_signals_company_created
  ON marketplace_integrity_signals(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_signals_type_created
  ON marketplace_integrity_signals(signal_type, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_integrity_scores (
  event_id UUID PRIMARY KEY REFERENCES marketplace_events(id) ON DELETE CASCADE,
  company_id UUID REFERENCES marketplace_companies(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 1000),
  risk_band TEXT NOT NULL CHECK (risk_band IN ('low', 'medium', 'high')),
  contributing_signal_count INT NOT NULL DEFAULT 0,
  top_signal_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  latest_signal_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_integrity_scores_band_score
  ON marketplace_integrity_scores(risk_band, score DESC);

ALTER TABLE marketplace_integrity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_integrity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_integrity_signals"
  ON marketplace_integrity_signals FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "company_admin_insert_integrity_signals"
  ON marketplace_integrity_signals FOR INSERT
  WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY "company_admin_read_integrity_signals"
  ON marketplace_integrity_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id = marketplace_integrity_signals.company_id
    )
  );

CREATE POLICY "platform_admin_all_integrity_scores"
  ON marketplace_integrity_scores FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "company_admin_read_integrity_scores"
  ON marketplace_integrity_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM marketplace_companies mc
      WHERE mc.admin_user_id = auth.uid()
        AND mc.id = marketplace_integrity_scores.company_id
    )
  );

COMMENT ON TABLE marketplace_integrity_signals IS 'Explainable, append-only anti-gaming signal events for marketplace integrity';
COMMENT ON TABLE marketplace_integrity_scores IS 'Latest aggregated per-event integrity risk score snapshot';
