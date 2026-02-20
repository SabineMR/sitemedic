/**
 * Minimum Rate Enforcement for Marketplace Quotes
 * Phase 34: Quote Submission & Comparison
 *
 * Defines guideline hourly rates per UK medical qualification level.
 * Provides validation function to check if a quote falls below minimum rates.
 *
 * IMPORTANT: This is HARD enforcement per CONTEXT — quotes below minimum are BLOCKED.
 * The form displays warnings and the API rejects submission if violations exist.
 *
 * Rates based on NHS pay bands and medical marketplace research (UK 2026).
 */

import type { StaffingRole } from './event-types';

// =============================================================================
// MINIMUM HOURLY RATES (GBP)
// =============================================================================

/**
 * Guideline hourly rates per UK medical qualification level
 * Used to prevent race-to-the-bottom pricing on the marketplace
 *
 * These are MINIMUM rates — companies can quote higher, but not lower
 * Derived from NHS Band structures and market research
 */
export const MINIMUM_RATES_PER_HOUR: Record<StaffingRole, number> = {
  paramedic: 45,      // Equivalent to NHS Band 5-6 (experienced medic)
  emt: 28,           // Emergency Medical Technician — lower training
  first_aider: 18,   // First Aid at Work — entry level
  nurse: 40,         // Registered nurse — Band 4-5 equivalent
  doctor: 75,        // Registered doctor — consultancy rate
  other: 15,         // Unspecified / fallback rate
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the minimum hourly rate for a specific staffing role
 * Falls back to 'other' (£15/hour) if role is unknown
 *
 * @param role - Staffing role (paramedic, emt, first_aider, doctor, nurse, other)
 * @returns Minimum hourly rate in GBP
 */
export function getMinimumRateForRole(role: string): number {
  return MINIMUM_RATES_PER_HOUR[role as StaffingRole] ?? MINIMUM_RATES_PER_HOUR.other;
}

// =============================================================================
// Violation Types
// =============================================================================

/**
 * Represents a single rate violation
 * Returned when a quoted price falls below guideline minimum for a role
 */
export interface RateViolation {
  role: StaffingRole;
  minimumRate: number; // Minimum hourly rate for this role
  quotedRate: number;  // Actual hourly rate in the quote (total_price / quantity / duration)
  quantity: number;    // Number of staff at this qualification
  duration: number;    // Event duration in hours
}

// =============================================================================
// Validation Function
// =============================================================================

/**
 * Validates a quote against minimum hourly rates
 *
 * Algorithm:
 * 1. For each staffing role in the plan (paramedic: 2, emt: 1, etc.)
 * 2. Calculate minimum total cost: rate × quantity × duration
 * 3. Compare actual quote total to minimum total
 * 4. If actual < minimum, record as violation
 *
 * This is HARD enforcement — violations block submission.
 *
 * @param totalPrice - Total quoted price in GBP
 * @param staffingPlan - Array of { role, quantity } entries
 * @param eventDurationHours - Duration of the event in hours
 * @returns { isValid: boolean, violations: RateViolation[] }
 */
export function validateAgainstMinimumRates(
  totalPrice: number,
  staffingPlan: Array<{ role: StaffingRole | string; quantity: number }>,
  eventDurationHours: number
): { isValid: boolean; violations: RateViolation[] } {
  const violations: RateViolation[] = [];

  // Each role in the staffing plan must meet its minimum rate
  for (const plan of staffingPlan) {
    const role = plan.role as StaffingRole;
    const minimumRate = getMinimumRateForRole(role);

    // Calculate the minimum cost for this specific role
    // minimumCost = rate × quantity × duration
    const minimumCostForRole = minimumRate * plan.quantity * eventDurationHours;

    // Calculate the hourly rate the company is quoting for this role
    // quotedRate = total_price / quantity / duration
    const quotedRate = totalPrice / (plan.quantity * eventDurationHours);

    // If quoted rate is below minimum rate, record violation
    if (quotedRate < minimumRate) {
      violations.push({
        role,
        minimumRate,
        quotedRate: Math.round(quotedRate * 100) / 100, // Round to 2 decimals
        quantity: plan.quantity,
        duration: eventDurationHours,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Format a violation for display to the user
 * Example: "Paramedic quoted at £32/hr, minimum is £45/hr"
 *
 * @param violation - RateViolation object
 * @returns Human-readable violation message
 */
export function formatViolation(violation: RateViolation): string {
  return `${violation.role.charAt(0).toUpperCase()}${violation.role.slice(1)} quoted at £${violation.quotedRate.toFixed(2)}/hr, minimum is £${violation.minimumRate}/hr`;
}

/**
 * Check if a specific role would violate minimum rates at a given quote total
 * Useful for real-time form validation as user types price
 *
 * @param role - Staffing role
 * @param quantity - Number of this role
 * @param totalPrice - Total quote price
 * @param eventDurationHours - Event duration
 * @returns true if this role violates minimum rates
 */
export function doesRoleViolateMinimumRate(
  role: StaffingRole,
  quantity: number,
  totalPrice: number,
  eventDurationHours: number
): boolean {
  const minimumRate = getMinimumRateForRole(role);
  const quotedRate = totalPrice / (quantity * eventDurationHours);
  return quotedRate < minimumRate;
}
