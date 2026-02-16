/**
 * Recurring Summary Component
 * Phase 4.5: Display recurring booking details
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Repeat } from 'lucide-react';

interface RecurringSummaryProps {
  bookings: Array<{
    id: string;
    date: string;
    status: string;
  }>;
  pattern: 'weekly' | 'biweekly';
  medicName: string;
}

export function RecurringSummary({
  bookings,
  pattern,
  medicName,
}: RecurringSummaryProps) {
  const patternLabel = pattern === 'weekly' ? 'Weekly' : 'Bi-weekly';
  const lastDate = bookings[bookings.length - 1]?.date || '';

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Repeat className="h-5 w-5" />
          Recurring Booking Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="text-sm text-purple-900">
          <p className="mb-2">
            <span className="font-semibold">{bookings.length} bookings</span> created,{' '}
            {patternLabel.toLowerCase()} until{' '}
            <span className="font-semibold">{lastDate}</span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-600 text-white">
              Same Medic
            </Badge>
            <span>{medicName} assigned to all recurring shifts</span>
          </p>
        </div>

        {/* Booking List */}
        <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-purple-100 border-b border-purple-200">
              <tr>
                <th className="text-left p-3 font-semibold text-purple-900">Date</th>
                <th className="text-left p-3 font-semibold text-purple-900">Day</th>
                <th className="text-left p-3 font-semibold text-purple-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const date = new Date(booking.date);
                const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
                const dateFormatted = date.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                const statusColor =
                  booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800';

                return (
                  <tr key={booking.id} className="border-b border-purple-100 last:border-b-0">
                    <td className="p-3 text-slate-900">{dateFormatted}</td>
                    <td className="p-3 text-slate-600">{dayName}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className={statusColor}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Pending Payment'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
