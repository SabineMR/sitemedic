/**
 * BookingCard Component
 *
 * Draggable booking card with status-based styling
 *
 * WHY: This is the core draggable element in the schedule board.
 * Users drag these cards from the unassigned row to medic cells to assign shifts.
 * The visual design must clearly communicate:
 * - Booking time and duration
 * - Site name
 * - Special requirements (certifications)
 * - Status (pending, confirmed, urgent)
 * - Urgency premiums
 */

'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Booking } from '@/types/schedule';

interface BookingCardProps {
  booking: Booking;
  isDragging?: boolean;
  isPreview?: boolean; // For DragOverlay
}

export function BookingCard({ booking, isDragging = false, isPreview = false }: BookingCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: booking.id,
    disabled: isPreview, // Disable dragging for preview overlay
  });

  // Status color schemes (following dark theme patterns)
  const statusColors = {
    confirmed: 'bg-green-500/20 border-green-500 text-green-400',
    pending: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    urgent_broadcast: 'bg-red-500/20 border-red-500 text-red-400',
  };

  // Apply transform for drag animation (CSS transforms for performance)
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-2 rounded border text-xs
        cursor-grab active:cursor-grabbing
        ${statusColors[booking.status]}
        ${isDragging ? 'opacity-50' : ''}
        ${isPreview ? 'shadow-lg rotate-3' : ''}
        transition-opacity
        hover:shadow-md
      `}
    >
      {/* Time Range */}
      <div className="font-medium flex items-center justify-between">
        <span>
          {formatTime(booking.shift_start_time)} - {formatTime(booking.shift_end_time)}
        </span>
        <span className="text-xs opacity-75">
          {booking.shift_hours}h
        </span>
      </div>

      {/* Site Name */}
      <div className="mt-1 truncate" title={booking.site_name}>
        {booking.site_name}
      </div>

      {/* Client Name (if available) */}
      {booking.clients?.company_name && (
        <div className="text-xs opacity-75 truncate">
          {booking.clients.company_name}
        </div>
      )}

      {/* Requirements & Badges */}
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        {booking.confined_space_required && (
          <span className="text-sm" title="Confined Space Certification Required">
            🏗️
          </span>
        )}
        {booking.trauma_specialist_required && (
          <span className="text-sm" title="Trauma Specialist Certification Required">
            🏥
          </span>
        )}
        {booking.urgency_premium_percent > 0 && (
          <span className="text-xs px-1 bg-yellow-500/30 rounded" title="Urgency Premium">
            ⚡ +{booking.urgency_premium_percent}%
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Format time string from HH:MM:SS to HH:MM (12-hour format)
 */
function formatTime(time: string): string {
  if (!time) return '';

  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}
