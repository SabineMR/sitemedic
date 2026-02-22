'use client';

export function DisputeForm({
  eventId,
  onDisputeFiled,
  onCancel,
}: {
  eventId: string;
  onDisputeFiled?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-gray-600">Raise dispute for event: {eventId}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDisputeFiled?.()}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
        >
          File Dispute
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
