/**
 * Company Profile Display Utilities
 * Phase 37: Company Accounts -- Plan 03
 *
 * Helper functions for transforming and displaying company profile data:
 *   - formatCompanyProfile: transforms API response to display-ready format
 *   - getInsuranceBadgeColor: returns Tailwind classes for insurance status badges
 *   - getVerificationBadgeLabel: maps verification statuses to human-readable labels
 */

import type { CompanyProfileDisplay, InsuranceStatus } from './roster-types';

// =============================================================================
// Format Company Profile for Display
// =============================================================================

/**
 * Transforms raw API company profile response into a display-ready format.
 * Handles null values, formats dates, and provides sensible defaults.
 *
 * @param raw - Raw profile data from the API response
 * @returns Formatted CompanyProfileDisplay ready for rendering
 */
export function formatCompanyProfile(raw: Partial<CompanyProfileDisplay>): CompanyProfileDisplay {
  return {
    id: raw.id ?? '',
    company_name: raw.company_name ?? 'Unknown Company',
    company_description: raw.company_description ?? null,
    coverage_areas: raw.coverage_areas ?? [],
    roster_size: raw.roster_size ?? 0,
    average_rating: raw.average_rating ?? 0,
    review_count: raw.review_count ?? 0,
    insurance_status: raw.insurance_status ?? 'unverified',
    verification_status: raw.verification_status ?? 'pending',
    created_at: raw.created_at ?? new Date().toISOString(),
    team_preview: raw.team_preview ?? [],
  };
}

// =============================================================================
// Insurance Badge Color Mapping
// =============================================================================

/** Tailwind class config for insurance status badges */
interface InsuranceBadgeClasses {
  bg: string;
  text: string;
  border: string;
}

const INSURANCE_BADGE_COLORS: Record<InsuranceStatus, InsuranceBadgeClasses> = {
  verified: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  expired: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  unverified: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
};

/**
 * Returns Tailwind classes for an insurance status badge.
 *
 * @param status - Insurance status: 'verified' | 'expired' | 'unverified'
 * @returns Object with bg, text, and border Tailwind class strings
 */
export function getInsuranceBadgeColor(status: InsuranceStatus): InsuranceBadgeClasses {
  return INSURANCE_BADGE_COLORS[status] ?? INSURANCE_BADGE_COLORS.unverified;
}

// =============================================================================
// Verification Badge Labels
// =============================================================================

const VERIFICATION_LABELS: Record<string, string> = {
  verified: 'Verified',
  cqc_verified: 'CQC Verified',
  pending: 'Pending Review',
  info_requested: 'Info Requested',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

/**
 * Maps a verification status to a human-readable label.
 *
 * @param status - Verification status string from the database
 * @returns Human-readable label (defaults to 'Unknown' for unrecognised statuses)
 */
export function getVerificationBadgeLabel(status: string): string {
  return VERIFICATION_LABELS[status] ?? 'Unknown';
}

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Formats an ISO date string into a human-readable "Member since" format.
 *
 * @param isoDate - ISO date string (e.g., "2025-06-15T10:00:00Z")
 * @returns Formatted date string (e.g., "June 2025")
 */
export function formatMemberSince(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return 'Unknown';
  }
}
