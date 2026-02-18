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
 * Miles are calculated per-leg by the daily mileage router
 * (web/lib/payouts/mileage-router.ts), which handles:
 *   - Single site:  home → site → home (full round trip)
 *   - Multi-site:   home → site1 → site2 → ... → home (sequential legs)
 * The router stores exact leg miles on timesheets.mileage_miles.
 * No doubling happens here — the router has already accounted for every
 * mile driven, including the return journey home.
 *
 * --- NEW: Hourly Model (migration 129) ---
 * New bookings use pay_model = 'hourly'. Medic pay = hourly_rate × hours worked.
 * The hourly rate is set manually by admin per medic (no auto-calculation).
 * Classification is used for categorisation and reporting only.
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

// ============================================================
// UK Medical Classification System (migration 129)
// Used for categorisation and reporting — hourly rate is set
// manually per medic by admin, not auto-calculated from this.
// ============================================================

export type MedicClassification =
  | 'first_aider'
  | 'eca'
  | 'efr'
  | 'emt'
  | 'aap'
  | 'paramedic'
  | 'specialist_paramedic'
  | 'critical_care_paramedic'
  | 'registered_nurse'
  | 'doctor';

export const CLASSIFICATION_LABELS: Record<MedicClassification, string> = {
  first_aider:             'First Aider (FREC 3 / FPOS)',
  eca:                     'Emergency Care Assistant (FREC 3+)',
  efr:                     'Emergency First Responder (FREC 4)',
  emt:                     'Emergency Medical Technician (FREC 4)',
  aap:                     'Assistant Ambulance Practitioner',
  paramedic:               'Paramedic (HCPC)',
  specialist_paramedic:    'Specialist / Advanced Paramedic',
  critical_care_paramedic: 'Critical Care Paramedic',
  registered_nurse:        'Registered Nurse / ENP',
  doctor:                  'Doctor (GP / A&E / BASICS)',
};

/** Ordered list of classifications from least to most advanced */
export const CLASSIFICATION_LIST: MedicClassification[] = [
  'first_aider',
  'eca',
  'efr',
  'emt',
  'aap',
  'paramedic',
  'specialist_paramedic',
  'critical_care_paramedic',
  'registered_nurse',
  'doctor',
];

/** Get the ExperienceTier config for a given level */
export function getExperienceTier(level: ExperienceLevel): ExperienceTier {
  return EXPERIENCE_TIERS[level];
}

/**
 * Calculate mileage reimbursement for exact miles driven.
 *
 * Pass the exact miles to reimburse — no doubling is done here.
 * For a single-site day the mileage router provides the full round-trip miles.
 * For multi-site days it provides per-leg miles (already including the return
 * home on the last booking of the day).
 *
 * @param miles - Exact miles to reimburse for this booking
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
 * Calculate total medic payout for a booking: shift % payout + mileage reimbursement.
 *
 * @param bookingTotal    Total booking revenue in GBP (inc. VAT)
 * @param medicPayoutPercent  Medic's payout % from medics.medic_payout_percent (35 | 42 | 50)
 * @param legMiles        Exact miles for this booking as calculated by the mileage router.
 *                        For a single-site day this is the full round-trip distance.
 *                        For multi-site days this is the leg miles assigned to this booking.
 *                        Null/0 = no mileage (e.g. router not yet run).
 * @param mileageRatePence  Pence per mile (default: HMRC 45p)
 */
export function calculateTotalMedicPayout(params: {
  bookingTotal: number;
  medicPayoutPercent: number;
  legMiles?: number | null;
  mileageRatePence?: number;
}): {
  shiftPayout: number;          // % of booking total
  mileageReimbursement: number; // Mileage payout for this booking's leg
  legMiles: number;             // Miles being reimbursed
  totalPayout: number;          // shiftPayout + mileageReimbursement
} {
  const {
    bookingTotal,
    medicPayoutPercent,
    legMiles,
    mileageRatePence = HMRC_MILEAGE_RATE_PENCE,
  } = params;

  const exactMiles = legMiles ?? 0;
  const shiftPayout = parseFloat(((bookingTotal * medicPayoutPercent) / 100).toFixed(2));
  const mileageReimbursement = calculateMileageReimbursement(exactMiles, mileageRatePence);
  const totalPayout = parseFloat((shiftPayout + mileageReimbursement).toFixed(2));

  return { shiftPayout, mileageReimbursement, legMiles: exactMiles, totalPayout };
}
