-- Migration 154: Marketplace Disputes & Cancellation Support
-- Phase 36: Ratings, Messaging & Disputes — Plan 03
-- Created: 2026-02-20
-- Purpose: Create disputes table, dispute-evidence storage bucket,
--          add remainder_hold + cancellation columns to bookings.
--          Disputes immediately freeze remainder payments until admin resolves.

-- =============================================================================
-- TABLE: marketplace_disputes
-- =============================================================================

CREATE TABLE marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  filed_by UUID NOT NULL REFERENCES auth.users(id),
  filed_by_type TEXT NOT NULL CHECK (filed_by_type IN ('client', 'company')),

  -- Dispute details
  category TEXT NOT NULL CHECK (category IN (
    'no_show', 'late_cancellation', 'quality_issue',
    'billing_dispute', 'safety_concern'
  )),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',

  -- Resolution
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved')),
  resolution_type TEXT CHECK (resolution_type IN (
    'full_refund', 'partial_refund', 'dismissed', 'suspend_party'
  )),
  resolution_percent NUMERIC(5,2),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_disputes IS 'Disputes filed by either party on marketplace events with admin resolution workflow';
COMMENT ON COLUMN marketplace_disputes.category IS 'Fixed categories: no_show, late_cancellation, quality_issue, billing_dispute, safety_concern';
COMMENT ON COLUMN marketplace_disputes.resolution_percent IS 'For partial_refund: admin sets the refund percentage';

-- =============================================================================
-- EXTEND bookings: remainder_hold + marketplace cancellation columns
-- =============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_hold_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_refund_amount NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_refund_percent NUMERIC(5,2);

COMMENT ON COLUMN bookings.remainder_hold IS 'When true, charge-remainder-payment cron skips this booking';
COMMENT ON COLUMN bookings.remainder_hold_reason IS 'e.g. dispute:{dispute_id} — why the hold was placed';

-- =============================================================================
-- STORAGE BUCKET: dispute-evidence (private)
-- Pattern: {dispute_id}/{filename}
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: dispute parties + platform admin
CREATE POLICY "Dispute parties upload evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND EXISTS (
      SELECT 1 FROM marketplace_disputes
      WHERE id::text = (storage.foldername(name))[1]
        AND filed_by = auth.uid()
    )
  );

CREATE POLICY "Dispute parties view evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence'
    AND (
      EXISTS (
        SELECT 1 FROM marketplace_disputes
        WHERE id::text = (storage.foldername(name))[1]
          AND filed_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM marketplace_disputes md
        JOIN marketplace_events me ON me.id = md.event_id
        WHERE md.id::text = (storage.foldername(name))[1]
          AND me.posted_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM marketplace_disputes md
        JOIN marketplace_quotes mq ON mq.event_id = md.event_id AND mq.status = 'awarded'
        JOIN marketplace_companies mc ON mc.id = mq.company_id
        WHERE md.id::text = (storage.foldername(name))[1]
          AND mc.admin_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Platform admin view dispute evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence'
    AND is_platform_admin()
  );

-- =============================================================================
-- RLS on marketplace_disputes
-- =============================================================================

ALTER TABLE marketplace_disputes ENABLE ROW LEVEL SECURITY;

-- Both parties can view disputes for their events
CREATE POLICY "disputes_select_parties"
  ON marketplace_disputes FOR SELECT
  USING (
    auth.uid() = filed_by
    OR auth.uid() = (SELECT posted_by FROM marketplace_events WHERE id = event_id)
    OR auth.uid() IN (
      SELECT mc.admin_user_id FROM marketplace_companies mc
      JOIN marketplace_quotes mq ON mc.id = mq.company_id
      WHERE mq.event_id = marketplace_disputes.event_id AND mq.status = 'awarded'
    )
  );

-- Only the filing party can insert
CREATE POLICY "disputes_insert_filer"
  ON marketplace_disputes FOR INSERT
  WITH CHECK (filed_by = auth.uid());

-- Platform admin full access
CREATE POLICY "disputes_platform_admin"
  ON marketplace_disputes FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_disputes_event ON marketplace_disputes(event_id);
CREATE INDEX idx_disputes_filed_by ON marketplace_disputes(filed_by);
CREATE INDEX idx_disputes_status ON marketplace_disputes(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_bookings_remainder_hold ON bookings(remainder_hold) WHERE remainder_hold = true;

-- =============================================================================
-- TRIGGER: updated_at on marketplace_disputes
-- =============================================================================

CREATE TRIGGER update_marketplace_disputes_updated_at
  BEFORE UPDATE ON marketplace_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SUMMARY
-- Tables created: 1 (marketplace_disputes)
-- Columns added to bookings: remainder_hold, remainder_hold_reason,
--   marketplace_cancelled_at, marketplace_cancellation_reason,
--   marketplace_cancelled_by, marketplace_refund_amount, marketplace_refund_percent
-- Storage bucket: dispute-evidence (private, 10MB, PDF/JPEG/PNG/WebP)
-- RLS policies: 6 (disputes: 3, storage: 3)
-- Indexes: 4 (event, filed_by, status partial, bookings remainder_hold partial)
-- Triggers: 1 (updated_at)
-- =============================================================================
