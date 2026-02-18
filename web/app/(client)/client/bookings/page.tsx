/**
 * Client My Bookings Page
 *
 * Shows all bookings for the authenticated client with status,
 * date, site info, and pricing. Supports filtering and detail view.
 */

'use client';

import { useClientBookings } from '@/lib/queries/client/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, MapPin, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ClientBookingsPage() {
  const { data: bookings, isLoading, error } = useClientBookings();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading your bookings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 text-center">
          <p className="text-red-700">Failed to load bookings. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredBookings =
    filterStatus === 'all'
      ? bookings || []
      : (bookings || []).filter((b) => b.status === filterStatus);

  // Stats
  const upcoming = (bookings || []).filter(
    (b) => b.status === 'confirmed' && new Date(b.shift_date) >= new Date()
  ).length;
  const completed = (bookings || []).filter((b) => b.status === 'completed').length;
  const pending = (bookings || []).filter((b) => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">
          View and track all your medic bookings
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{upcoming}</div>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completed}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(
          (status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : statusLabels[status]}
            </Button>
          )
        )}
      </div>

      {/* Bookings list */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bookings found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filterStatus === 'all'
                ? "You don't have any bookings yet."
                : `No ${statusLabels[filterStatus]?.toLowerCase()} bookings found.`}
            </p>
            <Link href="/book">
              <Button>Book a Medic</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const medic = Array.isArray(booking.medics)
              ? booking.medics[0]
              : booking.medics;

            return (
              <Link
                key={booking.id}
                href={`/client/bookings/${booking.id}`}
                className="block"
              >
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      {/* Left: Booking info */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{booking.site_name}</h3>
                          <Badge
                            className={statusColors[booking.status] || ''}
                            variant="secondary"
                          >
                            {statusLabels[booking.status]}
                          </Badge>
                          {booking.is_recurring && (
                            <Badge variant="outline" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(booking.shift_date).toLocaleDateString(
                              'en-GB',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {booking.shift_start_time?.slice(0, 5)} -{' '}
                            {booking.shift_end_time?.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {booking.site_postcode}
                          </span>
                        </div>

                        {medic && (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-muted-foreground">Medic:</span>
                            <span className="font-medium">
                              {medic.first_name} {medic.last_name}
                            </span>
                            {medic.star_rating && (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                {Number(medic.star_rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Price */}
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {new Intl.NumberFormat('en-GB', {
                            style: 'currency',
                            currency: 'GBP',
                          }).format(booking.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">inc. VAT</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
