/**
 * Certification Status Badge Component
 *
 * Displays visual status indicator for certification expiry:
 * - Green: Valid (>30 days remaining)
 * - Amber: Expiring soon (≤30 days remaining)
 * - Red: Expired
 */

'use client';

import { parseISO, isPast, differenceInDays, isFuture } from 'date-fns';
import type { CertificationStatus } from '@/types/certification.types';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

// =============================================================================
// STATUS CALCULATION
// =============================================================================

/**
 * Determine certification status based on expiry date.
 * - expired: Expiry date in the past
 * - expiring-soon: Expiry date within 30 days (and future)
 * - valid: Expiry date more than 30 days away
 */
export function getCertificationStatus(expiryDate: string): CertificationStatus {
  const expiry = parseISO(expiryDate);

  if (isPast(expiry)) {
    return 'expired';
  }

  const daysRemaining = differenceInDays(expiry, new Date());

  if (daysRemaining <= 30 && isFuture(expiry)) {
    return 'expiring-soon';
  }

  return 'valid';
}

// =============================================================================
// BADGE COMPONENT
// =============================================================================

interface CertificationStatusBadgeProps {
  expiryDate: string;
  showDays?: boolean;
}

export function CertificationStatusBadge({
  expiryDate,
  showDays = true,
}: CertificationStatusBadgeProps) {
  const status = getCertificationStatus(expiryDate);
  const expiry = parseISO(expiryDate);
  const daysRemaining = differenceInDays(expiry, new Date());

  // Status configuration
  const statusConfig = {
    valid: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Valid',
      icon: CheckCircle2,
    },
    'expiring-soon': {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      label: showDays ? `Expires in ${daysRemaining} days` : 'Expiring Soon',
      icon: AlertTriangle,
    },
    expired: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      label: showDays && daysRemaining < 0
        ? `Expired ${Math.abs(daysRemaining)} days ago`
        : 'Expired',
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      aria-label={`Certification status: ${config.label}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
