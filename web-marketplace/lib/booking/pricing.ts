/**
 * Client-side Booking Pricing Calculator
 * Phase 4.5: Mirrors Edge Function logic from supabase/functions/calculate-pricing/index.ts
 *
 * PURPOSE: Pure function that mirrors the server-side pricing calculation
 * exactly so clients see the same prices the server will calculate. The server-side
 * Edge Function remains the source of truth for actual charges.
 *
 * Pricing Formula:
 * 1. hourly_total = base_rate × shift_hours
 * 2. urgency_amount = hourly_total × (urgency_premium_percent / 100)
 * 3. subtotal = hourly_total + urgency_amount + travel_surcharge
 * 4. vat = subtotal × 0.20 (UK 20% VAT)
 * 5. total = subtotal + vat  (client pays this)
 * 6. platform_fee = total × (platform_fee_percent / 100)
 * 7. medic_payout = total × (medic_payout_percent / 100)
 * 8. [referral only] referral_payout_amount = subtotal × (referral_payout_percent / 100)
 *    NOTE: calculated on pre-VAT subtotal — referrer is paid net of VAT
 * 9. platform_net = platform_fee − referral_payout_amount
 */

import { differenceInDays } from 'date-fns';
import { PricingBreakdown, UrgencyLevel } from './types';

// Env defaults — can be overridden per-medic when calling calculateBookingPrice
const DEFAULT_PLATFORM_FEE_PERCENT =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_FEE_PERCENT ?? '60');
const DEFAULT_MEDIC_PAYOUT_PERCENT =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MEDIC_PAYOUT_PERCENT ?? '40');
const DEFAULT_REFERRAL_PAYOUT_PERCENT =
  parseFloat(process.env.NEXT_PUBLIC_REFERRAL_PAYOUT_PERCENT ?? '10');

/**
 * Calculate urgency premium based on how far in advance booking is made
 * Matches Edge Function urgency rules
 */
export function getUrgencyPremium(shiftDate: Date): {
  percent: number;
  level: UrgencyLevel;
  label: string;
} {
  const daysUntilShift = differenceInDays(shiftDate, new Date());

  if (daysUntilShift >= 7) {
    return { percent: 0, level: 'standard', label: 'Standard' };
  } else if (daysUntilShift >= 4) {
    return { percent: 20, level: 'short_notice', label: 'Short Notice +20%' };
  } else if (daysUntilShift >= 1) {
    return { percent: 50, level: 'urgent', label: 'Urgent +50%' };
  } else {
    return { percent: 75, level: 'emergency', label: 'Emergency +75%' };
  }
}

/**
 * Calculate booking price breakdown
 * Mirrors supabase/functions/calculate-pricing/index.ts exactly
 */
export function calculateBookingPrice(params: {
  shiftHours: number;
  baseRate?: number;                  // Fallback default; callers should pass org_settings.base_rate
  urgencyPremiumPercent?: number;
  travelSurcharge?: number;
  // Per-medic split overrides (falls back to env defaults)
  platformFeePercent?: number;
  medicPayoutPercent?: number;
  // Referral
  isReferral?: boolean;
  referralPayoutPercent?: number;     // Defaults to NEXT_PUBLIC_REFERRAL_PAYOUT_PERCENT
}): PricingBreakdown {
  const {
    shiftHours,
    baseRate = 42,
    urgencyPremiumPercent = 0,
    travelSurcharge = 0,
    platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
    medicPayoutPercent  = DEFAULT_MEDIC_PAYOUT_PERCENT,
    isReferral = false,
    referralPayoutPercent = DEFAULT_REFERRAL_PAYOUT_PERCENT,
  } = params;

  // Step 1: Hourly total
  const hourlyTotal = baseRate * shiftHours;

  // Step 2: Urgency premium
  const urgencyAmount = hourlyTotal * (urgencyPremiumPercent / 100);

  // Step 3: Subtotal (before VAT)
  const subtotal = hourlyTotal + urgencyAmount + travelSurcharge;

  // Step 4: VAT (20% UK standard rate)
  const vat = subtotal * 0.20;

  // Step 5: Total (client pays this)
  const total = subtotal + vat;

  // Step 6: Platform fee and medic payout (variable per-medic)
  const platformFee = total * (platformFeePercent / 100);
  const medicPayout  = total * (medicPayoutPercent  / 100);

  // Step 7: Referral payout (on pre-VAT subtotal — referrer paid net of VAT)
  const effectiveReferralPercent = isReferral ? referralPayoutPercent : 0;
  const referralPayoutAmount = subtotal * (effectiveReferralPercent / 100);

  // Step 8: Platform net (what SiteMedic actually keeps)
  const platformNet = platformFee - referralPayoutAmount;

  return {
    baseRate:               parseFloat(baseRate.toFixed(2)),
    shiftHours,
    hourlyTotal:            parseFloat(hourlyTotal.toFixed(2)),
    urgencyPremiumPercent,
    urgencyAmount:          parseFloat(urgencyAmount.toFixed(2)),
    travelSurcharge:        parseFloat(travelSurcharge.toFixed(2)),
    subtotal:               parseFloat(subtotal.toFixed(2)),
    vat:                    parseFloat(vat.toFixed(2)),
    total:                  parseFloat(total.toFixed(2)),
    platformFeePercent,
    medicPayoutPercent,
    platformFee:            parseFloat(platformFee.toFixed(2)),
    medicPayout:            parseFloat(medicPayout.toFixed(2)),
    isReferral,
    referralPayoutPercent:  effectiveReferralPercent,
    referralPayoutAmount:   parseFloat(referralPayoutAmount.toFixed(2)),
    platformNet:            parseFloat(platformNet.toFixed(2)),
  };
}
