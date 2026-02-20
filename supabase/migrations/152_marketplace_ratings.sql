-- Migration 152: Marketplace Ratings Extensions
-- Phase 36: Ratings, Messaging & Disputes — Plan 01
-- Created: 2026-02-20
-- Purpose: Extend job_ratings for marketplace blind rating window + moderation.
--          Add denormalized aggregate rating columns to marketplace_companies.
--          Create trigger to keep aggregates in sync.
--
-- Key invariant: Blind window — neither party sees the other's rating until
--   both have submitted OR 14 days after event completion (whichever first).

-- =============================================================================
-- EXTEND job_ratings: Blind window + moderation columns
-- =============================================================================

-- Blind window: computed as event completion date + 14 days, set on INSERT
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS blind_window_expires_at TIMESTAMPTZ;

-- Moderation workflow
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE job_ratings ADD CONSTRAINT job_ratings_moderation_status_check
  CHECK (moderation_status IN ('published', 'flagged', 'removed'));

-- Flagging: when a user reports a review
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id);
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- Admin moderation resolution
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

COMMENT ON COLUMN job_ratings.blind_window_expires_at IS 'UTC timestamp after which rating becomes visible regardless of other party submitting';
COMMENT ON COLUMN job_ratings.moderation_status IS 'published = live, flagged = reported by user, removed = hidden by admin';

-- =============================================================================
-- EXTEND marketplace_companies: Denormalized aggregate rating
-- =============================================================================

ALTER TABLE marketplace_companies ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE marketplace_companies ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

COMMENT ON COLUMN marketplace_companies.average_rating IS 'Denormalized average of published client ratings (1 decimal, e.g. 4.3)';
COMMENT ON COLUMN marketplace_companies.review_count IS 'Denormalized count of published client ratings';

-- =============================================================================
-- TRIGGER FUNCTION: update_company_rating_aggregate()
-- Recomputes average_rating + review_count on marketplace_companies
-- whenever a job_rating is inserted, updated, or deleted.
-- Only counts ratings where rater_type = 'client' AND moderation_status = 'published'.
-- Resolves company via: marketplace_quotes (awarded) -> marketplace_companies.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_company_rating_aggregate()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_company_id UUID;
  v_avg NUMERIC(2,1);
  v_count INTEGER;
BEGIN
  -- Determine which job_id to process
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD.job_id;
  ELSE
    v_job_id := NEW.job_id;
  END IF;

  -- Resolve company_id from the awarded quote on this event
  SELECT mq.company_id INTO v_company_id
  FROM marketplace_quotes mq
  WHERE mq.event_id = v_job_id
    AND mq.status = 'awarded'
  LIMIT 1;

  -- If no awarded quote found (e.g. direct job), skip aggregate update
  IF v_company_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Compute aggregate across ALL events for this company
  -- (client ratings on events where this company won the quote)
  SELECT
    COALESCE(ROUND(AVG(jr.rating)::numeric, 1), 0),
    COALESCE(COUNT(jr.id)::integer, 0)
  INTO v_avg, v_count
  FROM job_ratings jr
  JOIN marketplace_quotes mq ON mq.event_id = jr.job_id AND mq.status = 'awarded'
  WHERE mq.company_id = v_company_id
    AND jr.rater_type = 'client'
    AND jr.moderation_status = 'published';

  -- Update denormalized columns
  UPDATE marketplace_companies
  SET average_rating = v_avg,
      review_count = v_count
  WHERE id = v_company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_company_rating_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON job_ratings
  FOR EACH ROW EXECUTE FUNCTION update_company_rating_aggregate();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Partial index for admin moderation queries (flagged/removed ratings)
CREATE INDEX IF NOT EXISTS idx_job_ratings_moderation
  ON job_ratings(moderation_status)
  WHERE moderation_status != 'published';

-- Composite index for efficient aggregate computation
CREATE INDEX IF NOT EXISTS idx_job_ratings_company_aggregate
  ON job_ratings(job_id, rater_type, moderation_status);

-- =============================================================================
-- SUMMARY
-- Columns added to job_ratings: blind_window_expires_at, moderation_status,
--   flagged_at, flagged_by, flagged_reason, moderation_notes, moderated_by, moderated_at
-- Columns added to marketplace_companies: average_rating, review_count
-- Trigger: update_company_rating_aggregate (AFTER INSERT/UPDATE/DELETE on job_ratings)
-- Indexes: 2 (moderation partial, company aggregate composite)
-- =============================================================================
