'use client';

import type { CancellationReason } from '@/lib/marketplace/dispute-types';

export function CancellationConfirmation({
  onConfirm,
  onCancel,
}: {
  eventId: string;
  eventName: string;
  depositPaid: number;
  eventStartDate: string;
  isCompanyCancellation: boolean;
  onConfirm: (reason: CancellationReason, reasonDetail?: string) => void | Promise<void>;
  onCancel?: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-gray-600">Confirm cancellation for this event.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm('other')}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
        >
          Confirm Cancel
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs"
        >
          Back
        </button>
      </div>
    </div>
  );
}
