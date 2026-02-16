/**
 * RIDDOR Status Badge Component
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 */

import { Badge } from '@/components/ui/badge';

interface RIDDORStatusBadgeProps {
  status: 'draft' | 'submitted' | 'confirmed';
}

export function RIDDORStatusBadge({ status }: RIDDORStatusBadgeProps) {
  const variants = {
    draft: { text: 'Draft', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    submitted: { text: 'Submitted', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    confirmed: { text: 'Confirmed', className: 'bg-green-100 text-green-800 border-green-300' },
  };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.text}
    </Badge>
  );
}
