/**
 * Certification Tracking Types
 * Phase 7: Certification Tracking - Plan 01
 *
 * TypeScript interfaces and constants for UK construction certification tracking.
 * Matches JSONB structure in medics.certifications and PostgreSQL RPC function returns.
 */

// =============================================
// UK Construction Certification Types
// =============================================

/**
 * Standard UK construction certification types
 * CSCS - Construction Skills Certification Scheme
 * CPCS - Construction Plant Competence Scheme
 * IPAF - International Powered Access Federation
 * PASMA - Prefabricated Access Suppliers' and Manufacturers' Association
 * Gas Safe - Gas Safe Register (UK legal requirement for gas work)
 */
export const UK_CERT_TYPES = ['CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe'] as const;

export type UKCertType = typeof UK_CERT_TYPES[number];

// =============================================
// Certification Data Structures
// =============================================

/**
 * Certification interface - matches JSONB structure in medics.certifications
 * Stored as array of certifications per medic
 */
export interface Certification {
  /** Certification type (CSCS, CPCS, IPAF, PASMA, Gas Safe) */
  type: UKCertType;
  /** Certificate number/ID */
  cert_number: string;
  /** Expiry date in ISO format (YYYY-MM-DD) */
  expiry_date: string;
  /** Issue date in ISO format (YYYY-MM-DD) - optional */
  issued_date?: string;
  /** Card colour for CPCS certifications (e.g., 'red', 'blue') - optional */
  card_colour?: string;
  /** Additional notes about the certification - optional */
  notes?: string;
}

/**
 * Certification status categories
 * - valid: Expiry date more than 30 days away
 * - expiring-soon: Expiry date within 30 days
 * - expired: Expiry date in the past
 */
export type CertificationStatus = 'valid' | 'expiring-soon' | 'expired';

// =============================================
// Progressive Reminder System
// =============================================

/**
 * Reminder stage configuration for progressive email alerts
 * Used by certification-expiry-checker Edge Function
 */
export interface ReminderStage {
  /** Days before expiry to send reminder (30, 14, 7, 1) */
  days_before: number;
  /** Urgency level for email styling */
  urgency: 'info' | 'warning' | 'critical';
  /** Email recipients for this stage */
  recipients: ('medic' | 'manager' | 'admin')[];
  /** Subject line prefix (e.g., 'CRITICAL', 'URGENT') */
  subject_prefix: string;
}

/**
 * Progressive reminder schedule for certification expiry
 * 30 days: Info reminder to medic only
 * 14 days: Warning to medic + manager
 * 7 days: Urgent warning to medic + manager
 * 1 day: Critical alert to medic + manager + admin
 */
export const REMINDER_STAGES: ReminderStage[] = [
  {
    days_before: 30,
    urgency: 'info',
    recipients: ['medic'],
    subject_prefix: 'Reminder'
  },
  {
    days_before: 14,
    urgency: 'warning',
    recipients: ['medic', 'manager'],
    subject_prefix: 'Important'
  },
  {
    days_before: 7,
    urgency: 'warning',
    recipients: ['medic', 'manager'],
    subject_prefix: 'Urgent'
  },
  {
    days_before: 1,
    urgency: 'critical',
    recipients: ['medic', 'manager', 'admin'],
    subject_prefix: 'CRITICAL'
  },
];

// =============================================
// Database RPC Return Types
// =============================================

/**
 * Certification summary by medic
 * Returned by get_certification_summary_by_org() RPC function
 * Used by dashboard compliance overview
 */
export interface CertificationSummary {
  /** Medic UUID */
  medic_id: string;
  /** Full name (first + last) */
  medic_name: string;
  /** Total number of certifications */
  total_certs: number;
  /** Count of expired certifications */
  expired_certs: number;
  /** Count of certifications expiring within 30 days */
  expiring_soon_certs: number;
  /** Count of valid certifications (>30 days) */
  valid_certs: number;
  /** Overall compliance status */
  status: 'compliant' | 'at-risk' | 'non-compliant';
}

/**
 * Certification reminder record
 * Stored in certification_reminders table for audit trail
 */
export interface CertificationReminder {
  /** UUID */
  id: string;
  /** Medic UUID */
  medic_id: string;
  /** Certification type */
  cert_type: UKCertType;
  /** Days before expiry when reminder was sent (30, 14, 7, 1) */
  days_before: number;
  /** Timestamp when reminder was sent */
  sent_at: string;
  /** Resend API message ID for delivery tracking */
  resend_message_id: string | null;
  /** Organization UUID */
  org_id: string;
}

/**
 * Expiring certification details
 * Returned by get_certifications_expiring_in_days() RPC function
 * Used by Edge Function to send reminder emails
 */
export interface ExpiringCertification {
  /** Medic UUID */
  medic_id: string;
  /** Medic first name */
  medic_first_name: string;
  /** Medic last name */
  medic_last_name: string;
  /** Medic email address */
  medic_email: string;
  /** Certification type */
  cert_type: string;
  /** Certificate number */
  cert_number: string;
  /** Expiry date (ISO format YYYY-MM-DD) */
  expiry_date: string;
  /** Formatted expiry date (DD Mon YYYY) */
  expiry_date_formatted: string;
  /** Days remaining until expiry */
  days_remaining: number;
  /** Renewal URL for certification body */
  renewal_url: string | null;
  /** Organization UUID */
  org_id: string;
}

// =============================================
// Renewal URLs
// =============================================

/**
 * Official renewal URLs for UK certification bodies
 * Maps certification type to renewal information page
 */
export const CERT_RENEWAL_URLS: Record<UKCertType, string> = {
  'CSCS': 'https://www.cscs.uk.com/apply-for-card/',
  'CPCS': 'https://www.cpcscards.com/renewal',
  'IPAF': 'https://www.ipaf.org/en/training',
  'PASMA': 'https://www.pasma.co.uk/training',
  'Gas Safe': 'https://www.gassaferegister.co.uk/',
};
