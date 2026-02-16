/**
 * ConflictModal Component
 *
 * Displays conflict details when assignment validation fails
 *
 * WHY: When admins try to assign a booking that has conflicts (double-booking,
 * missing certifications, overtime violations, etc.), they need clear information
 * about what went wrong and whether they can override it.
 *
 * CONFLICT SEVERITY:
 * - CRITICAL (red): Cannot override. These are hard blockers (e.g., medic lacks
 *   required certification, would violate legal rest period requirements)
 * - WARNING (yellow): Can override. These are soft warnings (e.g., medic would
 *   work long hours, shift is far from home)
 *
 * UX FLOW:
 * 1. User drops booking on medic cell
 * 2. System detects conflicts
 * 3. Modal appears with clear explanation
 * 4. If critical conflicts: Only "Cancel" button
 * 5. If warnings only: Both "Cancel" and "Assign Anyway" buttons
 */

'use client';

import type { ConflictCheckResult } from '@/types/schedule';

interface ConflictModalProps {
  conflict: ConflictCheckResult | null;
  onClose: () => void;
  onForceAssign?: () => void;
}

export function ConflictModal({ conflict, onClose, onForceAssign }: ConflictModalProps) {
  // Don't render if no conflict
  if (!conflict) return null;

  const hasCritical = conflict.critical_conflicts > 0;
  const hasWarnings = conflict.conflicts.some((c) => c.severity === 'warning');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {hasCritical ? (
                <>
                  <span className="text-2xl">❌</span>
                  Cannot Assign Medic
                </>
              ) : (
                <>
                  <span className="text-2xl">⚠️</span>
                  Assignment Warning
                </>
              )}
            </h2>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Recommendation */}
            <div className="text-gray-300 mb-4 text-sm leading-relaxed">
              {conflict.recommendation}
            </div>

            {/* Conflicts List */}
            <div className="space-y-2">
              {conflict.conflicts.map((c, i) => (
                <div
                  key={i}
                  className={`
                    p-3 rounded-lg border
                    ${
                      c.severity === 'critical'
                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                        : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                    }
                  `}
                >
                  {/* Conflict Type */}
                  <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                    {c.severity === 'critical' ? '🚫' : '⚠️'}
                    {formatConflictType(c.type)}
                  </div>

                  {/* Conflict Message */}
                  <div className="text-sm opacity-90">{c.message}</div>

                  {/* Override indicator */}
                  {c.can_override && (
                    <div className="text-xs mt-1 opacity-75">
                      (Can be overridden)
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-xs text-gray-400 flex justify-between">
              <span>Total Conflicts: {conflict.total_conflicts}</span>
              {hasCritical && (
                <span className="text-red-400 font-medium">
                  Critical: {conflict.critical_conflicts}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>

            {/* Only show "Assign Anyway" if no critical conflicts */}
            {!hasCritical && hasWarnings && onForceAssign && (
              <button
                onClick={() => {
                  onForceAssign();
                  onClose();
                }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
              >
                Assign Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Format conflict type for display
 * Converts snake_case to Title Case
 */
function formatConflictType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
