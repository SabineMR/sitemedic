/**
 * DayCell Component
 *
 * Droppable cell for a specific medic on a specific date
 *
 * WHY: Each day cell is a drop zone where bookings can be assigned.
 * When a booking is dragged over this cell, it highlights to show it's a valid drop target.
 * The cell displays all currently assigned bookings for that medic on that date,
 * plus busy block chips (Google Calendar, manual, time-off) above the bookings.
 *
 * KEY BEHAVIORS:
 * - Shows visual feedback when a booking is dragged over it (blue border)
 * - Displays busy block chips: purple (GCal), orange (manual), red (time-off)
 * - Displays all bookings for this medic on this date (stacked vertically)
 * - Generates a unique ID combining medic_id and date for drop zone identification
 */

'use client';

import { useDroppable } from '@dnd-kit/core';
import { useScheduleBoardStore } from '@/stores/useScheduleBoardStore';
import { BookingCard } from './BookingCard';
import type { BusyBlock } from '@/types/schedule';

interface DayCellProps {
  medicId: string;
  date: string;
}

/** Style map for busy block chip sources */
const busyBlockStyles: Record<BusyBlock['source'], { bg: string; text: string; border: string }> = {
  google_calendar: {
    bg: 'bg-purple-900/40',
    text: 'text-purple-300',
    border: 'border-purple-700/50',
  },
  manual: {
    bg: 'bg-orange-900/40',
    text: 'text-orange-300',
    border: 'border-orange-700/50',
  },
  time_off: {
    bg: 'bg-red-900/40',
    text: 'text-red-300',
    border: 'border-red-700/50',
  },
};

export function DayCell({ medicId, date }: DayCellProps) {
  const getBookingsForMedicOnDate = useScheduleBoardStore(
    (state) => state.getBookingsForMedicOnDate
  );
  const getBusyBlocksForMedicOnDate = useScheduleBoardStore(
    (state) => state.getBusyBlocksForMedicOnDate
  );
  const bookings = getBookingsForMedicOnDate(medicId, date);
  const busyBlocks = getBusyBlocksForMedicOnDate(medicId, date);

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

      {/* Busy block chips */}
      {busyBlocks.length > 0 && (
        <div className="space-y-1 mb-1">
          {busyBlocks.map((block) => {
            const styles = busyBlockStyles[block.source];
            return (
              <div
                key={block.id}
                className={`px-2 py-1 rounded text-xs border ${styles.bg} ${styles.text} ${styles.border}`}
                title={`${block.title}${block.startTime !== '00:00' ? ` (${block.startTime}-${block.endTime})` : ''}`}
              >
                <div className="font-medium truncate">{block.title}</div>
                {block.startTime !== '00:00' && (
                  <div className="text-[10px] opacity-75">
                    {block.startTime}-{block.endTime}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bookings for this cell */}
      <div className="space-y-1">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>

      {/* Empty state indicator */}
      {bookings.length === 0 && busyBlocks.length === 0 && !isOver && (
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
