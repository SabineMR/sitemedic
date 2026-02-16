/**
 * Deadline Countdown Component
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 */

import { calculateDaysUntilDeadline } from '@/lib/queries/riddor';
import { Badge } from '@/components/ui/badge';

interface DeadlineCountdownProps {
  deadlineDate: string;
}

export function DeadlineCountdown({ deadlineDate }: DeadlineCountdownProps) {
  const daysRemaining = calculateDaysUntilDeadline(deadlineDate);

  // Determine urgency level
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 3 && daysRemaining >= 0;
  const isWarning = daysRemaining > 3 && daysRemaining <= 7;

  const variant = isOverdue
    ? { text: `OVERDUE by ${Math.abs(daysRemaining)} days`, className: 'bg-red-100 text-red-800 border-red-300' }
    : isUrgent
    ? { text: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`, className: 'bg-red-100 text-red-800 border-red-300' }
    : isWarning
    ? { text: `${daysRemaining} days remaining`, className: 'bg-amber-100 text-amber-800 border-amber-300' }
    : { text: `${daysRemaining} days remaining`, className: 'bg-green-100 text-green-800 border-green-300' };

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.text}
    </Badge>
  );
}
