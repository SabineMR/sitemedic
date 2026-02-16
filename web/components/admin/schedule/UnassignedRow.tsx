/**
 * UnassignedRow Component
 *
 * Horizontal scrollable row displaying all unassigned bookings
 *
 * WHY: This is the "source" area for drag-and-drop. Admins start here when
 * assigning shifts - they drag bookings from this row up to medic cells.
 *
 * KEY FEATURES:
 * - Horizontal scroll for many bookings (prevents vertical overflow)
 * - Badge showing count of unassigned bookings (quick status indicator)
 * - Empty state message when all bookings are assigned
 * - Sticky header for context when scrolling
 *
 * DESIGN PATTERN: Similar to a "backlog" or "inbox" in kanban boards
 */

'use client';

import { useScheduleBoardStore } from '@/stores/useScheduleBoardStore';
import { BookingCard } from './BookingCard';

export function UnassignedRow() {
  const getUnassignedBookings = useScheduleBoardStore((state) => state.getUnassignedBookings);
  const unassigned = getUnassignedBookings();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium flex items-center gap-2">
          <span>Unassigned Bookings</span>
          {unassigned.length > 0 && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded font-bold">
              {unassigned.length}
            </span>
          )}
        </h3>

        {/* Helpful hint for first-time users */}
        {unassigned.length > 0 && (
          <span className="text-gray-500 text-xs">
            Drag bookings to medic cells to assign
          </span>
        )}
      </div>

      {/* Horizontal Scrollable Container */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {unassigned.map((booking) => (
          <div key={booking.id} className="flex-shrink-0 w-[200px]">
            <BookingCard booking={booking} />
          </div>
        ))}

        {/* Empty State */}
        {unassigned.length === 0 && (
          <div className="w-full text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-green-400 font-medium">All bookings assigned!</div>
            <div className="text-gray-500 text-sm mt-1">
              Great work! The schedule is fully staffed.
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator for many bookings */}
      {unassigned.length > 5 && (
        <div className="text-center text-gray-600 text-xs mt-2">
          ← Scroll for more →
        </div>
      )}
    </div>
  );
}
