/**
 * Payout Calculator
 * Phase 06.5-02: Calculate medic payouts and platform fees
 *
 * Platform fee split: Medic gets 60%, platform keeps 40%
 * Example: Client pays £42/hr for 8 hours = £336 total
 *   - Medic receives: £201.60 (60%)
 *   - Platform keeps: £134.40 (40%)
 */

export interface PayoutCalculation {
  medicPayout: number;
  platformFee: number;
  grossRevenue: number;
  medicPercentage: number; // Should be 60%
  platformPercentage: number; // Should be 40%
}

/**
 * Calculate payout split: medic gets 60%, platform keeps 40%
 *
 * @param bookingTotal - Total booking revenue in GBP
 * @returns PayoutCalculation with medic payout and platform fee
 */
export function calculatePayout(bookingTotal: number): PayoutCalculation {
  const medicPercentage = 60;
  const platformPercentage = 40;

  const medicPayout = (bookingTotal * medicPercentage) / 100;
  const platformFee = (bookingTotal * platformPercentage) / 100;

  return {
    medicPayout: Number(medicPayout.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    grossRevenue: bookingTotal,
    medicPercentage,
    platformPercentage,
  };
}

/**
 * Calculate platform fee from booking
 *
 * @param bookingTotal - Total booking revenue in GBP
 * @returns Platform fee (40% of total)
 */
export function calculatePlatformFee(bookingTotal: number): number {
  return Number(((bookingTotal * 40) / 100).toFixed(2));
}

/**
 * Validate payout matches expected calculation
 *
 * @param timesheet - Timesheet with payout_amount
 * @param booking - Booking with total revenue
 * @returns true if payout matches expected 60% (within 1 penny tolerance)
 */
export function validatePayout(timesheet: any, booking: any): boolean {
  const expected = calculatePayout(booking.total);
  const actual = timesheet.payout_amount;

  // Allow 1 penny tolerance for rounding
  return Math.abs(expected.medicPayout - actual) <= 0.01;
}
