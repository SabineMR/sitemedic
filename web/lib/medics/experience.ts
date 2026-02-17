/**
 * Experience Tier System
 *
 * Medics are assigned one of three tiers based on their experience level.
 * Each tier maps to a fixed payout percentage of the booking revenue.
 *
 * Tiers:
 *   Junior  → 35% of booking total  (platform keeps 65%)
 *   Senior  → 42% of booking total  (platform keeps 58%)
 *   Lead    → 50% of booking total  (platform keeps 50%)
 *
 * The payout % is stored on medics.medic_payout_percent and is auto-synced
 * from medics.experience_level via DB trigger (migration 116).
 *
 * Mileage reimbursement is separate — added on top of the % payout.
 */

export type ExperienceLevel = 'junior' | 'senior' | 'lead';

export interface ExperienceTier {
  level: ExperienceLevel;
  label: string;
  description: string;
  medicPayoutPercent: number;  // % of booking total paid to medic
  platformFeePercent: number;  // % of booking total kept by SiteMedic
}

/** HMRC approved mileage reimbursement rate (pence per mile) */
export const HMRC_MILEAGE_RATE_PENCE = 45;

/** HMRC approved mileage rate as a £ amount */
export const HMRC_MILEAGE_RATE_GBP = HMRC_MILEAGE_RATE_PENCE / 100; // 0.45

export const EXPERIENCE_TIERS: Record<ExperienceLevel, ExperienceTier> = {
  junior: {
    level: 'junior',
    label: 'Junior',
    description: 'Entry-level medic, building experience on site',
    medicPayoutPercent: 35,
    platformFeePercent: 65,
  },
  senior: {
    level: 'senior',
    label: 'Senior',
    description: 'Experienced medic with a strong track record',
    medicPayoutPercent: 42,
    platformFeePercent: 58,
  },
  lead: {
    level: 'lead',
    label: 'Lead / Specialist',
    description: 'Specialist or lead medic with advanced certifications',
    medicPayoutPercent: 50,
    platformFeePercent: 50,
  },
};

/** All tiers in ascending order (Junior → Senior → Lead) */
export const EXPERIENCE_TIER_LIST: ExperienceTier[] = [
  EXPERIENCE_TIERS.junior,
  EXPERIENCE_TIERS.senior,
  EXPERIENCE_TIERS.lead,
];

/** Get the ExperienceTier config for a given level */
export function getExperienceTier(level: ExperienceLevel): ExperienceTier {
  return EXPERIENCE_TIERS[level];
}

/**
 * Calculate mileage reimbursement for a given distance
 * @param miles - Distance driven in miles
 * @param ratePence - Pence per mile (default: HMRC 45p)
 * @returns Reimbursement amount in GBP
 */
export function calculateMileageReimbursement(
  miles: number,
  ratePence: number = HMRC_MILEAGE_RATE_PENCE
): number {
  if (!miles || miles <= 0) return 0;
  return parseFloat(((miles * ratePence) / 100).toFixed(2));
}

/**
 * Calculate total medic payout: shift % payout + mileage reimbursement
 * @param bookingTotal - Total booking revenue in GBP (inc. VAT)
 * @param medicPayoutPercent - Medic's payout % (35 | 42 | 50)
 * @param mileageMiles - Distance driven to the job site (null = no mileage)
 * @param mileageRatePence - Pence per mile (default: HMRC 45p)
 */
export function calculateTotalMedicPayout(params: {
  bookingTotal: number;
  medicPayoutPercent: number;
  mileageMiles?: number | null;
  mileageRatePence?: number;
}): {
  shiftPayout: number;       // % of booking total
  mileageReimbursement: number; // Distance reimbursement
  totalPayout: number;       // shiftPayout + mileageReimbursement
} {
  const {
    bookingTotal,
    medicPayoutPercent,
    mileageMiles,
    mileageRatePence = HMRC_MILEAGE_RATE_PENCE,
  } = params;

  const shiftPayout = parseFloat(((bookingTotal * medicPayoutPercent) / 100).toFixed(2));
  const mileageReimbursement = calculateMileageReimbursement(mileageMiles ?? 0, mileageRatePence);
  const totalPayout = parseFloat((shiftPayout + mileageReimbursement).toFixed(2));

  return { shiftPayout, mileageReimbursement, totalPayout };
}
