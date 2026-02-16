-- Migration 011: Medic Auto-Scheduling System
-- Purpose: Complete scheduling infrastructure with auto-matching, availability, swaps, and compliance
-- Created: 2026-02-15
-- Depends on: 002_business_operations.sql (medics, bookings tables)

-- =============================================================================
-- TABLE: medic_availability
-- Purpose: Track medic available/unavailable dates for auto-scheduling
-- =============================================================================
CREATE TABLE medic_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Availability window
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,

  -- Time-off request workflow
  request_type TEXT, -- 'time_off', 'sick', 'personal', 'blackout', NULL for regular availability
  status TEXT DEFAULT 'approved', -- 'pending_approval', 'approved', 'denied'
  reason TEXT,

  -- Approval tracking
  requested_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id), -- Admin who approved/denied
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending_approval', 'approved', 'denied')),
  CONSTRAINT valid_request_type CHECK (request_type IN ('time_off', 'sick', 'personal', 'blackout', NULL)),

  -- Prevent duplicate availability records for same medic+date
  UNIQUE(medic_id, date)
);

CREATE INDEX idx_medic_availability_medic ON medic_availability(medic_id);
CREATE INDEX idx_medic_availability_date ON medic_availability(date);
CREATE INDEX idx_medic_availability_status ON medic_availability(status) WHERE status = 'pending_approval';

COMMENT ON TABLE medic_availability IS 'Medic availability calendar with time-off request workflow (approved by admin)';
COMMENT ON COLUMN medic_availability.is_available IS 'FALSE = medic unavailable on this date (time off, sick, etc.)';

-- =============================================================================
-- TABLE: medic_preferences
-- Purpose: Store medic settings (Google Calendar tokens, notification preferences, max hours)
-- =============================================================================
CREATE TABLE medic_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medic_id UUID NOT NULL UNIQUE REFERENCES medics(id) ON DELETE CASCADE,

  -- Google Calendar OAuth
  google_calendar_enabled BOOLEAN DEFAULT FALSE,
  google_calendar_refresh_token TEXT, -- Encrypted OAuth refresh token
  google_calendar_access_token TEXT, -- Short-lived access token
  google_calendar_token_expires_at TIMESTAMPTZ,
  google_calendar_sync_enabled BOOLEAN DEFAULT TRUE, -- Two-way sync on/off

  -- Notification preferences
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  sms_notifications_enabled BOOLEAN DEFAULT FALSE,

  -- Shift preferences
  available_for_rush_jobs BOOLEAN DEFAULT FALSE, -- Opt-in to <24 hour urgent notifications
  max_weekly_hours INT DEFAULT 48, -- Personal limit (may be < 48 for part-time medics)
  preferred_shift_types TEXT[], -- e.g., ['day_shift', 'night_shift', 'weekend']

  -- Fair distribution tracking
  shifts_offered_this_month INT DEFAULT 0, -- Reset to 0 on 1st of month
  shifts_worked_this_month INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_max_hours CHECK (max_weekly_hours > 0 AND max_weekly_hours <= 48)
);

CREATE INDEX idx_medic_preferences_medic ON medic_preferences(medic_id);
CREATE INDEX idx_medic_preferences_rush_jobs ON medic_preferences(available_for_rush_jobs) WHERE available_for_rush_jobs = TRUE;

COMMENT ON TABLE medic_preferences IS 'Medic personal preferences for scheduling, notifications, and Google Calendar integration';
COMMENT ON COLUMN medic_preferences.google_calendar_refresh_token IS 'OAuth refresh token for Google Calendar API (should be encrypted at application layer)';

-- =============================================================================
-- TABLE: shift_swaps
-- Purpose: Peer-to-peer shift swap requests with admin approval workflow
-- =============================================================================
CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Swap participants
  requesting_medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  accepting_medic_id UUID REFERENCES medics(id) ON DELETE SET NULL, -- NULL until someone accepts

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending_acceptance', -- pending_acceptance, pending_approval, approved, denied, cancelled

  -- Requesting medic's reason
  swap_reason TEXT, -- "Sick", "Family emergency", "Personal appointment", etc.

  -- Admin approval
  admin_approved_by UUID REFERENCES auth.users(id),
  admin_approved_at TIMESTAMPTZ,
  admin_denial_reason TEXT,

  -- Qualification check (logged for audit)
  accepting_medic_qualified BOOLEAN, -- TRUE if accepting medic meets all booking requirements
  qualification_warnings JSONB, -- Array of missing qualifications, if any

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending_acceptance', 'pending_approval', 'approved', 'denied', 'cancelled'))
);

CREATE INDEX idx_shift_swaps_booking ON shift_swaps(booking_id);
CREATE INDEX idx_shift_swaps_requesting_medic ON shift_swaps(requesting_medic_id);
CREATE INDEX idx_shift_swaps_accepting_medic ON shift_swaps(accepting_medic_id);
CREATE INDEX idx_shift_swaps_status ON shift_swaps(status);
CREATE INDEX idx_shift_swaps_pending_approval ON shift_swaps(status) WHERE status = 'pending_approval';

COMMENT ON TABLE shift_swaps IS 'Peer-to-peer shift swap marketplace with admin approval workflow';
COMMENT ON COLUMN shift_swaps.status IS 'pending_acceptance = awaiting medic to claim, pending_approval = awaiting admin approval, approved = swap complete';

-- =============================================================================
-- TABLE: auto_schedule_logs
-- Purpose: Audit trail for auto-matching decisions (transparency and debugging)
-- =============================================================================
CREATE TABLE auto_schedule_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Auto-matching result
  assigned_medic_id UUID REFERENCES medics(id) ON DELETE SET NULL,
  confidence_score DECIMAL(5,2), -- 0.00 to 100.00 (average of all criteria scores)

  -- Scoring breakdown (for transparency)
  distance_score DECIMAL(5,2), -- 0-100 based on travel distance
  qualification_score DECIMAL(5,2), -- 0-100 based on requirement match
  availability_score DECIMAL(5,2), -- 0-100 (available = 100, busy = 0)
  utilization_score DECIMAL(5,2), -- 0-100 based on current workload
  rating_score DECIMAL(5,2), -- 0-100 based on star_rating
  performance_score DECIMAL(5,2), -- 0-100 based on riddor_compliance_rate
  fairness_score DECIMAL(5,2), -- 0-100 based on shifts_worked vs shifts_offered

  -- Full ranking details (all candidates considered)
  all_candidates_ranked JSONB, -- Array of {medic_id, total_score, breakdown: {...}}

  -- Result
  assignment_successful BOOLEAN DEFAULT TRUE,
  failure_reason TEXT, -- If assignment failed, why? (e.g., "No qualified medics available")

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auto_schedule_logs_booking ON auto_schedule_logs(booking_id);
CREATE INDEX idx_auto_schedule_logs_medic ON auto_schedule_logs(assigned_medic_id);
CREATE INDEX idx_auto_schedule_logs_success ON auto_schedule_logs(assignment_successful);
CREATE INDEX idx_auto_schedule_logs_created ON auto_schedule_logs(created_at);

COMMENT ON TABLE auto_schedule_logs IS 'Audit trail for auto-scheduling decisions showing why each medic was chosen';
COMMENT ON COLUMN auto_schedule_logs.all_candidates_ranked IS 'Full list of medics considered with their scores for transparency';

-- =============================================================================
-- TABLE: shift_templates
-- Purpose: Reusable shift patterns for recurring bookings (8-hour standard, 12-hour night, etc.)
-- =============================================================================
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template metadata
  template_name TEXT NOT NULL UNIQUE, -- "Standard 8-hour day shift", "Night shift 12-hour", "Weekend cover"
  description TEXT,

  -- Template details
  shift_start_time TIME NOT NULL, -- e.g., 08:00:00
  shift_end_time TIME NOT NULL, -- e.g., 17:00:00
  shift_hours DECIMAL(4,2) NOT NULL, -- e.g., 8.00, 12.00

  -- Pricing defaults (can be overridden per booking)
  default_base_rate DECIMAL(10,2), -- e.g., 30.00 (£30/hour)

  -- Special requirements defaults
  default_confined_space_required BOOLEAN DEFAULT FALSE,
  default_trauma_specialist_required BOOLEAN DEFAULT FALSE,

  -- Visibility
  is_active BOOLEAN DEFAULT TRUE, -- Inactive templates hidden from UI
  is_client_visible BOOLEAN DEFAULT TRUE, -- Show in client booking portal?

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_hours CHECK (shift_hours > 0),
  CONSTRAINT minimum_8_hours CHECK (shift_hours >= 8) -- UK construction standard
);

CREATE INDEX idx_shift_templates_active ON shift_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_shift_templates_client_visible ON shift_templates(is_client_visible) WHERE is_client_visible = TRUE;

COMMENT ON TABLE shift_templates IS 'Pre-defined shift patterns for quick recurring booking creation';
COMMENT ON COLUMN shift_templates.is_client_visible IS 'TRUE = show in client booking portal, FALSE = admin-only';

-- =============================================================================
-- TABLE: schedule_notifications
-- Purpose: Track sent notifications to prevent duplicates and enable audit trail
-- =============================================================================
CREATE TABLE schedule_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Notification target
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  medic_id UUID REFERENCES medics(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL, -- 'shift_assigned', 'shift_reminder_24h', 'shift_reminder_2h', 'cert_expiry_30d', 'swap_request', etc.
  notification_channel TEXT NOT NULL, -- 'push', 'email', 'sms'

  -- Content
  notification_title TEXT,
  notification_body TEXT,

  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  failure_reason TEXT,

  -- External service IDs (for delivery tracking)
  expo_push_ticket_id TEXT, -- Expo Push Notification ticket ID
  email_message_id TEXT, -- SendGrid message ID
  sms_message_sid TEXT, -- Twilio message SID

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_channel CHECK (notification_channel IN ('push', 'email', 'sms')),
  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX idx_schedule_notifications_booking ON schedule_notifications(booking_id);
CREATE INDEX idx_schedule_notifications_medic ON schedule_notifications(medic_id);
CREATE INDEX idx_schedule_notifications_client ON schedule_notifications(client_id);
CREATE INDEX idx_schedule_notifications_type ON schedule_notifications(notification_type);
CREATE INDEX idx_schedule_notifications_sent ON schedule_notifications(sent_at);

COMMENT ON TABLE schedule_notifications IS 'Audit log of all notifications sent (prevents duplicates and enables delivery tracking)';
COMMENT ON COLUMN schedule_notifications.notification_type IS 'Type of notification for deduplication logic (e.g., only send shift_reminder_24h once)';

-- =============================================================================
-- TABLE: client_favorite_medics
-- Purpose: Track client-medic relationships for preferential assignment
-- =============================================================================
CREATE TABLE client_favorite_medics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Favorited details
  favorited_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT, -- Client's notes about why they like this medic

  -- Performance tracking
  total_shifts_together INT DEFAULT 0,
  avg_client_rating DECIMAL(3,2), -- Client's average rating of this medic

  UNIQUE(client_id, medic_id) -- Prevent duplicate favorites
);

CREATE INDEX idx_client_favorite_medics_client ON client_favorite_medics(client_id);
CREATE INDEX idx_client_favorite_medics_medic ON client_favorite_medics(medic_id);

COMMENT ON TABLE client_favorite_medics IS 'Client-medic relationship tracking for preferential auto-assignment';
COMMENT ON COLUMN client_favorite_medics.notes IS 'Client feedback: "Always on time, great with workers, professional"';

-- =============================================================================
-- TABLE: booking_conflicts
-- Purpose: Log detected scheduling conflicts for admin review
-- =============================================================================
CREATE TABLE booking_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Conflict details
  conflict_type TEXT NOT NULL, -- 'double_booking', 'qualification_mismatch', 'overtime_violation', 'insufficient_rest', 'travel_time_infeasible'
  severity TEXT NOT NULL, -- 'critical' (blocks assignment), 'warning' (allows override)
  conflict_description TEXT NOT NULL, -- Human-readable: "Medic already booked at Site XYZ 8am-5pm"

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT, -- 'assigned_anyway', 'assigned_different_medic', 'booking_cancelled', 'booking_rescheduled'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_conflict_type CHECK (conflict_type IN ('double_booking', 'qualification_mismatch', 'overtime_violation', 'insufficient_rest', 'travel_time_infeasible', 'google_calendar_conflict')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'warning'))
);

CREATE INDEX idx_booking_conflicts_booking ON booking_conflicts(booking_id);
CREATE INDEX idx_booking_conflicts_medic ON booking_conflicts(medic_id);
CREATE INDEX idx_booking_conflicts_unresolved ON booking_conflicts(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_booking_conflicts_type ON booking_conflicts(conflict_type);

COMMENT ON TABLE booking_conflicts IS 'Log of all scheduling conflicts detected (for admin review and resolution tracking)';
COMMENT ON COLUMN booking_conflicts.severity IS 'critical = blocks assignment, warning = allows admin override';

-- =============================================================================
-- FUNCTION: check_working_time_compliance
-- Purpose: UK Working Time Regulations 1998 enforcement (48-hour week, 11-hour rest)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_working_time_compliance(
  p_medic_id UUID,
  p_shift_start TIMESTAMPTZ,
  p_shift_end TIMESTAMPTZ
) RETURNS TABLE (
  is_compliant BOOLEAN,
  violation_type TEXT,
  violation_details TEXT,
  current_weekly_hours DECIMAL
) AS $$
DECLARE
  v_weekly_hours DECIMAL;
  v_new_shift_hours DECIMAL;
  v_total_hours DECIMAL;
  v_last_shift_end TIMESTAMPTZ;
  v_rest_hours DECIMAL;
  v_max_weekly_hours INT;
BEGIN
  -- Get medic's personal max weekly hours (may be < 48 for part-time)
  SELECT COALESCE(max_weekly_hours, 48) INTO v_max_weekly_hours
  FROM medic_preferences
  WHERE medic_id = p_medic_id;

  -- Calculate hours for new shift
  v_new_shift_hours := EXTRACT(EPOCH FROM (p_shift_end - p_shift_start)) / 3600;

  -- Calculate current weekly hours (rolling 7-day window)
  SELECT COALESCE(SUM(shift_hours), 0) INTO v_weekly_hours
  FROM bookings
  WHERE medic_id = p_medic_id
    AND shift_date >= CURRENT_DATE - INTERVAL '7 days'
    AND shift_date <= CURRENT_DATE
    AND status NOT IN ('cancelled');

  v_total_hours := v_weekly_hours + v_new_shift_hours;

  -- Check 48-hour weekly limit (or medic's personal limit)
  IF v_total_hours > v_max_weekly_hours THEN
    RETURN QUERY SELECT
      FALSE,
      'overtime_violation'::TEXT,
      format('Would exceed %s-hour weekly limit (currently at %.1f hours)', v_max_weekly_hours, v_weekly_hours),
      v_weekly_hours;
    RETURN;
  END IF;

  -- Check 11-hour minimum rest period between shifts
  SELECT MAX(shift_date + shift_end_time) INTO v_last_shift_end
  FROM bookings
  WHERE medic_id = p_medic_id
    AND shift_date >= CURRENT_DATE - INTERVAL '2 days'
    AND shift_date < p_shift_start::DATE
    AND status NOT IN ('cancelled');

  IF v_last_shift_end IS NOT NULL THEN
    v_rest_hours := EXTRACT(EPOCH FROM (p_shift_start - v_last_shift_end)) / 3600;

    IF v_rest_hours < 11 THEN
      RETURN QUERY SELECT
        FALSE,
        'insufficient_rest'::TEXT,
        format('Only %.1f hours rest since last shift (requires 11 hours)', v_rest_hours),
        v_weekly_hours;
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    NULL::TEXT,
    NULL::TEXT,
    v_weekly_hours;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_working_time_compliance IS 'Validates UK Working Time Regulations 1998: max 48 hours/week, min 11 hours rest between shifts';

-- =============================================================================
-- FUNCTION: calculate_auto_match_score
-- Purpose: Rank medics for auto-assignment based on multiple weighted criteria
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_auto_match_score(
  p_booking_id UUID,
  p_medic_id UUID
) RETURNS TABLE (
  total_score DECIMAL,
  distance_score DECIMAL,
  qualification_score DECIMAL,
  availability_score DECIMAL,
  utilization_score DECIMAL,
  rating_score DECIMAL,
  performance_score DECIMAL,
  fairness_score DECIMAL
) AS $$
DECLARE
  v_booking RECORD;
  v_medic RECORD;
  v_distance_miles DECIMAL;
  v_travel_time_minutes INT;
  v_has_all_qualifications BOOLEAN;
  v_is_available BOOLEAN;
  v_weekly_utilization DECIMAL;
  v_fairness_ratio DECIMAL;

  v_distance_score DECIMAL := 0;
  v_qualification_score DECIMAL := 0;
  v_availability_score DECIMAL := 0;
  v_utilization_score DECIMAL := 0;
  v_rating_score DECIMAL := 0;
  v_performance_score DECIMAL := 0;
  v_fairness_score DECIMAL := 0;
  v_total_score DECIMAL := 0;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  -- Get medic details
  SELECT * INTO v_medic FROM medics WHERE id = p_medic_id;

  -- 1. DISTANCE SCORE (0-100 points)
  -- Check travel time cache
  SELECT travel_time_minutes, distance_miles INTO v_travel_time_minutes, v_distance_miles
  FROM travel_time_cache
  WHERE origin_postcode = v_medic.home_postcode
    AND destination_postcode = v_booking.site_postcode
    AND expires_at > NOW();

  IF v_distance_miles IS NOT NULL THEN
    IF v_distance_miles < 10 THEN
      v_distance_score := 100;
    ELSIF v_distance_miles < 20 THEN
      v_distance_score := 75;
    ELSIF v_distance_miles < 30 THEN
      v_distance_score := 50;
    ELSE
      v_distance_score := 25;
    END IF;
  ELSE
    -- Fallback: Assume medium distance if no cache
    v_distance_score := 50;
  END IF;

  -- 2. QUALIFICATION SCORE (0-100 points, CRITICAL)
  v_has_all_qualifications := TRUE;

  IF v_booking.confined_space_required AND NOT v_medic.has_confined_space_cert THEN
    v_has_all_qualifications := FALSE;
  END IF;

  IF v_booking.trauma_specialist_required AND NOT v_medic.has_trauma_cert THEN
    v_has_all_qualifications := FALSE;
  END IF;

  IF v_has_all_qualifications THEN
    v_qualification_score := 100;
  ELSE
    v_qualification_score := 0; -- Missing qualifications = disqualified
  END IF;

  -- 3. AVAILABILITY SCORE (0-100 points, CRITICAL)
  -- Check medic_availability table
  SELECT COUNT(*) = 0 INTO v_is_available
  FROM medic_availability
  WHERE medic_id = p_medic_id
    AND date = v_booking.shift_date
    AND is_available = FALSE
    AND status = 'approved';

  -- Check for double-booking
  IF v_is_available THEN
    SELECT COUNT(*) = 0 INTO v_is_available
    FROM bookings
    WHERE medic_id = p_medic_id
      AND shift_date = v_booking.shift_date
      AND status NOT IN ('cancelled')
      AND id != p_booking_id; -- Exclude current booking if re-assigning
  END IF;

  IF v_is_available THEN
    v_availability_score := 100;
  ELSE
    v_availability_score := 0; -- Not available = disqualified
  END IF;

  -- 4. UTILIZATION SCORE (0-100 points)
  -- Lower utilization = higher score (balance workload)
  SELECT COALESCE(SUM(shift_hours), 0) INTO v_weekly_utilization
  FROM bookings
  WHERE medic_id = p_medic_id
    AND shift_date >= CURRENT_DATE - INTERVAL '7 days'
    AND shift_date <= CURRENT_DATE
    AND status NOT IN ('cancelled');

  v_weekly_utilization := (v_weekly_utilization / 40) * 100; -- % of 40-hour week

  IF v_weekly_utilization < 60 THEN
    v_utilization_score := 100;
  ELSIF v_weekly_utilization < 80 THEN
    v_utilization_score := 75;
  ELSE
    v_utilization_score := 50; -- Approaching burnout
  END IF;

  -- 5. RATING SCORE (0-100 points)
  v_rating_score := v_medic.star_rating * 20; -- Convert 0-5 to 0-100

  -- 6. PERFORMANCE SCORE (0-100 points)
  v_performance_score := v_medic.riddor_compliance_rate; -- Already 0-100

  -- 7. FAIRNESS SCORE (0-100 points)
  -- Prioritize medics with fewer shifts this month
  SELECT shifts_offered_this_month, shifts_worked_this_month INTO v_fairness_ratio
  FROM medic_preferences
  WHERE medic_id = p_medic_id;

  IF v_fairness_ratio IS NOT NULL AND v_fairness_ratio > 0 THEN
    v_fairness_ratio := (shifts_worked_this_month::DECIMAL / shifts_offered_this_month) * 100;
    v_fairness_score := 100 - v_fairness_ratio; -- Lower ratio = higher score
  ELSE
    v_fairness_score := 100; -- New medic, no history yet
  END IF;

  -- TOTAL SCORE (weighted average)
  -- Critical criteria (qualification, availability) must be 100 or medic is disqualified
  IF v_qualification_score < 100 OR v_availability_score < 100 THEN
    v_total_score := 0; -- Disqualified
  ELSE
    v_total_score := (
      (v_distance_score * 0.25) +        -- 25% weight on distance
      (v_qualification_score * 0.20) +   -- 20% weight on qualifications
      (v_availability_score * 0.15) +    -- 15% weight on availability
      (v_utilization_score * 0.15) +     -- 15% weight on workload balance
      (v_rating_score * 0.10) +          -- 10% weight on star rating
      (v_performance_score * 0.10) +     -- 10% weight on RIDDOR compliance
      (v_fairness_score * 0.05)          -- 5% weight on fair distribution
    );
  END IF;

  RETURN QUERY SELECT
    v_total_score,
    v_distance_score,
    v_qualification_score,
    v_availability_score,
    v_utilization_score,
    v_rating_score,
    v_performance_score,
    v_fairness_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_auto_match_score IS 'Calculates 0-100 score for medic-booking match based on 7 weighted criteria';

-- =============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =============================================================================
CREATE TRIGGER update_medic_availability_updated_at BEFORE UPDATE ON medic_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medic_preferences_updated_at BEFORE UPDATE ON medic_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_swaps_updated_at BEFORE UPDATE ON shift_swaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default shift templates
-- =============================================================================
INSERT INTO shift_templates (template_name, description, shift_start_time, shift_end_time, shift_hours, default_base_rate, is_client_visible)
VALUES
  ('Standard 8-hour day shift', 'Standard construction day shift (8am-5pm with 1 hour lunch)', '08:00:00', '17:00:00', 8.00, 30.00, TRUE),
  ('Standard 10-hour day shift', 'Extended day shift (7am-6pm with 1 hour lunch)', '07:00:00', '18:00:00', 10.00, 32.00, TRUE),
  ('Night shift 8-hour', 'Night shift (10pm-6am)', '22:00:00', '06:00:00', 8.00, 35.00, TRUE),
  ('Night shift 12-hour', 'Extended night shift (8pm-8am)', '20:00:00', '08:00:00', 12.00, 37.00, TRUE),
  ('Weekend cover (Saturday)', 'Weekend coverage Saturday (8am-5pm)', '08:00:00', '17:00:00', 8.00, 35.00, TRUE),
  ('Weekend cover (Sunday)', 'Weekend coverage Sunday (8am-5pm)', '08:00:00', '17:00:00', 8.00, 40.00, TRUE),
  ('Emergency on-call 24h', 'Emergency on-call 24-hour coverage', '00:00:00', '23:59:00', 24.00, 45.00, FALSE); -- Admin only

COMMENT ON SCHEMA public IS 'Medic auto-scheduling system with Google Calendar sync and UK compliance - Migration 011';
