'use client';

/**
 * Payment Milestone Tracker Component
 *
 * Visual timeline showing payment milestones with status indicators.
 * Displays paid/pending/overdue status with action buttons for capturing payments.
 */

import { Contract } from '@/lib/contracts/types';
import {
  getPaymentMilestones,
  calculatePaymentProgress,
  getMilestoneCount,
  type PaymentMilestone,
} from '@/lib/contracts/payment-enforcement';
import { formatGBP } from '@/lib/contracts/payment-schedules';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface PaymentMilestoneTrackerProps {
  contract: Contract;
  onCaptureMilestone?: (milestoneId: string) => void;
  isCapturing?: boolean;
}

export function PaymentMilestoneTracker({
  contract,
  onCaptureMilestone,
  isCapturing = false,
}: PaymentMilestoneTrackerProps) {
  const milestones = getPaymentMilestones(contract);
  const { totalPaid, totalRemaining, totalAmount, percentagePaid } =
    calculatePaymentProgress(contract);
  const { completed, total } = getMilestoneCount(contract);

  if (milestones.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        No payment milestones configured for this contract
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Payment Progress: {completed} of {total} completed
          </span>
          <span className="font-semibold text-gray-900">
            {percentagePaid.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${percentagePaid}%` }}
          />
        </div>

        {/* Amount Summary */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-600">Paid: </span>
            <span className="font-semibold text-green-700">
              {formatGBP(totalPaid)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Remaining: </span>
            <span className="font-semibold text-gray-900">
              {formatGBP(totalRemaining)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Total: </span>
            <span className="font-semibold text-gray-900">
              {formatGBP(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Timeline */}
      <div className="space-y-0">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative">
            {/* Connecting Line (not for last item) */}
            {index < milestones.length - 1 && (
              <div
                className={`absolute left-[19px] top-10 h-[calc(100%-40px)] w-0.5 ${
                  milestone.status === 'paid'
                    ? 'bg-green-300'
                    : 'bg-gray-300'
                }`}
              />
            )}

            {/* Milestone Card */}
            <div className="relative flex items-start gap-4 pb-6">
              {/* Status Icon */}
              <div className="relative z-10 flex-shrink-0">
                <MilestoneIcon milestone={milestone} />
              </div>

              {/* Milestone Details */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Label and Status Badge */}
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">
                        {milestone.label}
                      </h4>
                      <StatusBadge milestone={milestone} />
                    </div>

                    {/* Amount */}
                    <p className="mb-2 text-lg font-bold text-gray-900">
                      {formatGBP(milestone.amount)}
                    </p>

                    {/* Due Event Description */}
                    <p className="mb-1 text-sm text-gray-600">
                      {getDueEventDescription(milestone)}
                    </p>

                    {/* Paid At / Overdue Info */}
                    {milestone.status === 'paid' && milestone.paidAt && (
                      <p className="text-sm text-green-700">
                        Paid on{' '}
                        {new Date(milestone.paidAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}

                    {milestone.status === 'overdue' && milestone.dueDate && (
                      <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">
                          Overdue by {getDaysOverdue(milestone.dueDate)} days
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Capture Payment Button */}
                  {(milestone.status === 'due' ||
                    milestone.status === 'overdue') &&
                    onCaptureMilestone && (
                      <button
                        onClick={() => onCaptureMilestone(milestone.id)}
                        disabled={isCapturing}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          milestone.status === 'overdue'
                            ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                        }`}
                      >
                        {isCapturing ? 'Processing...' : 'Capture Payment'}
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function MilestoneIcon({ milestone }: { milestone: PaymentMilestone }) {
  switch (milestone.status) {
    case 'paid':
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-700" />
        </div>
      );
    case 'overdue':
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-700" />
        </div>
      );
    case 'due':
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Clock className="h-6 w-6 text-blue-700" />
        </div>
      );
    case 'pending':
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Circle className="h-6 w-6 text-gray-400" />
        </div>
      );
  }
}

function StatusBadge({ milestone }: { milestone: PaymentMilestone }) {
  switch (milestone.status) {
    case 'paid':
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Paid
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          Overdue
        </span>
      );
    case 'due':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          Due
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          Pending
        </span>
      );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDueEventDescription(milestone: PaymentMilestone): string {
  switch (milestone.dueEvent) {
    case 'on_signing':
      return 'Due upon contract signing';
    case 'on_completion':
      return 'Due upon service completion';
    case 'net_30_days':
      if (milestone.dueDate) {
        const dueDate = new Date(milestone.dueDate);
        return `Due on ${dueDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} (30 days after completion)`;
      }
      return 'Due 30 days after service completion';
  }
}

function getDaysOverdue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
