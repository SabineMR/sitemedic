/**
 * Quote Anonymisation Utility
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Masks contact details (phone, email, address, full medic names) based on
 * event status and deposit payment. Contact details are only revealed when:
 *   1. The event is awarded AND the deposit has been paid, OR
 *   2. The viewer is the quote's own company (always sees own details)
 *
 * Company name is ALWAYS visible (per CONTEXT).
 *
 * Usage:
 *   import { anonymiseQuoteForDisplay, canViewContactDetails, maskName }
 *     from '@/lib/anonymization/quote-anonymizer';
 */

import type { EventStatus } from '@/lib/marketplace/event-types';

// =============================================================================
// Types
// =============================================================================

/** The shape of a quote that can be anonymised */
export interface AnonymisableQuote {
  company_name: string;
  company_phone?: string | null;
  company_email?: string | null;
  company_address?: string | null;
  /** Medic names from staffing plan (named_medics mode) */
  medic_names?: string[];
  [key: string]: unknown;
}

/** A quote after anonymisation has been applied */
export type AnonymisedQuote<T extends AnonymisableQuote> = T & {
  company_phone: string | undefined;
  company_email: string | undefined;
  company_address: string | undefined;
  medic_names: string[];
};

// =============================================================================
// Name Masking
// =============================================================================

/**
 * Mask a full name to "FirstName L." format.
 *
 * Examples:
 *   "James Smith"       -> "James S."
 *   "Anna Maria Garcia" -> "Anna G."
 *   "Beyonce"           -> "Beyonce" (single name unchanged)
 *   ""                  -> ""
 *
 * @param fullName  The full name to mask
 * @returns Masked name string
 */
export function maskName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed === '') return '';

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];

  const lastName = parts[parts.length - 1];
  return `${parts[0]} ${lastName.charAt(0).toUpperCase()}.`;
}

// =============================================================================
// Contact Detail Visibility Check
// =============================================================================

/**
 * Determine whether contact details should be visible to the current user.
 *
 * Rules:
 *   - Company always sees their own quote's contact details
 *   - Event poster sees contact details only when event is awarded AND deposit paid
 *   - Everyone else: no contact details visible
 *
 * @param eventStatus        Current status of the event
 * @param isDepositPaid      Whether the deposit has been paid for this award
 * @param currentUserId      The authenticated user's ID
 * @param eventPosterId      The user who posted the event
 * @param quoteCompanyAdminId  The admin_user_id of the company that submitted the quote
 * @returns true if contact details should be shown
 */
export function canViewContactDetails(
  eventStatus: EventStatus,
  isDepositPaid: boolean,
  currentUserId: string,
  eventPosterId: string,
  quoteCompanyAdminId: string
): boolean {
  // Company always sees their own details
  if (currentUserId === quoteCompanyAdminId) {
    return true;
  }

  // Event poster can see details only after award AND deposit
  if (
    eventStatus === 'awarded' &&
    isDepositPaid &&
    currentUserId === eventPosterId
  ) {
    return true;
  }

  return false;
}

// =============================================================================
// Quote Anonymisation
// =============================================================================

/**
 * Anonymise a quote for display, masking contact details when conditions
 * are not met for revealing them.
 *
 * What stays visible always:
 *   - company_name (per CONTEXT: "Company name is visible before award")
 *   - All pricing, staffing plan structure, cover letter, ratings, etc.
 *
 * What gets masked:
 *   - company_phone -> undefined
 *   - company_email -> undefined
 *   - company_address -> undefined
 *   - medic full names -> "FirstName L." format
 *
 * @param quote         The quote object to anonymise
 * @param eventStatus   Current event status
 * @param isDepositPaid Whether the deposit has been paid
 * @param isAuthor      Whether the current user is the quote's company admin
 * @returns Anonymised copy of the quote
 */
export function anonymiseQuoteForDisplay<T extends AnonymisableQuote>(
  quote: T,
  eventStatus: EventStatus,
  isDepositPaid: boolean,
  isAuthor: boolean
): AnonymisedQuote<T> {
  // Authors always see their own full details
  if (isAuthor) {
    return {
      ...quote,
      medic_names: quote.medic_names ?? [],
    } as AnonymisedQuote<T>;
  }

  // Contact details revealed only after award + deposit
  if (eventStatus === 'awarded' && isDepositPaid) {
    return {
      ...quote,
      medic_names: quote.medic_names ?? [],
    } as AnonymisedQuote<T>;
  }

  // Mask contact details
  return {
    ...quote,
    // company_name stays visible (per CONTEXT)
    company_phone: undefined,
    company_email: undefined,
    company_address: undefined,
    // Medic names masked to "FirstName L." format
    medic_names: (quote.medic_names ?? []).map((name) => maskName(name)),
  } as AnonymisedQuote<T>;
}
