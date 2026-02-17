/**
 * Payout Calculator
 *
 * Calculates medic payouts using:
 *   1. Experience-based % split (Junior 35% | Senior 42% | Lead 50%)
 *   2. HMRC mileage reimbursement (45p/mile) added on top — not deducted from platform
 *
 * Note: Legacy hardcoded 71.4% split has been replaced by per-medic
 * medic_payout_percent stored on the medics table (migration 116).
 * The experience tier trigger (trg_payout_from_experience_level) keeps
 * medic_payout_percent in sync when experience_level changes.
 */

import { calculateTotalMedicPayout, HMRC_MILEAGE_RATE_PENCE } from '@/lib/medics/experience';

export interface PayoutCalculation {
  shiftPayout: number;          // Booking total × medic_payout_percent
  mileageReimbursement: number; // mileage_miles × £0.45/mile
  totalPayout: number;          // shiftPayout + mileageReimbursement
  platformFee: number;          // Booking total × platform_fee_percent
  grossRevenue: number;         // Booking total (what client paid)
  medicPayoutPercent: number;   // Snapshot of the % used
  platformFeePercent: number;   // Snapshot of the platform %
  mileageMiles: number | null;  // Distance driven (null = not tracked)
  mileageRatePence: number;     // HMRC rate used (snapshot)
}

/**
 * Calculate full medic payout for a completed shift
 *
 * @param bookingTotal - Total the client paid (inc. VAT), in GBP
 * @param medicPayoutPercent - Medic's share % from medics.medic_payout_percent
 * @param mileageMiles - Distance from home to site in miles (from travel_time_cache)
 * @param mileageRatePence - Pence per mile (default: HMRC 45p)
 */
export function calculatePayout(
  bookingTotal: number,
  medicPayoutPercent: number = 40,
  mileageMiles?: number | null,
  mileageRatePence: number = HMRC_MILEAGE_RATE_PENCE
): PayoutCalculation {
  const platformFeePercent = parseFloat((100 - medicPayoutPercent).toFixed(2));

  const { shiftPayout, mileageReimbursement, totalPayout } = calculateTotalMedicPayout({
    bookingTotal,
    medicPayoutPercent,
    mileageMiles,
    mileageRatePence,
  });

  const platformFee = parseFloat(((bookingTotal * platformFeePercent) / 100).toFixed(2));

  return {
    shiftPayout,
    mileageReimbursement,
    totalPayout,
    platformFee,
    grossRevenue: bookingTotal,
    medicPayoutPercent,
    platformFeePercent,
    mileageMiles: mileageMiles ?? null,
    mileageRatePence,
  };
}

/**
 * Calculate platform fee only (for invoicing / reporting)
 *
 * @param bookingTotal - Total the client paid, in GBP
 * @param platformFeePercent - Platform's share % (default 60)
 */
export function calculatePlatformFee(
  bookingTotal: number,
  platformFeePercent: number = 60
): number {
  return parseFloat(((bookingTotal * platformFeePercent) / 100).toFixed(2));
}

/**
 * Validate payout amount matches expected calculation (within £0.01 tolerance)
 *
 * @param timesheetPayoutAmount - Stored payout_amount on the timesheet
 * @param bookingTotal - Booking total in GBP
 * @param medicPayoutPercent - Medic's payout % (from medics table)
 * @param mileageMiles - Miles driven (from timesheets.mileage_miles)
 */
export function validatePayout(
  timesheetPayoutAmount: number,
  bookingTotal: number,
  medicPayoutPercent: number,
  mileageMiles?: number | null
): boolean {
  const expected = calculatePayout(bookingTotal, medicPayoutPercent, mileageMiles);
  return Math.abs(expected.totalPayout - timesheetPayoutAmount) <= 0.01;
}
