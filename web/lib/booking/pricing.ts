/**
 * Client-side Booking Pricing Calculator
 * Phase 4.5: Mirrors Edge Function logic from supabase/functions/calculate-pricing/index.ts
 *
 * PURPOSE: This is a PURE function that mirrors the server-side pricing calculation
 * exactly so clients see the same prices the server will calculate. The server-side
 * Edge Function remains the source of truth for actual charges.
 *
 * Pricing Formula (matches Edge Function exactly):
 * 1. hourly_total = base_rate × shift_hours
 * 2. urgency_amount = hourly_total × (urgency_premium_percent / 100)
 * 3. subtotal = hourly_total + urgency_amount + travel_surcharge
 * 4. vat = subtotal × 0.20 (UK 20% VAT)
 * 5. total = subtotal + vat
 * 6. platform_fee = total × 0.40 (40% markup)
 * 7. medic_payout = total - platform_fee (60% to medic)
 */

import { differenceInDays } from 'date-fns';
import { PricingBreakdown, UrgencyLevel } from './types';

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
  baseRate?: number;          // Default GBP 42/hr (GBP 350/8hr day)
  urgencyPremiumPercent?: number;
  travelSurcharge?: number;
}): PricingBreakdown {
  const {
    shiftHours,
    baseRate = 42,  // Default: GBP 42/hr (GBP 350 for 8hr day)
    urgencyPremiumPercent = 0,
    travelSurcharge = 0,
  } = params;

  // Step 1: Calculate hourly total
  const hourlyTotal = baseRate * shiftHours;

  // Step 2: Calculate urgency premium
  const urgencyAmount = hourlyTotal * (urgencyPremiumPercent / 100);

  // Step 3: Calculate subtotal (before VAT)
  const subtotal = hourlyTotal + urgencyAmount + travelSurcharge;

  // Step 4: Calculate VAT (20% UK standard rate)
  const vat = subtotal * 0.20;

  // Step 5: Calculate total (client pays this)
  const total = subtotal + vat;

  // Step 6: Calculate platform fee (40% markup)
  const platformFee = total * 0.40;

  // Step 7: Calculate medic payout (60% of total)
  const medicPayout = total - platformFee;

  // Round all values to 2 decimal places (GBP standard)
  return {
    baseRate: parseFloat(baseRate.toFixed(2)),
    shiftHours,
    hourlyTotal: parseFloat(hourlyTotal.toFixed(2)),
    urgencyPremiumPercent,
    urgencyAmount: parseFloat(urgencyAmount.toFixed(2)),
    travelSurcharge: parseFloat(travelSurcharge.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    platformFee: parseFloat(platformFee.toFixed(2)),
    medicPayout: parseFloat(medicPayout.toFixed(2)),
  };
}
