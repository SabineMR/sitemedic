'use client';

import { useState } from 'react';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface CurrencyWithTooltipProps {
  amount: number;
  currency?: 'GBP' | 'USD';
  className?: string;
  showSymbol?: boolean;
}

/**
 * CurrencyWithTooltip - Displays currency amount with real-time conversion tooltip
 *
 * Features:
 * - Shows GBP amount with £ symbol
 * - Displays USD conversion on hover
 * - Uses cached exchange rate (refreshed hourly)
 * - Graceful fallback if API fails
 *
 * @example
 * <CurrencyWithTooltip amount={350} />
 * // Displays: £350 (hover shows: ≈ $444.50 USD)
 */
export default function CurrencyWithTooltip({
  amount,
  currency = 'GBP',
  className = '',
  showSymbol = true,
}: CurrencyWithTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { rate, loading, error } = useExchangeRate();

  const formatCurrency = (value: number, curr: string) => {
    if (curr === 'GBP') {
      return showSymbol
        ? `£${value.toLocaleString()}`
        : value.toLocaleString();
    }
    return showSymbol
      ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const convertedAmount = rate ? amount * rate : null;

  return (
    <span
      className={`relative inline-block cursor-help ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {formatCurrency(amount, currency)}

      {/* Tooltip */}
      {isHovered && !loading && convertedAmount && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 animate-fadeIn">
          ≈ {formatCurrency(convertedAmount, 'USD')} USD
          {error && (
            <span className="block text-xs text-slate-300 mt-1">
              (Approximate rate)
            </span>
          )}
          {/* Tooltip arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}

      {isHovered && loading && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
          Loading rate...
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}
