/**
 * Contract State Machine
 *
 * Validates contract lifecycle transitions and provides status metadata.
 * Based on Research Pattern 6: Contract Lifecycle Management
 */

import type { ContractStatus } from './types';

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions for contract lifecycle.
 *
 * State flow:
 * draft -> sent -> viewed -> signed -> completed -> active -> fulfilled
 *
 * Alternative paths:
 * - Direct signing: sent -> signed (skip viewed)
 * - Amendments: completed -> amended -> sent
 * - Termination: any state -> terminated (terminal)
 */
export const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['sent', 'terminated'],
  sent: ['viewed', 'signed', 'terminated'],
  viewed: ['signed', 'terminated'],
  signed: ['completed', 'terminated'],
  completed: ['active', 'amended', 'terminated'],
  active: ['fulfilled', 'terminated'],
  fulfilled: [], // Terminal state
  amended: ['sent'], // Re-send after amendments
  terminated: [], // Terminal state
};

/**
 * Check if a status transition is valid
 *
 * @param from - Current contract status
 * @param to - Desired contract status
 * @returns true if transition is allowed, false otherwise
 *
 * @example
 * canTransition('draft', 'sent') // true
 * canTransition('draft', 'signed') // false (must go through 'sent' first)
 * canTransition('fulfilled', 'active') // false (fulfilled is terminal)
 */
export function canTransition(
  from: ContractStatus,
  to: ContractStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

// ============================================================================
// Status Metadata
// ============================================================================

/**
 * Human-readable labels for each contract status
 */
export const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent: 'Sent to Client',
  viewed: 'Viewed by Client',
  signed: 'Signed',
  completed: 'Service Completed',
  active: 'Active',
  fulfilled: 'Fulfilled',
  amended: 'Amended',
  terminated: 'Terminated',
};

/**
 * Tailwind color classes for status badges
 */
export const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-indigo-100 text-indigo-800',
  signed: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  active: 'bg-teal-100 text-teal-800',
  fulfilled: 'bg-slate-100 text-slate-800',
  amended: 'bg-amber-100 text-amber-800',
  terminated: 'bg-red-100 text-red-800',
};

/**
 * Get next possible statuses from current status
 *
 * @param currentStatus - Current contract status
 * @returns Array of possible next statuses
 *
 * @example
 * getNextStatuses('draft') // ['sent', 'terminated']
 * getNextStatuses('fulfilled') // [] (terminal state)
 */
export function getNextStatuses(currentStatus: ContractStatus): ContractStatus[] {
  return VALID_TRANSITIONS[currentStatus];
}

/**
 * Check if a status is terminal (no further transitions)
 *
 * @param status - Contract status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: ContractStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Get all statuses that can transition to a given status
 *
 * @param targetStatus - Status to find predecessors for
 * @returns Array of statuses that can transition to targetStatus
 *
 * @example
 * getPreviousStatuses('signed') // ['sent', 'viewed']
 */
export function getPreviousStatuses(targetStatus: ContractStatus): ContractStatus[] {
  const predecessors: ContractStatus[] = [];

  for (const [status, transitions] of Object.entries(VALID_TRANSITIONS)) {
    if (transitions.includes(targetStatus)) {
      predecessors.push(status as ContractStatus);
    }
  }

  return predecessors;
}

// ============================================================================
// Workflow Validation
// ============================================================================

/**
 * Validate a full workflow path
 *
 * @param path - Array of statuses representing a workflow
 * @returns true if the entire path is valid
 *
 * @example
 * validateWorkflowPath(['draft', 'sent', 'signed', 'completed']) // true
 * validateWorkflowPath(['draft', 'signed']) // false (must go through 'sent')
 */
export function validateWorkflowPath(path: ContractStatus[]): boolean {
  if (path.length < 2) return true; // Single status is valid

  for (let i = 0; i < path.length - 1; i++) {
    if (!canTransition(path[i], path[i + 1])) {
      return false;
    }
  }

  return true;
}

/**
 * Get human-readable error message for invalid transition
 *
 * @param from - Current status
 * @param to - Attempted status
 * @returns Error message if invalid, null if valid
 */
export function getTransitionError(
  from: ContractStatus,
  to: ContractStatus
): string | null {
  if (canTransition(from, to)) {
    return null;
  }

  if (isTerminalStatus(from)) {
    return `Cannot transition from ${STATUS_LABELS[from]} - this is a terminal state.`;
  }

  const validNext = getNextStatuses(from);
  const validLabels = validNext.map((s) => STATUS_LABELS[s]).join(', ');

  return `Cannot transition from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}. Valid next states: ${validLabels}`;
}
