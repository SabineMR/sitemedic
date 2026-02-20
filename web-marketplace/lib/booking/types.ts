/**
 * Booking Flow Types
 * Phase 4.5: Client-facing booking form types
 */

export interface BookingFormData {
  // Date selection
  shiftDate: Date | undefined;
  shiftStartTime: string; // "07:00", "08:00", etc.
  shiftEndTime: string;   // "15:00", "16:00", etc.
  shiftHours: number;     // Calculated from start/end times

  // Site location
  siteName: string;
  siteAddress: string;
  sitePostcode: string;
  what3wordsAddress?: string; // Optional: ///word.word.word format
  siteContactName: string;
  siteContactPhone: string;

  // Event vertical — drives dynamic requirements list on booking form
  // Maps to BookingVerticalId from vertical-requirements.ts
  eventVertical: string;

  // Special requirements
  confinedSpaceRequired: boolean;   // DB boolean — set automatically from selectedRequirements
  traumaSpecialistRequired: boolean; // DB boolean — set automatically from selectedRequirements
  selectedRequirements: string[];    // Requirement IDs from VERTICAL_REQUIREMENTS (non-boolean ones serialise to specialNotes on submit)
  specialNotes: string;

  // Recurring
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'biweekly' | null;
  recurringWeeks: number; // How many weeks to repeat

  // Client (set after auth/registration)
  clientId: string | null;
}

export interface PricingBreakdown {
  baseRate: number;               // Per hour (GBP)
  shiftHours: number;
  hourlyTotal: number;            // baseRate * shiftHours
  urgencyPremiumPercent: number;  // 0, 20, 50, 75
  urgencyAmount: number;
  travelSurcharge: number;
  subtotal: number;               // Before VAT
  vat: number;                    // 20%
  total: number;                  // Client pays this

  // Revenue split (variable per-medic)
  platformFeePercent: number;     // e.g. 60
  medicPayoutPercent: number;     // e.g. 40
  platformFee: number;            // total × platformFeePercent / 100
  medicPayout: number;            // total × medicPayoutPercent / 100

  // Referral
  isReferral: boolean;
  referralPayoutPercent: number;  // 0 when not a referral
  referralPayoutAmount: number;   // subtotal × referralPayoutPercent / 100
  platformNet: number;            // platformFee − referralPayoutAmount
}

export type UrgencyLevel = 'standard' | 'short_notice' | 'urgent' | 'emergency';

/** Medic experience tier — determines payout percentage (legacy percentage model) */
export type ExperienceLevel = 'junior' | 'senior' | 'lead';

// ============================================================
// Hourly Pay Model + 4-Way Split types (migration 129)
// ============================================================

/** UK medical classification — used for categorisation and reporting */
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

/** Pay model for a booking — 'percentage' = legacy, 'hourly' = new model */
export type PayModel = 'percentage' | 'hourly';

/** Result of the 4-way profit split calculation (hourly model only) */
export interface FourWaySplit {
  grossRevenue: number;
  medicPay: number;           // medicHourlyRate × hoursWorked
  mileageReimbursement: number;
  referralCommission: number;
  net: number;                // gross - medicPay - mileage - referral
  sabineShare: number;        // net / 4
  kaiShare: number;           // net / 4
  operationalAmount: number;  // net / 4
  reserveAmount: number;      // net / 4
}
