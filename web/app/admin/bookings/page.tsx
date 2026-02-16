/**
 * Admin Bookings Page
 *
 * Manage bookings with approval workflow, bulk operations, and medic reassignment.
 * Uses BookingApprovalTable with TanStack Query for optimistic updates.
 */

'use client';

import { useBookings } from '@/lib/queries/admin/bookings';
import { BookingApprovalTable } from '@/components/admin/booking-approval-table';
import Link from 'next/link';
import { Calendar, CalendarPlus } from 'lucide-react';

export default function BookingsPage() {
  // Fetch initial data for hydration
  const { data: bookings = [] } = useBookings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              Bookings
            </h1>
            <p className="text-gray-400 text-sm">Manage all medic shift bookings and assignments</p>
          </div>
          <Link
            href="/admin/bookings/new"
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <CalendarPlus className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            New Booking
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <BookingApprovalTable initialData={bookings} />
      </div>
    </div>
  );
}
