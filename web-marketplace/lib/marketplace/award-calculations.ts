/**
 * Marketplace Award Calculation Functions
 * Phase 35: Award Flow & Payment
 *
 * Functions for:
 *   - calculateAwardAmounts: Deposit/remainder/VAT split from total price
 *   - calculateMarketplaceCommission: Platform fee and medic payout
 *   - getDepositPercentForEventType: Industry-specific deposit percentages
 *   - calculateRemainderDueDate: Event end + 14 days
 */

import type { PaymentBreakdown, MarketplaceCommission } from './award-types';
import { MARKETPLACE_DEFAULTS } from './admin-settings-defaults';

// =============================================================================
// Deposit Percentage by Event Type
// =============================================================================

/** Industry-specific deposit percentages (default 25%) */
const DEPOSIT_PERCENT_BY_EVENT_TYPE: Record<string, number> = {
  construction: 50,
  motorsport: 50,
  // All other event types default to 25%
};

/**
 * Returns the deposit percentage for a given event type.
 * Construction and motorsport require 50% deposit; all others default to 25%.
 * Admin UI for configuring this will be added in Phase 39.
 */
export function getDepositPercentForEventType(
  eventType: string,
  defaultDepositPercent: number = MARKETPLACE_DEFAULTS.defaultDepositPercent
): number {
  return DEPOSIT_PERCENT_BY_EVENT_TYPE[eventType] ?? defaultDepositPercent;
}

export async function getConfiguredCommissionSplit(): Promise<{
  platformFeePercent: number;
  medicPayoutPercent: number;
}> {
  if (typeof window !== 'undefined') {
    return {
      platformFeePercent: MARKETPLACE_DEFAULTS.defaultCommissionPercent,
      medicPayoutPercent: 100 - MARKETPLACE_DEFAULTS.defaultCommissionPercent,
    };
  }

  const { getMarketplaceAdminSettings, getCommissionSplitFromSettings } = await import('./admin-settings');
  const settings = await getMarketplaceAdminSettings();
  return getCommissionSplitFromSettings(settings.defaultCommissionPercent);
}

// =============================================================================
// Award Amount Calculations
// =============================================================================

/**
 * Calculates deposit, remainder, and VAT split from total price.
 *
 * totalPrice is inclusive of 20% VAT (UK standard rate).
 * subtotal = totalPrice / 1.20
 * vatAmount = totalPrice - subtotal
 *
 * @param totalPrice - Quote total price including VAT (GBP)
 * @param depositPercent - Percentage of total to charge as deposit (1-100)
 * @returns Full payment breakdown
 */
export function calculateAwardAmounts(
  totalPrice: number,
  depositPercent: number
): PaymentBreakdown {
  const subtotal = parseFloat((totalPrice / 1.20).toFixed(2));
  const vatAmount = parseFloat((totalPrice - subtotal).toFixed(2));
  const depositAmount = parseFloat((totalPrice * (depositPercent / 100)).toFixed(2));
  const remainderAmount = parseFloat((totalPrice - depositAmount).toFixed(2));

  return {
    totalPrice,
    depositPercent,
    depositAmount,
    remainderAmount,
    vatAmount,
    subtotal,
  };
}

// =============================================================================
// Commission Calculations
// =============================================================================

/**
 * Calculates marketplace commission split between platform and company.
 *
 * Commission is deducted from the company's side (not client side).
 * Uses the existing platform_fee_percent/medic_payout_percent pattern.
 *
 * @param totalPrice - Quote total price including VAT (GBP)
 * @param platformFeePercent - Platform's percentage (e.g., 60 for 60%)
 * @param medicPayoutPercent - Company's percentage (e.g., 40 for 40%)
 * @returns Commission breakdown
 */
export function calculateMarketplaceCommission(
  totalPrice: number,
  platformFeePercent: number,
  medicPayoutPercent: number
): MarketplaceCommission {
  const subtotal = parseFloat((totalPrice / 1.20).toFixed(2));
  const platformFee = parseFloat((subtotal * (platformFeePercent / 100)).toFixed(2));
  const medicPayout = parseFloat((subtotal * (medicPayoutPercent / 100)).toFixed(2));
  const platformNet = platformFee;

  return {
    platformFee,
    medicPayout,
    platformNet,
  };
}

// =============================================================================
// Remainder Scheduling
// =============================================================================

/**
 * Calculates when the remainder charge becomes due.
 * Net 14 day payment term: remainder charged 14 days after event end date.
 *
 * @param eventEndDate - The date the event ends
 * @returns Date when remainder should be charged
 */
export function calculateRemainderDueDate(eventEndDate: Date): Date {
  const dueDate = new Date(eventEndDate);
  dueDate.setDate(dueDate.getDate() + 14);
  return dueDate;
}
