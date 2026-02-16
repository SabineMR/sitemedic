/**
 * Payment Schedule Calculations
 *
 * Handles payment term options and schedule generation for contracts.
 * Supports 5 payment term types with proper GBP formatting.
 */

import type { PaymentTerms, PaymentSchedule } from './types';

// ============================================================================
// Payment Terms Options
// ============================================================================

export const PAYMENT_TERMS_OPTIONS: Array<{
  value: PaymentTerms;
  label: string;
  description: string;
}> = [
  {
    value: 'full_prepay',
    label: 'Full Prepayment',
    description: '100% due upon contract signing (before service)',
  },
  {
    value: 'split_50_50',
    label: '50/50 Split',
    description: '50% due upon signing, 50% due upon service completion',
  },
  {
    value: 'split_50_net30',
    label: '50% Prepay + 50% Net 30',
    description: '50% due upon signing, 50% due 30 days after service completion',
  },
  {
    value: 'full_net30',
    label: 'Full Net 30',
    description: '100% due 30 days after service completion',
  },
  {
    value: 'custom',
    label: 'Custom Terms',
    description: 'Manually define payment amounts and schedule',
  },
];

// ============================================================================
// Payment Schedule Calculation
// ============================================================================

/**
 * Calculate payment schedule based on total amount and payment terms
 *
 * @param total - Total contract amount in GBP
 * @param terms - Payment terms type
 * @param customUpfront - Custom upfront amount (only for 'custom' terms)
 * @param customCompletion - Custom completion amount (only for 'custom' terms)
 * @param customNet30 - Custom net 30 amount (only for 'custom' terms)
 * @returns PaymentSchedule with amounts and description
 *
 * @throws Error if custom amounts don't sum to total
 *
 * @example
 * calculatePaymentSchedule(1000, 'split_50_50')
 * // Returns: { terms: 'split_50_50', upfrontAmount: 500, completionAmount: 500, net30Amount: 0, description: '...' }
 */
export function calculatePaymentSchedule(
  total: number,
  terms: PaymentTerms,
  customUpfront?: number,
  customCompletion?: number,
  customNet30?: number
): PaymentSchedule {
  let upfrontAmount = 0;
  let completionAmount = 0;
  let net30Amount = 0;

  switch (terms) {
    case 'full_prepay':
      upfrontAmount = total;
      completionAmount = 0;
      net30Amount = 0;
      break;

    case 'split_50_50':
      upfrontAmount = roundToTwoDecimals(total / 2);
      completionAmount = roundToTwoDecimals(total - upfrontAmount);
      net30Amount = 0;
      break;

    case 'split_50_net30':
      upfrontAmount = roundToTwoDecimals(total / 2);
      completionAmount = 0;
      net30Amount = roundToTwoDecimals(total - upfrontAmount);
      break;

    case 'full_net30':
      upfrontAmount = 0;
      completionAmount = 0;
      net30Amount = total;
      break;

    case 'custom':
      if (
        customUpfront === undefined ||
        customCompletion === undefined ||
        customNet30 === undefined
      ) {
        throw new Error(
          'Custom payment terms require customUpfront, customCompletion, and customNet30 amounts'
        );
      }

      upfrontAmount = roundToTwoDecimals(customUpfront);
      completionAmount = roundToTwoDecimals(customCompletion);
      net30Amount = roundToTwoDecimals(customNet30);

      const customTotal = roundToTwoDecimals(
        upfrontAmount + completionAmount + net30Amount
      );

      if (customTotal !== roundToTwoDecimals(total)) {
        throw new Error(
          `Custom payment amounts (${formatGBP(customTotal)}) must sum to total (${formatGBP(total)})`
        );
      }
      break;

    default:
      throw new Error(`Unknown payment terms: ${terms}`);
  }

  const description = formatPaymentDescription({
    terms,
    upfrontAmount,
    completionAmount,
    net30Amount,
    description: '', // Will be generated
  });

  return {
    terms,
    upfrontAmount,
    completionAmount,
    net30Amount,
    description,
  };
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format payment schedule as human-readable description
 *
 * @param schedule - Payment schedule to format
 * @returns Human-readable payment description
 *
 * @example
 * formatPaymentDescription({ terms: 'split_50_50', upfrontAmount: 500, completionAmount: 500, net30Amount: 0 })
 * // Returns: "50% (£500.00) due upon signing, 50% (£500.00) due upon service completion"
 */
export function formatPaymentDescription(schedule: PaymentSchedule): string {
  const parts: string[] = [];

  if (schedule.upfrontAmount > 0) {
    parts.push(`${formatGBP(schedule.upfrontAmount)} due upon contract signing`);
  }

  if (schedule.completionAmount > 0) {
    parts.push(
      `${formatGBP(schedule.completionAmount)} due upon service completion`
    );
  }

  if (schedule.net30Amount > 0) {
    parts.push(
      `${formatGBP(schedule.net30Amount)} due 30 days after service completion`
    );
  }

  if (parts.length === 0) {
    return 'No payment required';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  // Join with commas and 'and' for last item
  const lastPart = parts.pop();
  return `${parts.join(', ')}, and ${lastPart}`;
}

/**
 * Format amount as GBP currency
 *
 * @param amount - Amount in GBP
 * @returns Formatted string (e.g., "£1,234.56")
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Round to 2 decimal places (avoids floating point issues)
 *
 * @param value - Number to round
 * @returns Rounded number
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Eligibility Checks
// ============================================================================

/**
 * Check if client is eligible for Net 30 payment terms
 *
 * Only clients with payment_terms = 'net_30' can use net30-related options
 *
 * @param clientPaymentTerms - Client's payment_terms field from clients table
 * @returns true if client can use net30 terms
 */
export function isNet30Eligible(clientPaymentTerms: string): boolean {
  return clientPaymentTerms === 'net_30';
}

/**
 * Get available payment terms for a client
 *
 * @param clientPaymentTerms - Client's payment_terms field
 * @returns Array of PaymentTerms options available to this client
 */
export function getAvailablePaymentTerms(
  clientPaymentTerms: string
): PaymentTerms[] {
  const baseTerms: PaymentTerms[] = ['full_prepay', 'split_50_50', 'custom'];

  if (isNet30Eligible(clientPaymentTerms)) {
    return [...baseTerms, 'split_50_net30', 'full_net30'];
  }

  return baseTerms;
}

/**
 * Filter payment terms options by client eligibility
 *
 * @param clientPaymentTerms - Client's payment_terms field
 * @returns Filtered PAYMENT_TERMS_OPTIONS array
 */
export function getPaymentTermsOptions(clientPaymentTerms: string) {
  const availableTerms = getAvailablePaymentTerms(clientPaymentTerms);

  return PAYMENT_TERMS_OPTIONS.filter((option) =>
    availableTerms.includes(option.value)
  );
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate payment schedule amounts
 *
 * @param schedule - Payment schedule to validate
 * @param expectedTotal - Expected total amount
 * @returns true if valid, error message if invalid
 */
export function validatePaymentSchedule(
  schedule: PaymentSchedule,
  expectedTotal: number
): { valid: true } | { valid: false; error: string } {
  const { upfrontAmount, completionAmount, net30Amount } = schedule;

  // Check for negative amounts
  if (upfrontAmount < 0 || completionAmount < 0 || net30Amount < 0) {
    return { valid: false, error: 'Payment amounts cannot be negative' };
  }

  // Check that amounts sum to total
  const calculatedTotal = roundToTwoDecimals(
    upfrontAmount + completionAmount + net30Amount
  );
  const roundedExpected = roundToTwoDecimals(expectedTotal);

  if (calculatedTotal !== roundedExpected) {
    return {
      valid: false,
      error: `Payment amounts (${formatGBP(calculatedTotal)}) must sum to total (${formatGBP(roundedExpected)})`,
    };
  }

  return { valid: true };
}
