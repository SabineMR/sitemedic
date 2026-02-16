'use client';

import type { ContractStatus } from '@/lib/contracts/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/contracts/workflow';
import { Badge } from '@/components/ui/badge';

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

/**
 * Contract status badge with color-coded labels
 *
 * Maps contract status to human-readable labels with appropriate colors.
 * Uses workflow.ts for consistent status display across the application.
 */
export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const label = STATUS_LABELS[status];
  const colorClass = STATUS_COLORS[status];

  return (
    <Badge
      variant="outline"
      className={`${colorClass} font-medium`}
    >
      {label}
    </Badge>
  );
}
