/**
 * DayCell Component
 *
 * Droppable cell for a specific medic on a specific date
 *
 * WHY: Each day cell is a drop zone where bookings can be assigned.
 * When a booking is dragged over this cell, it highlights to show it's a valid drop target.
 * The cell displays all currently assigned bookings for that medic on that date.
 *
 * KEY BEHAVIORS:
 * - Shows visual feedback when a booking is dragged over it (blue border)
 * - Displays all bookings for this medic on this date (stacked vertically)
 * - Generates a unique ID combining medic_id and date for drop zone identification
 */

'use client';

import { useDroppable } from '@dnd-kit/core';
import { useScheduleBoardStore } from '@/stores/useScheduleBoardStore';
import { BookingCard } from './BookingCard';

interface DayCellProps {
  medicId: string;
  date: string;
}

export function DayCell({ medicId, date }: DayCellProps) {
  const getBookingsForMedicOnDate = useScheduleBoardStore(
    (state) => state.getBookingsForMedicOnDate
  );
  const bookings = getBookingsForMedicOnDate(medicId, date);

  // Create droppable zone with composite ID (medic_id + date)
  const { setNodeRef, isOver } = useDroppable({
    id: `${medicId}_${date}`,
  });

  // Format date for header (e.g., "Mon 15")
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = dateObj.getDate();

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[100px] p-2 rounded border
        ${isOver ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' : 'border-gray-700 bg-gray-800/50'}
        transition-all duration-200
      `}
    >
      {/* Date header (only show on first render, or make it sticky) */}
      <div className="text-xs text-gray-400 mb-1 font-medium">
        {dayName} {dayNum}
      </div>

      {/* Bookings for this cell */}
      <div className="space-y-1">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>

      {/* Empty state indicator */}
      {bookings.length === 0 && !isOver && (
        <div className="text-center text-gray-600 text-xs py-4">
          No shifts
        </div>
      )}

      {/* Drop zone indicator */}
      {isOver && (
        <div className="text-center text-blue-400 text-xs py-4 font-medium">
          Drop to assign
        </div>
      )}
    </div>
  );
}
