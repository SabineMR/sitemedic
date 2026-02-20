/**
 * BroadcastReadDrilldown - Client Component
 *
 * Sheet drilldown showing per-medic read/unread status for a
 * specific broadcast message. Admin only.
 *
 * Phase 44: Broadcast Messaging
 */

'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { BroadcastRecipientDetail } from '@/types/comms.types';

interface BroadcastReadDrilldownProps {
  messageId: string;
  open: boolean;
  onClose: () => void;
}

interface RecipientsResponse {
  messageId: string;
  totalRecipients: number;
  readCount: number;
  recipients: BroadcastRecipientDetail[];
}

export function BroadcastReadDrilldown({
  messageId,
  open,
  onClose,
}: BroadcastReadDrilldownProps) {
  const { data, isLoading } = useQuery<RecipientsResponse>({
    queryKey: ['broadcast-recipients', messageId],
    queryFn: async () => {
      const res = await fetch(
        `/api/messages/broadcast/${messageId}/recipients`
      );
      if (!res.ok) throw new Error('Failed to fetch recipients');
      return res.json();
    },
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {data
              ? `Read by ${data.readCount} of ${data.totalRecipients}`
              : 'Broadcast Read Status'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {data?.recipients.map((recipient) => (
            <div
              key={recipient.recipient_id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <span className="text-sm font-medium">{recipient.name}</span>
              <div className="flex flex-col items-end gap-0.5">
                {recipient.status === 'read' ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 text-[10px]"
                  >
                    <Check className="h-3 w-3 mr-0.5" />
                    Read
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    <Clock className="h-3 w-3 mr-0.5" />
                    Unread
                  </Badge>
                )}
                {recipient.read_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(recipient.read_at)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {data && data.recipients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipients found
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
