/**
 * VerifiedBadge Component
 * Phase 32-03: Marketplace Verification
 *
 * Reusable badge showing marketplace company verification status.
 * Used on admin verification queue, company detail page, and
 * future marketplace company profile pages.
 */

import {
  ShieldCheck,
  ShieldOff,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { VerificationStatus } from '@/lib/marketplace/types';

interface VerifiedBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  VerificationStatus,
  {
    label: string;
    icon: typeof ShieldCheck;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
  },
  cqc_verified: {
    label: 'CQC Verified',
    icon: ShieldCheck,
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  pending: {
    label: 'Pending Review',
    icon: Clock,
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
  },
  info_requested: {
    label: 'Info Requested',
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
  suspended: {
    label: 'Suspended',
    icon: ShieldOff,
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-4 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
  },
};

export function VerifiedBadge({ status, size = 'sm' }: VerifiedBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CLASSES[size];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeConfig.container}`}
    >
      <Icon className={sizeConfig.icon} />
      {config.label}
    </span>
  );
}
