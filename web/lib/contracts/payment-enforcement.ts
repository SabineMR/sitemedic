/**
 * Payment Milestone Enforcement
 *
 * Logic for tracking payment milestones, enforcing payment schedules,
 * and gating booking confirmation based on contract requirements.
 */

import { Contract, PaymentTerms, ContractStatus } from './types';

// ============================================================================
// Payment Milestone Types
// ============================================================================

export interface PaymentMilestone {
  id: 'upfront' | 'completion' | 'net30';
  label: string;
  amount: number;
  dueEvent: 'on_signing' | 'on_completion' | 'net_30_days';
  dueDate?: string; // Calculated ISO date for net30
  status: 'pending' | 'due' | 'paid' | 'overdue';
  paidAt?: string;
}

// ============================================================================
// Milestone Calculation
// ============================================================================

/**
 * Get all payment milestones for a contract based on payment terms
 *
 * @param contract - Contract with payment amounts and status
 * @returns Array of payment milestones with current status
 *
 * @example
 * const milestones = getPaymentMilestones(contract);
 * // Returns: [
 * //   { id: 'upfront', label: 'Upfront Payment', amount: 500, status: 'paid', ... },
 * //   { id: 'completion', label: 'Completion Payment', amount: 500, status: 'due', ... }
 * // ]
 */
export function getPaymentMilestones(contract: Contract): PaymentMilestone[] {
  const milestones: PaymentMilestone[] = [];

  // Upfront payment milestone
  if (contract.upfront_amount > 0) {
    milestones.push({
      id: 'upfront',
      label: 'Upfront Payment',
      amount: contract.upfront_amount,
      dueEvent: 'on_signing',
      status: contract.upfront_paid_at
        ? 'paid'
        : contract.status === 'signed' ||
          contract.status === 'completed' ||
          contract.status === 'active' ||
          contract.status === 'fulfilled'
        ? 'due'
        : 'pending',
      paidAt: contract.upfront_paid_at || undefined,
    });
  }

  // Completion payment milestone
  if (contract.completion_amount > 0) {
    milestones.push({
      id: 'completion',
      label: 'Completion Payment',
      amount: contract.completion_amount,
      dueEvent: 'on_completion',
      status: contract.completion_paid_at
        ? 'paid'
        : contract.status === 'fulfilled' ||
          contract.status === 'active' ||
          contract.completed_at
        ? 'due'
        : 'pending',
      paidAt: contract.completion_paid_at || undefined,
    });
  }

  // Net 30 payment milestone
  if (contract.net30_amount > 0) {
    // Calculate Net 30 due date from completion/fulfilled date
    const completionDate = contract.fulfilled_at || contract.completed_at;
    const dueDate = completionDate
      ? new Date(
          new Date(completionDate).getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      : undefined;

    // Determine if overdue
    const isOverdue =
      dueDate && !contract.net30_paid_at && new Date(dueDate) < new Date();

    milestones.push({
      id: 'net30',
      label: 'Net 30 Payment',
      amount: contract.net30_amount,
      dueEvent: 'net_30_days',
      dueDate,
      status: contract.net30_paid_at
        ? 'paid'
        : isOverdue
        ? 'overdue'
        : completionDate
        ? 'due'
        : 'pending',
      paidAt: contract.net30_paid_at || undefined,
    });
  }

  return milestones;
}

/**
 * Get the next milestone that needs payment
 *
 * @param contract - Contract to check
 * @returns Next due/overdue milestone, or null if all paid
 *
 * @example
 * const next = getNextMilestone(contract);
 * if (next) {
 *   console.log(`Next payment: ${next.label} - ${next.amount}`);
 * }
 */
export function getNextMilestone(
  contract: Contract
): PaymentMilestone | null {
  const milestones = getPaymentMilestones(contract);

  // Return first overdue milestone (highest priority)
  const overdue = milestones.find((m) => m.status === 'overdue');
  if (overdue) return overdue;

  // Return first due milestone
  return milestones.find((m) => m.status === 'due') || null;
}

// ============================================================================
// Booking Confirmation Gate
// ============================================================================

/**
 * Check if a booking can be confirmed based on contract requirements
 *
 * @param booking - Booking to confirm
 * @param contract - Associated contract, or null if none exists
 * @returns Object with canConfirm boolean and optional reason
 *
 * @example
 * const { canConfirm, reason } = canConfirmBooking(booking, contract);
 * if (!canConfirm) {
 *   return res.status(400).json({ error: reason });
 * }
 */
export function canConfirmBooking(
  booking: any,
  contract: Contract | null
): {
  canConfirm: boolean;
  reason?: string;
} {
  // If no contract exists for this booking, allow confirmation
  // (Contracts are optional per client configuration)
  if (!contract) {
    return { canConfirm: true };
  }

  // If contract requires signature before booking confirmation
  if (contract.requires_signature_before_booking) {
    // Check if contract is signed or beyond
    const signedStatuses: ContractStatus[] = [
      'signed',
      'completed',
      'active',
      'fulfilled',
    ];

    if (signedStatuses.includes(contract.status)) {
      return { canConfirm: true };
    }

    return {
      canConfirm: false,
      reason: `Service agreement must be signed before booking can be confirmed. Current status: ${contract.status}`,
    };
  }

  // If signature not required before booking, allow confirmation
  return { canConfirm: true };
}

// ============================================================================
// Payment Completion Checks
// ============================================================================

/**
 * Check if all payments for a contract are complete
 *
 * @param contract - Contract to check
 * @returns true if all milestones are paid
 *
 * @example
 * if (isFullyPaid(contract)) {
 *   // Update contract status to fulfilled
 * }
 */
export function isFullyPaid(contract: Contract): boolean {
  const milestones = getPaymentMilestones(contract);
  return milestones.length > 0 && milestones.every((m) => m.status === 'paid');
}

/**
 * Calculate total paid and remaining amounts
 *
 * @param contract - Contract to calculate
 * @returns Object with totalPaid and totalRemaining
 */
export function calculatePaymentProgress(contract: Contract): {
  totalPaid: number;
  totalRemaining: number;
  totalAmount: number;
  percentagePaid: number;
} {
  const totalPaid =
    (contract.upfront_paid_at ? contract.upfront_amount : 0) +
    (contract.completion_paid_at ? contract.completion_amount : 0) +
    (contract.net30_paid_at ? contract.net30_amount : 0);

  const totalAmount =
    contract.upfront_amount +
    contract.completion_amount +
    contract.net30_amount;

  const totalRemaining = totalAmount - totalPaid;
  const percentagePaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return {
    totalPaid,
    totalRemaining,
    totalAmount,
    percentagePaid,
  };
}

/**
 * Get count of completed and total milestones
 *
 * @param contract - Contract to count
 * @returns Object with completed and total counts
 */
export function getMilestoneCount(contract: Contract): {
  completed: number;
  total: number;
} {
  const milestones = getPaymentMilestones(contract);
  const completed = milestones.filter((m) => m.status === 'paid').length;
  return { completed, total: milestones.length };
}
