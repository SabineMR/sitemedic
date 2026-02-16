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
  baseRate: number;        // Per hour (GBP)
  shiftHours: number;
  hourlyTotal: number;     // baseRate * shiftHours
  urgencyPremiumPercent: number; // 0, 20, 50, 75
  urgencyAmount: number;
  travelSurcharge: number;
  subtotal: number;        // Before VAT
  vat: number;             // 20%
  total: number;           // Client pays this
  platformFee: number;     // 40%
  medicPayout: number;     // 60%
}

export type UrgencyLevel = 'standard' | 'short_notice' | 'urgent' | 'emergency';
