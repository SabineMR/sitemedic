/**
 * Marketplace TypeScript Types
 * Phase 32: Foundation Schema & Registration
 *
 * Mirrors the SQL schema from:
 *   - 140_marketplace_foundation.sql (marketplace_companies, medic_commitments)
 *   - 141_compliance_documents.sql (compliance_documents)
 *
 * These types are the single source of truth for TypeScript consumers.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Verification status for marketplace companies */
export type VerificationStatus =
  | 'pending'
  | 'cqc_verified'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'info_requested';

/** Document types accepted for compliance */
export type DocumentType =
  | 'public_liability_insurance'
  | 'employers_liability_insurance'
  | 'professional_indemnity_insurance'
  | 'dbs_certificate'
  | 'other';

/** Document review status */
export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** Booking source discriminator */
export type BookingSource = 'direct' | 'marketplace';

/** Admin verification action */
export type VerificationAction = 'approve' | 'reject' | 'request_info';

/** Registration wizard steps */
export type RegistrationStep =
  | 'company-details'
  | 'cqc-verification'
  | 'document-upload'
  | 'stripe-connect';

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Mirrors marketplace_companies table (140_marketplace_foundation.sql) */
export interface MarketplaceCompany {
  id: string;
  org_id: string | null;
  admin_user_id: string;

  // CQC fields
  cqc_provider_id: string;
  cqc_registration_status: string;
  cqc_last_checked_at: string | null;
  cqc_auto_verified: boolean;

  // Company details
  company_name: string;
  company_reg_number: string | null;
  company_address: string | null;
  company_postcode: string | null;
  company_phone: string | null;
  company_email: string;
  coverage_areas: string[] | null;
  company_description: string | null;

  // Stripe Connect
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;

  // Verification workflow
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;

  // Marketplace permissions
  can_browse_events: boolean;
  can_submit_quotes: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Mirrors compliance_documents table (141_compliance_documents.sql) */
export interface ComplianceDocument {
  id: string;
  company_id: string;
  uploaded_by: string;

  // Document type
  document_type: DocumentType;

  // Storage reference
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;

  // Document metadata
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  staff_member_name: string | null;

  // Review workflow
  review_status: DocumentReviewStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Mirrors medic_commitments table (140_marketplace_foundation.sql) */
export interface MedicCommitment {
  id: string;
  medic_id: string;
  booking_id: string | null;
  marketplace_company_id: string | null;
  event_date: string;
  time_range: string; // PostgreSQL TSRANGE serialised as string
  created_at: string;
}

// =============================================================================
// CQC API Types
// =============================================================================

/** CQC provider data from api.cqc.org.uk/public/v1 */
export interface CQCProvider {
  providerId: string;
  providerName: string;
  registrationStatus: string;
  registrationDate: string;
  organisationType: string;
  locationIds: string[];
}

/** Result of CQC provider verification */
export interface CQCVerificationResult {
  valid: boolean;
  provider: CQCProvider | null;
  error?: string;
}
