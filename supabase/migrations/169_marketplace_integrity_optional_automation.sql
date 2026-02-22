-- Migration 169: Marketplace Integrity Optional Automation Enhancements
-- Phase 52: Marketplace Integrity Automation - Plan 02
-- Created: 2026-02-22
-- Purpose: add advanced referral/collision/co-share signal taxonomy and integrity alert notification type.

-- Expand integrity signal taxonomy
ALTER TABLE marketplace_integrity_signals
  DROP CONSTRAINT IF EXISTS marketplace_integrity_signals_signal_type_check;

ALTER TABLE marketplace_integrity_signals
  ADD CONSTRAINT marketplace_integrity_signals_signal_type_check
  CHECK (
    signal_type IN (
      'THREAD_NO_CONVERT',
      'PROXIMITY_CLONE',
      'MARKETPLACE_TO_DIRECT_SWITCH',
      'PASS_ON_ACTIVITY',
      'EVENT_COLLISION_DUPLICATE',
      'REFERRAL_LOOP_ABUSE',
      'REFERRAL_NETWORK_CLUSTER',
      'CO_SHARE_POLICY_BREACH'
    )
  );

-- Allow integrity escalation notifications in unified feed
ALTER TABLE user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (
    type IN (
      'new_event',
      'quote_received',
      'quote_awarded',
      'quote_rejected',
      'payment_received',
      'payment_failed',
      'rating_received',
      'message_received',
      'dispute_filed',
      'dispute_resolved',
      'event_cancelled',
      'rating_nudge',
      'integrity_alert'
    )
  );

COMMENT ON CONSTRAINT user_notifications_type_check ON user_notifications IS
  'Notification type whitelist (includes integrity_alert for escalation/SLA reporting).';
