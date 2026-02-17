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

  // Special requirements
  confinedSpaceRequired: boolean;
  traumaSpecialistRequired: boolean;
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
