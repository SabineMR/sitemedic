/**
 * Marketplace Roster TypeScript Types
 * Phase 37: Company Accounts — Plan 01
 *
 * Mirrors the SQL schema from:
 *   - 156_company_roster_medics.sql (company_roster_medics table)
 *   - marketplace_companies roster_size + insurance_status columns
 *
 * These types are the single source of truth for TypeScript consumers
 * and ensure consistency between database and application layers.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Roster membership status lifecycle: pending → active → inactive | suspended */
export type RosterMedicStatus = 'pending' | 'active' | 'inactive' | 'suspended';

/** Company insurance verification status */
export type InsuranceStatus = 'verified' | 'expired' | 'unverified';

// =============================================================================
// Database Row Interfaces
// =============================================================================

/**
 * Mirrors company_roster_medics table (156_company_roster_medics.sql)
 * Represents a single medic's membership in a company roster
 */
export interface CompanyRosterMedic {
  id: string;
  company_id: string;
  medic_id: string | null; // Nullable for pending invitations

  // Roster status
  status: RosterMedicStatus;

  // Company-specific role and rate
  title: string | null;
  hourly_rate: number | null;
  qualifications: string[] | null;

  // Availability management
  available: boolean;
  unavailable_reason: string | null;
  unavailable_from: string | null; // DATE as ISO string
  unavailable_until: string | null; // DATE as ISO string

  // Invitation workflow
  invitation_email: string | null;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;

  // Membership lifecycle
  joined_at: string;
  left_at: string | null;

  // Audit
  added_by: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Extended roster medic with joined medic details
 * Used in roster list views where we display medic name/email alongside roster entry
 */
export interface CompanyRosterMedicWithDetails extends CompanyRosterMedic {
  medic_name: string | null;
  medic_email: string | null;
}

// =============================================================================
// Company Profile Display
// =============================================================================

/** Team member preview for company profile (limited public information) */
export interface TeamMemberPreview {
  medic_id: string;
  name: string;
  qualification: string | null;
  title: string | null;
  available: boolean;
}

/**
 * Company profile display data with denormalized aggregations
 * Used on the public company profile page
 */
export interface CompanyProfileDisplay {
  id: string;
  company_name: string;
  company_description: string | null;
  coverage_areas: string[] | null;
  roster_size: number;
  average_rating: number;
  review_count: number;
  total_events_completed: number;
  insurance_status: InsuranceStatus;
  verification_status: string;
  created_at: string;
  team_preview: TeamMemberPreview[];
}

// =============================================================================
// Invitation Types
// =============================================================================

/** Roster invitation data */
export interface RosterInvitation {
  company_id: string;
  invitation_email: string;
  invitation_token: string;
  expires_at: string;
}

// =============================================================================
// Human-Readable Label Maps
// =============================================================================

/** Human-readable labels for roster medic status */
export const ROSTER_STATUS_LABELS: Record<RosterMedicStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

/** Human-readable labels for insurance status */
export const INSURANCE_STATUS_LABELS: Record<InsuranceStatus, string> = {
  verified: 'Verified',
  expired: 'Expired',
  unverified: 'Unverified',
};
