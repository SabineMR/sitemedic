/**
 * Compliance Utilities
 * Phase 32: Foundation Schema & Registration
 *
 * Utility functions for checking document expiry, identifying missing required
 * documents, and providing human-readable labels for document types.
 */

import type { ComplianceDocument, DocumentType } from './types';

// =============================================================================
// Constants
// =============================================================================

/** Required document types for marketplace company registration */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'public_liability_insurance',
  'employers_liability_insurance',
  'professional_indemnity_insurance',
  'dbs_certificate',
];

/** Human-readable labels for document types */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  public_liability_insurance: 'Public Liability Insurance',
  employers_liability_insurance: "Employer's Liability Insurance",
  professional_indemnity_insurance: 'Professional Indemnity Insurance',
  dbs_certificate: 'DBS Certificate',
  other: 'Other',
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Check if a single compliance document is expired.
 *
 * @param doc - The compliance document to check
 * @returns true if the document's expiry_date is in the past; false if no expiry or still valid
 */
export function isDocumentExpired(doc: ComplianceDocument): boolean {
  if (!doc.expiry_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(doc.expiry_date);
  expiry.setHours(0, 0, 0, 0);

  return expiry < today;
}

/**
 * Get documents that are expiring within the next N days.
 * Only returns documents that are NOT yet expired but WILL expire within the window.
 *
 * @param documents - Array of compliance documents to check
 * @param withinDays - Number of days to look ahead (default: 30)
 * @returns Array of documents expiring within the specified window
 */
export function getExpiringDocuments(
  documents: ComplianceDocument[],
  withinDays: number = 30
): ComplianceDocument[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);

  return documents.filter((doc) => {
    if (!doc.expiry_date) return false;

    const expiry = new Date(doc.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    return expiry >= today && expiry <= cutoff;
  });
}

/**
 * Check if a company has all required compliance documents with approved status
 * and none expired.
 *
 * @param documents - All compliance documents for the company
 * @returns Object with completion status, missing document types, and expired document types
 */
export function hasAllRequiredDocuments(documents: ComplianceDocument[]): {
  complete: boolean;
  missing: DocumentType[];
  expired: DocumentType[];
} {
  const missing: DocumentType[] = [];
  const expired: DocumentType[] = [];

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const doc = documents.find(
      (d) => d.document_type === type && d.review_status === 'approved'
    );

    if (!doc) {
      missing.push(type);
    } else if (isDocumentExpired(doc)) {
      expired.push(type);
    }
  }

  return {
    complete: missing.length === 0 && expired.length === 0,
    missing,
    expired,
  };
}
