/**
 * Message Status Indicator - Client Component
 *
 * Shows delivery status ticks next to the sender's own messages:
 * - Single grey tick: Sent
 * - Double grey tick: Delivered
 * - Blue double tick: Read
 *
 * Phase 47: Message Polish
 */

'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '@/types/comms.types';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  className?: string;
}

export function MessageStatusIndicator({
  status,
  className,
}: MessageStatusIndicatorProps) {
  switch (status) {
    case 'sent':
      return (
        <Check
          className={cn('h-3.5 w-3.5 text-muted-foreground', className)}
        />
      );
    case 'delivered':
      return (
        <CheckCheck
          className={cn('h-3.5 w-3.5 text-muted-foreground', className)}
        />
      );
    case 'read':
      return (
        <CheckCheck
          className={cn('h-3.5 w-3.5 text-blue-500', className)}
        />
      );
    default:
      return null;
  }
}
