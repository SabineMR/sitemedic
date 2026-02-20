'use client';

/**
 * CancellationConfirmation Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Shows financial breakdown before marketplace event cancellation.
 * Client must see deposit, tier, refund amount, and retained amount
 * then confirm to proceed.
 */

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  CANCELLATION_REASON_LABELS,
  type CancellationReason,
  type CancellationBreakdown,
} from '@/lib/marketplace/dispute-types';
import {
  calculateMarketplaceCancellationRefund,
  calculateCompanyCancellationRefund,
} from '@/lib/marketplace/cancellation';

interface CancellationConfirmationProps {
  eventId: string;
  eventName: string;
  depositPaid: number;
  eventStartDate: string;
  isCompanyCancellation?: boolean;
  onConfirm: (reason: CancellationReason, reasonDetail?: string) => Promise<void>;
  onCancel: () => void;
}

const REASONS: CancellationReason[] = [
  'event_cancelled',
  'found_alternative',
  'budget_issue',
  'scheduling_conflict',
  'other',
];

export function CancellationConfirmation({
  eventId,
  eventName,
  depositPaid,
  eventStartDate,
  isCompanyCancellation,
  onConfirm,
  onCancel,
}: CancellationConfirmationProps) {
  const [breakdown, setBreakdown] = useState<CancellationBreakdown | null>(null);
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCompanyCancellation) {
      setBreakdown(calculateCompanyCancellationRefund(depositPaid));
    } else {
      setBreakdown(calculateMarketplaceCancellationRefund(depositPaid, eventStartDate));
    }
  }, [depositPaid, eventStartDate, isCompanyCancellation]);

  const handleProceed = () => {
    if (!reason) {
      setError('Please select a cancellation reason');
      return;
    }
    setConfirmStep(true);
  };

  const handleFinalConfirm = async () => {
    setCancelling(true);
    setError(null);
    try {
      await onConfirm(reason as CancellationReason, reasonDetail || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel event');
      setConfirmStep(false);
    } finally {
      setCancelling(false);
    }
  };

  if (!breakdown) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Final confirmation dialog
  if (confirmStep) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Are you sure?</p>
            <p className="text-sm text-red-700 mt-1">
              This action cannot be undone. {breakdown.refundAmount > 0
                ? `You will receive a refund of \u00a3${breakdown.refundAmount.toFixed(2)}.`
                : 'No refund will be issued.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmStep(false)}
            disabled={cancelling}
            className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleFinalConfirm}
            disabled={cancelling}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">
        Cancel Event: {eventName}
      </h3>

      {/* Financial breakdown */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Financial Breakdown</h4>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-gray-600">Deposit paid</td>
              <td className="py-1 text-right font-medium text-gray-900">
                &pound;{breakdown.depositPaid.toFixed(2)}
              </td>
            </tr>
            {!isCompanyCancellation && (
              <tr>
                <td className="py-1 text-gray-600">Days until event</td>
                <td className="py-1 text-right text-gray-700">
                  {breakdown.daysUntilEvent}
                </td>
              </tr>
            )}
            <tr>
              <td className="py-1 text-gray-600">Cancellation tier</td>
              <td className="py-1 text-right text-gray-700">
                {breakdown.tier}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="pt-2 text-gray-600 font-medium">Refund amount</td>
              <td className="pt-2 text-right font-bold text-green-600">
                &pound;{breakdown.refundAmount.toFixed(2)} ({breakdown.refundPercent}%)
              </td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Retained by company</td>
              <td className="py-1 text-right font-medium text-gray-700">
                &pound;{breakdown.retainedAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* No refund warning */}
      {breakdown.refundPercent === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>No refund will be issued.</strong> Your full deposit will be retained by the company as per the cancellation policy for events within 7 days.
          </p>
        </div>
      )}

      {/* Cancellation reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason for cancellation
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as CancellationReason)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a reason...</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {CANCELLATION_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {reason === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional details
          </label>
          <textarea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Please explain..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
          />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!reason}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Cancel Event
        </button>
      </div>
    </div>
  );
}
