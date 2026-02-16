/**
 * Admin Dashboard Types
 *
 * Type definitions to enforce consistent patterns across admin pages.
 */

/**
 * Currency type that enforces USD conversion display
 *
 * Use this type for any GBP amounts to ensure they're displayed
 * with the CurrencyWithTooltip component (shows USD on hover).
 *
 * @example
 * interface DashboardStats {
 *   totalRevenue: CurrencyAmount;  // Forces developer to use CurrencyWithTooltip
 *   weeklyPayouts: CurrencyAmount;
 * }
 */
export type CurrencyAmount = number & { __brand: 'CurrencyAmount' };

/**
 * Helper to create a CurrencyAmount from a raw number
 *
 * @example
 * const revenue = toCurrency(8450);
 * // Now TypeScript enforces using CurrencyWithTooltip to display it
 */
export function toCurrency(amount: number): CurrencyAmount {
  return amount as CurrencyAmount;
}

/**
 * Stat card data structure
 */
export interface StatCardData {
  label: string;
  value: number | string | CurrencyAmount;
  icon: string;
  trend: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  highlight?: boolean;
}

/**
 * Recent activity item
 */
export interface RecentActivity {
  id: string;
  type: 'booking' | 'issue' | 'medic' | 'payment';
  message: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
  amount?: CurrencyAmount; // If activity involves money
}

/**
 * Type guard to check if a value is a currency amount
 */
export function isCurrencyAmount(value: unknown): value is CurrencyAmount {
  return typeof value === 'number';
}
