/**
 * BroadcastReadSummary - Client Component
 *
 * Inline read count display below each broadcast message.
 * Shows "Read by X of Y" with Eye icon. Clickable to open drilldown.
 *
 * Phase 44: Broadcast Messaging
 */

'use client';

import { Eye } from 'lucide-react';

interface BroadcastReadSummaryProps {
  messageId: string;
  totalRecipients: number;
  readCount: number;
  onDrilldown: () => void;
}

export function BroadcastReadSummary({
  totalRecipients,
  readCount,
  onDrilldown,
}: BroadcastReadSummaryProps) {
  if (totalRecipients === 0) return null;

  return (
    <button
      onClick={onDrilldown}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
    >
      <Eye className="h-3 w-3" />
      <span>
        Read by {readCount} of {totalRecipients}
      </span>
    </button>
  );
}
