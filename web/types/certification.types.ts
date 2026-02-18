/**
 * Certification Tracking Types
 * Phase 7: Certification Tracking - Plan 01
 * Updated: Expanded to cover all 10 industry verticals
 *
 * TypeScript interfaces and constants for UK medical/event/construction certification tracking.
 * Matches JSONB structure in medics.certifications and PostgreSQL RPC function returns.
 */

// =============================================
// All Certification Types (expanded, multi-vertical)
// =============================================

/**
 * All supported certification types across all verticals.
 *
 * Categories:
 *   Medical / Clinical     — pre-hospital care qualifications (all verticals)
 *   Construction           — CSCS, CPCS, IPAF, PASMA, Gas Safe
 *   DBS                    — Disclosure and Barring Service checks (education, children's events)
 *   Motorsport             — FIA / Motorsport UK grades
 *   Events & Festivals     — SIA, Purple Guide, Event Safety
 *   Education              — Paediatric First Aid, safeguarding
 *   Outdoor & Adventure    — Mountain First Aid, Wilderness First Aid
 */
export const UK_CERT_TYPES = [
  // ── Medical / Clinical (all verticals) ──────────────────────────────────
  'FREC 3',             // First Response Emergency Care Level 3 — standard event medic entry cert
  'FREC 4',             // First Response Emergency Care Level 4 — enhanced pre-hospital care
  'PHEC',               // Pre-Hospital Emergency Care (Highfield / Qualsafe)
  'PHTLS',              // Pre-Hospital Trauma Life Support (NAEMT)
  'HCPC Paramedic',     // Health and Care Professions Council registered paramedic
  'EMT',                // Emergency Medical Technician
  'ALS Provider',       // Advanced Life Support (Resuscitation Council UK)
  'PALS Provider',      // Paediatric Advanced Life Support (Resuscitation Council UK)
  'ATLS',               // Advanced Trauma Life Support (Royal College of Surgeons)
  'BLS Instructor',     // Basic Life Support Instructor (Resuscitation Council UK)
  'AED Trained',        // Automated External Defibrillator trained

  // ── Construction ────────────────────────────────────────────────────────
  'CSCS',               // Construction Skills Certification Scheme
  'CPCS',               // Construction Plant Competence Scheme
  'IPAF',               // International Powered Access Federation
  'PASMA',              // Prefabricated Access Suppliers' and Manufacturers' Association
  'Gas Safe',           // Gas Safe Register (UK legal requirement for gas work)

  // ── DBS / Safeguarding ──────────────────────────────────────────────────
  'Enhanced DBS (Children)',         // DBS Enhanced check — working with children
  'Enhanced DBS (Adults)',           // DBS Enhanced check — working with vulnerable adults
  'Enhanced DBS (Barred Lists)',     // DBS Enhanced check including barred lists

  // ── Motorsport ──────────────────────────────────────────────────────────
  'FIA Grade 1',                // Circuit Medical Officer (highest grade — F1/WEC)
  'FIA Grade 2',                // Medical Car / Track Doctor (international events)
  'FIA Grade 3',                // First Responder (national circuit events)
  'Motorsport UK CMO Letter',   // Chief Medical Officer approval letter (Motorsport UK)
  'MSA First Aider',            // Motor Sports Association First Aider certificate

  // ── Events & Festivals ──────────────────────────────────────────────────
  'SIA Door Supervisor',         // Security Industry Authority Door Supervisor licence
  'Purple Guide Certificate',    // Event Safety Alliance / Purple Guide event safety
  'Event Safety Awareness',      // Event Safety Awareness certificate (IOSH/Highfield)
  'NEBOSH General Certificate',  // NEBOSH Certificate in Health, Safety & Risk Management

  // ── Education ───────────────────────────────────────────────────────────
  'Paediatric First Aid',            // Ofsted-recognised Paediatric First Aid (12 hrs)
  'Child Safeguarding Level 2',      // Local Safeguarding Children Board Level 2
  'Child Safeguarding Level 3',      // Designated Safeguarding Lead level

  // ── Outdoor & Adventure ─────────────────────────────────────────────────
  'Mountain First Aid',           // MFA (Mountain Training / equivalent)
  'Wilderness First Aid',         // WFA — remote/wilderness first aid

  // ── Film / TV Production ────────────────────────────────────────────────
  'ScreenSkills Production Safety Passport',  // CPD-based production safety passport (no fixed expiry)
  'EFR',                                      // Emergency First Responder — basic pre-hospital first aid
] as const;

export type UKCertType = typeof UK_CERT_TYPES[number];

// =============================================
// Certification Metadata
// =============================================

export type CertCategory =
  | 'medical'
  | 'construction'
  | 'dbs'
  | 'motorsport'
  | 'events'
  | 'education'
  | 'outdoor';

export interface CertTypeMetadata {
  /** Human-readable label */
  label: string;
  /** Category for grouping in the UI */
  category: CertCategory;
  /** Short description of what the cert covers */
  description: string;
  /** Renewal / info URL */
  renewalUrl?: string;
}

export const CERT_TYPE_METADATA: Record<UKCertType, CertTypeMetadata> = {
  'FREC 3':            { label: 'FREC Level 3', category: 'medical', description: 'First Response Emergency Care Level 3 — event medic entry qualification', renewalUrl: 'https://www.qualsafe.com/qualifications/emergency-care/frec/' },
  'FREC 4':            { label: 'FREC Level 4', category: 'medical', description: 'First Response Emergency Care Level 4 — enhanced pre-hospital care', renewalUrl: 'https://www.qualsafe.com/qualifications/emergency-care/frec/' },
  'PHEC':              { label: 'PHEC', category: 'medical', description: 'Pre-Hospital Emergency Care', renewalUrl: 'https://www.highfield.co.uk/' },
  'PHTLS':             { label: 'PHTLS', category: 'medical', description: 'Pre-Hospital Trauma Life Support (NAEMT)', renewalUrl: 'https://www.naemt.org/education/phtls' },
  'HCPC Paramedic':    { label: 'HCPC Paramedic', category: 'medical', description: 'Health and Care Professions Council registered paramedic', renewalUrl: 'https://www.hcpc-uk.org/' },
  'EMT':               { label: 'EMT', category: 'medical', description: 'Emergency Medical Technician', renewalUrl: undefined },
  'ALS Provider':      { label: 'ALS Provider', category: 'medical', description: 'Advanced Life Support — Resuscitation Council UK', renewalUrl: 'https://www.resus.org.uk/courses/als' },
  'PALS Provider':     { label: 'PALS Provider', category: 'medical', description: 'Paediatric Advanced Life Support — Resuscitation Council UK', renewalUrl: 'https://www.resus.org.uk/courses/pals' },
  'ATLS':              { label: 'ATLS', category: 'medical', description: 'Advanced Trauma Life Support (Royal College of Surgeons)', renewalUrl: 'https://www.rcseng.ac.uk/education-and-exams/courses/atls/' },
  'BLS Instructor':    { label: 'BLS Instructor', category: 'medical', description: 'Basic Life Support Instructor (Resuscitation Council UK)', renewalUrl: 'https://www.resus.org.uk/' },
  'AED Trained':       { label: 'AED Trained', category: 'medical', description: 'Automated External Defibrillator trained', renewalUrl: undefined },

  'CSCS':              { label: 'CSCS', category: 'construction', description: 'Construction Skills Certification Scheme', renewalUrl: 'https://www.cscs.uk.com/apply-for-card/' },
  'CPCS':              { label: 'CPCS', category: 'construction', description: 'Construction Plant Competence Scheme', renewalUrl: 'https://www.cpcscards.com/renewal' },
  'IPAF':              { label: 'IPAF', category: 'construction', description: 'International Powered Access Federation', renewalUrl: 'https://www.ipaf.org/en/training' },
  'PASMA':             { label: 'PASMA', category: 'construction', description: 'Prefabricated Access Suppliers & Manufacturers Association', renewalUrl: 'https://www.pasma.co.uk/training' },
  'Gas Safe':          { label: 'Gas Safe', category: 'construction', description: 'Gas Safe Register (UK legal requirement for gas work)', renewalUrl: 'https://www.gassaferegister.co.uk/' },

  'Enhanced DBS (Children)':     { label: 'Enhanced DBS (Children)', category: 'dbs', description: 'DBS Enhanced check for working with children', renewalUrl: 'https://www.gov.uk/request-copy-criminal-record' },
  'Enhanced DBS (Adults)':       { label: 'Enhanced DBS (Adults)', category: 'dbs', description: 'DBS Enhanced check for working with vulnerable adults', renewalUrl: 'https://www.gov.uk/request-copy-criminal-record' },
  'Enhanced DBS (Barred Lists)': { label: 'Enhanced DBS + Barred Lists', category: 'dbs', description: 'DBS Enhanced check including barred lists check', renewalUrl: 'https://www.gov.uk/request-copy-criminal-record' },

  'FIA Grade 1':              { label: 'FIA Grade 1', category: 'motorsport', description: 'Circuit Medical Officer — highest FIA grade (F1/WEC)', renewalUrl: 'https://www.fia.com/' },
  'FIA Grade 2':              { label: 'FIA Grade 2', category: 'motorsport', description: 'Medical Car / Track Doctor — international events', renewalUrl: 'https://www.fia.com/' },
  'FIA Grade 3':              { label: 'FIA Grade 3', category: 'motorsport', description: 'First Responder — national circuit events', renewalUrl: 'https://www.fia.com/' },
  'Motorsport UK CMO Letter': { label: 'Motorsport UK CMO Letter', category: 'motorsport', description: 'Chief Medical Officer approval letter (Motorsport UK)', renewalUrl: 'https://www.motorsportuk.org/the-sport/safety/medical/' },
  'MSA First Aider':          { label: 'MSA First Aider', category: 'motorsport', description: 'Motor Sports Association First Aider certificate', renewalUrl: 'https://www.motorsportuk.org/' },

  'SIA Door Supervisor':        { label: 'SIA Door Supervisor', category: 'events', description: 'Security Industry Authority Door Supervisor licence', renewalUrl: 'https://www.sia.homeoffice.gov.uk/' },
  'Purple Guide Certificate':   { label: 'Purple Guide Certificate', category: 'events', description: 'Event safety certificate per Events Industry Forum Purple Guide', renewalUrl: 'https://www.thepurpleguide.co.uk/' },
  'Event Safety Awareness':     { label: 'Event Safety Awareness', category: 'events', description: 'Event Safety Awareness certificate (IOSH/Highfield)', renewalUrl: 'https://www.highfield.co.uk/' },
  'NEBOSH General Certificate': { label: 'NEBOSH General Certificate', category: 'events', description: 'NEBOSH Certificate in Health, Safety & Risk Management', renewalUrl: 'https://www.nebosh.org.uk/' },

  'Paediatric First Aid':       { label: 'Paediatric First Aid', category: 'education', description: 'Ofsted-recognised Paediatric First Aid (12 hrs minimum)', renewalUrl: undefined },
  'Child Safeguarding Level 2': { label: 'Child Safeguarding L2', category: 'education', description: 'Local Safeguarding Children Board Level 2 awareness', renewalUrl: undefined },
  'Child Safeguarding Level 3': { label: 'Child Safeguarding L3', category: 'education', description: 'Designated Safeguarding Lead level training', renewalUrl: undefined },

  'Mountain First Aid':     { label: 'Mountain First Aid', category: 'outdoor', description: 'Mountain First Aid (Mountain Training or equivalent)', renewalUrl: 'https://www.mountain-training.org/' },
  'Wilderness First Aid':   { label: 'Wilderness First Aid', category: 'outdoor', description: 'Wilderness First Aid — remote environment care', renewalUrl: undefined },

  'ScreenSkills Production Safety Passport': {
    label: 'ScreenSkills Production Safety Passport',
    category: 'medical',
    description: 'ScreenSkills Production Safety Passport — CPD-based, no fixed expiry',
    renewalUrl: 'https://www.screenskills.com/learning/screenstore/production-safety-passport/',
  },
  'EFR': {
    label: 'Emergency First Responder (EFR)',
    category: 'medical',
    description: 'Emergency First Responder — basic pre-hospital first aid, renewal every 3 years',
    renewalUrl: undefined,
  },
};

// =============================================
// Per-Vertical Recommended Certifications
// =============================================

/**
 * Maps each industry vertical to the certification types most relevant to it.
 * Used by the admin medic profile form to surface the right cert types first.
 * Medics can still hold any cert type — this is a recommendation/filter, not a restriction.
 */
export const VERTICAL_CERT_TYPES: Record<string, UKCertType[]> = {
  construction: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe',
    'ALS Provider', 'PHTLS',
  ],
  tv_film: [
    'HCPC Paramedic',
    'ScreenSkills Production Safety Passport',
    'FREC 4',
    'EFR',
    'PHEC',
    'PHTLS',
    'ALS Provider',
    'ATLS',
    'FREC 3',
  ],
  corporate: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'AED Trained',
    'NEBOSH General Certificate',
  ],
  festivals: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'PHTLS', 'AED Trained',
    'SIA Door Supervisor', 'Purple Guide Certificate', 'Event Safety Awareness',
  ],
  motorsport: [
    'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'ATLS', 'PHTLS',
    'FIA Grade 1', 'FIA Grade 2', 'FIA Grade 3',
    'Motorsport UK CMO Letter', 'MSA First Aider',
  ],
  sporting_events: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'AED Trained',
    'SIA Door Supervisor', 'Event Safety Awareness',
  ],
  fairs_shows: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'AED Trained',
    'SIA Door Supervisor', 'Event Safety Awareness', 'Purple Guide Certificate',
  ],
  private_events: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'AED Trained',
    'Event Safety Awareness',
  ],
  education: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'PALS Provider', 'AED Trained',
    'Paediatric First Aid',
    'Enhanced DBS (Children)', 'Enhanced DBS (Barred Lists)',
    'Child Safeguarding Level 2', 'Child Safeguarding Level 3',
  ],
  outdoor_adventure: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'PHTLS', 'AED Trained',
    'Mountain First Aid', 'Wilderness First Aid',
    'Enhanced DBS (Adults)',
  ],
  general: [
    'FREC 3', 'FREC 4', 'PHEC', 'HCPC Paramedic',
    'ALS Provider', 'AED Trained',
  ],
};

/**
 * Returns the recommended cert types for a given vertical,
 * with the vertical-specific ones first, followed by any remaining types.
 */
export function getRecommendedCertTypes(verticalId: string): UKCertType[] {
  const recommended = VERTICAL_CERT_TYPES[verticalId] ?? VERTICAL_CERT_TYPES.general;
  const remaining = UK_CERT_TYPES.filter((c) => !recommended.includes(c));
  return [...recommended, ...remaining];
}

// =============================================
// Certification Data Structures
// =============================================

/**
 * Certification interface - matches JSONB structure in medics.certifications
 * Stored as array of certifications per medic.
 * The `type` field accepts any UKCertType string.
 */
export interface Certification {
  /** Certification type */
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
  cert_type: string;
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
// Renewal URLs (legacy — prefer CERT_TYPE_METADATA)
// =============================================

/**
 * Official renewal URLs for certification bodies.
 * @deprecated Use CERT_TYPE_METADATA[type].renewalUrl instead.
 * Kept for backward compatibility with Edge Function cert renewal email.
 */
export const CERT_RENEWAL_URLS: Partial<Record<UKCertType, string>> = Object.fromEntries(
  UK_CERT_TYPES
    .filter((t) => CERT_TYPE_METADATA[t].renewalUrl)
    .map((t) => [t, CERT_TYPE_METADATA[t].renewalUrl!])
);
