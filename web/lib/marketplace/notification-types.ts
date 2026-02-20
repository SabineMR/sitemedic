/**
 * Notification Types & Interfaces
 * Phase 38: Notifications & Alerts — Plan 01
 *
 * Shared constants and TypeScript types for the marketplace notification system.
 * These must stay in sync with the CHECK constraint in migration 159.
 */

// =============================================================================
// Notification type constants — matches CHECK constraint in migration 159
// =============================================================================

export const NOTIFICATION_TYPES = {
  NEW_EVENT:        'new_event',        // New event posted matching company preferences
  QUOTE_RECEIVED:   'quote_received',   // Client: a company submitted a quote on your event
  QUOTE_AWARDED:    'quote_awarded',    // Company: your quote was selected
  QUOTE_REJECTED:   'quote_rejected',   // Company: your quote was not selected
  PAYMENT_RECEIVED: 'payment_received', // Company: deposit payment confirmed
  PAYMENT_FAILED:   'payment_failed',   // Client: remainder payment failed
  RATING_RECEIVED:  'rating_received',  // Either: you received a new rating
  MESSAGE_RECEIVED: 'message_received', // Either: new marketplace message
  DISPUTE_FILED:    'dispute_filed',    // Either: a dispute was opened
  DISPUTE_RESOLVED: 'dispute_resolved', // Either: a dispute was resolved
  EVENT_CANCELLED:  'event_cancelled',  // Either: event was cancelled
  RATING_NUDGE:     'rating_nudge',     // Either: reminder to leave rating
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// =============================================================================
// Notification categories — groups types for the preferences UI
// Mirrors the column groups in marketplace_notification_preferences
// =============================================================================

export const NOTIFICATION_CATEGORIES = {
  events:   ['new_event', 'event_cancelled'] as const,
  quotes:   ['quote_received', 'quote_awarded', 'quote_rejected'] as const,
  payments: ['payment_received', 'payment_failed'] as const,
  ratings:  ['rating_received', 'rating_nudge'] as const,
  messages: ['message_received'] as const,
  disputes: ['dispute_filed', 'dispute_resolved'] as const,
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

// =============================================================================
// Database row interface — matches user_notifications table schema (migration 159)
// =============================================================================

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;   // ISO 8601 timestamp
  created_at: string;       // ISO 8601 timestamp
}

// =============================================================================
// Database row interface — matches marketplace_notification_preferences (migration 160)
// =============================================================================

export interface NotificationPreferences {
  user_id: string;

  // Email preferences (default TRUE)
  email_new_events: boolean;
  email_quotes: boolean;
  email_awards: boolean;
  email_payments: boolean;
  email_ratings: boolean;
  email_messages: boolean;
  email_disputes: boolean;

  // SMS preferences (default FALSE — PECR opt-in)
  sms_new_events: boolean;
  sms_quotes: boolean;
  sms_awards: boolean;
  sms_payments: boolean;

  // Event alert radius (NULL = all UK)
  event_alert_radius_miles: number | null;

  // SMS opt-in number (E.164 format)
  sms_phone_number: string | null;

  // PECR audit trail
  sms_opted_in_at: string | null;  // ISO 8601 timestamp

  updated_at: string;  // ISO 8601 timestamp
}
