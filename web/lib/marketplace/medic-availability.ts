/**
 * Medic Availability Utilities
 * Phase 37: Company Accounts — Plan 01
 *
 * Functions for checking medic availability based on roster unavailable windows.
 * Used when assigning medics to events and displaying availability in roster views.
 */

import { isWithinInterval, parseISO } from 'date-fns';
import type { CompanyRosterMedicWithDetails } from './roster-types';

// =============================================================================
// Check Single Medic Availability
// =============================================================================

/**
 * Check if a medic is available on a specific date based on their
 * unavailable_from / unavailable_until window.
 *
 * @param unavailableFrom - Start of unavailable window (ISO date string or null)
 * @param unavailableUntil - End of unavailable window (ISO date string or null)
 * @param targetDate - The date to check (ISO date string)
 * @returns true if the medic is available on the target date
 *
 * Logic:
 * - If both unavailableFrom and unavailableUntil are null → available
 * - If only unavailableFrom is set → unavailable from that date onward
 * - If only unavailableUntil is set → unavailable until that date
 * - If both set → unavailable within the interval (inclusive)
 */
export function isMedicAvailableOnDate(
  unavailableFrom: string | null,
  unavailableUntil: string | null,
  targetDate: string
): boolean {
  // No unavailable window set — medic is available
  if (!unavailableFrom && !unavailableUntil) {
    return true;
  }

  const target = parseISO(targetDate);

  // Only start date — unavailable from that date onward (indefinite)
  if (unavailableFrom && !unavailableUntil) {
    const from = parseISO(unavailableFrom);
    return target < from;
  }

  // Only end date — unavailable until that date
  if (!unavailableFrom && unavailableUntil) {
    const until = parseISO(unavailableUntil);
    return target > until;
  }

  // Both dates — check if target falls within the interval (inclusive)
  const from = parseISO(unavailableFrom!);
  const until = parseISO(unavailableUntil!);

  return !isWithinInterval(target, { start: from, end: until });
}

// =============================================================================
// Filter Available Roster Medics for Event Dates
// =============================================================================

/**
 * Filter a roster to only medics available across ALL specified event dates.
 * A medic must be:
 *   1. Marked as available (available === true)
 *   2. Not within their unavailable date window for ANY event date
 *
 * @param rosterMedics - Full roster with details
 * @param eventDates - Array of ISO date strings for the event
 * @returns Filtered array of available medics
 */
export function getAvailableRosterMedics(
  rosterMedics: CompanyRosterMedicWithDetails[],
  eventDates: string[]
): CompanyRosterMedicWithDetails[] {
  return rosterMedics.filter((medic) => {
    // Must be marked as available
    if (!medic.available) {
      return false;
    }

    // Must be available on ALL event dates
    return eventDates.every((date) =>
      isMedicAvailableOnDate(
        medic.unavailable_from,
        medic.unavailable_until,
        date
      )
    );
  });
}
