/**
 * AdminCurrency - Specialized currency component for admin pages
 *
 * This component is specifically designed for admin dashboard use.
 * It automatically applies admin-specific styling and ensures
 * all GBP amounts show USD conversion on hover.
 *
 * IMPORTANT: Always use this component for displaying GBP amounts
 * in admin pages. Do NOT manually format currency with £ symbols.
 *
 * @example
 * // Simple usage
 * <AdminCurrency amount={3500} />
 *
 * // With custom color (for stats cards)
 * <AdminCurrency amount={revenue} variant="success" />
 *
 * // Large display (for hero metrics)
 * <AdminCurrency amount={total} size="large" />
 */

'use client';

import CurrencyWithTooltip from '../../../components/CurrencyWithTooltip';

interface AdminCurrencyProps {
  amount: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
}

export default function AdminCurrency({
  amount,
  variant = 'default',
  size = 'medium',
  className = '',
}: AdminCurrencyProps) {
  // Admin-specific color variants
  const variantClasses = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    primary: 'text-blue-400',
  };

  // Admin-specific size classes
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-2xl font-bold',
    xlarge: 'text-3xl font-bold',
  };

  const combinedClassName = `${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return <CurrencyWithTooltip amount={amount} className={combinedClassName} />;
}
