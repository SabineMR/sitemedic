/**
 * Payout Calculator
 * Phase 06.5-02: Calculate medic payouts and platform fees
 *
 * Platform fee split: Medic gets 71.4%, platform keeps 28.6%
 * Arithmetic: Medic rate £30/hr, Client rate £42/hr
 *   - Platform fee: £12/hr (£42 - £30 = £12)
 *   - Medic percentage: 30/42 = 71.43% (71.4%)
 *   - Platform percentage: 12/42 = 28.57% (28.6%)
 *
 * Example: Client pays £42/hr for 8 hours = £336 total
 *   - Medic receives: £239.90 (71.4%)
 *   - Platform keeps: £96.10 (28.6%)
 */

export interface PayoutCalculation {
  medicPayout: number;
  platformFee: number;
  grossRevenue: number;
  medicPercentage: number; // Should be 71.4%
  platformPercentage: number; // Should be 28.6%
}

/**
 * Calculate payout split: medic gets 71.4%, platform keeps 28.6%
 *
 * @param bookingTotal - Total booking revenue in GBP
 * @returns PayoutCalculation with medic payout and platform fee
 */
export function calculatePayout(bookingTotal: number): PayoutCalculation {
  const medicPercentage = 71.4;
  const platformPercentage = 28.6;

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
 * @returns Platform fee (28.6% of total)
 */
export function calculatePlatformFee(bookingTotal: number): number {
  return Number(((bookingTotal * 28.6) / 100).toFixed(2));
}

/**
 * Validate payout matches expected calculation
 *
 * @param timesheet - Timesheet with payout_amount
 * @param booking - Booking with total revenue
 * @returns true if payout matches expected 71.4% (within 1 penny tolerance)
 */
export function validatePayout(timesheet: any, booking: any): boolean {
  const expected = calculatePayout(booking.total);
  const actual = timesheet.payout_amount;

  // Allow 1 penny tolerance for rounding
  return Math.abs(expected.medicPayout - actual) <= 0.01;
}
