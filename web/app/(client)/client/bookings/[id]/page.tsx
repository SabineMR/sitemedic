/**
 * Client Booking Detail Page
 *
 * Shows full details of a single booking including site info,
 * shift times, medic assignment, pricing breakdown, and notes.
 */

'use client';

import { useParams } from 'next/navigation';
import { useClientBookingDetail } from '@/lib/queries/client/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Star,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

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

export default function ClientBookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const { data: booking, isLoading, error } = useClientBookingDetail(bookingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading booking details...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link href="/client/bookings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-red-700">
              Booking not found or you don&apos;t have access to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const medic = Array.isArray(booking.medics)
    ? booking.medics[0]
    : booking.medics;

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back button */}
      <Link href="/client/bookings">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{booking.site_name}</h1>
          <p className="text-muted-foreground">
            {booking.site_address}, {booking.site_postcode}
          </p>
        </div>
        <Badge
          className={statusColors[booking.status] || ''}
          variant="secondary"
        >
          {statusLabels[booking.status]}
        </Badge>
      </div>

      {/* Shift Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {new Date(booking.shift_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.shift_start_time?.slice(0, 5)} -{' '}
                {booking.shift_end_time?.slice(0, 5)} ({booking.shift_hours}hrs)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {booking.site_address}, {booking.site_postcode}
              </p>
            </div>
            {booking.is_recurring && (
              <div>
                <p className="text-sm text-muted-foreground">Recurrence</p>
                <p className="font-medium capitalize">
                  {booking.recurrence_pattern || 'Weekly'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Medic */}
      {medic && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Assigned Medic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {medic.first_name[0]}
                  {medic.last_name[0]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {medic.first_name} {medic.last_name}
                </p>
                {medic.star_rating && (
                  <p className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    {Number(medic.star_rating).toFixed(1)} rating
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pricing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Base Rate ({booking.shift_hours}hrs x {formatGBP(booking.base_rate)}/hr)
              </span>
              <span>{formatGBP(booking.base_rate * booking.shift_hours)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatGBP(booking.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (20%)</span>
              <span>{formatGBP(booking.vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>{formatGBP(booking.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Notes */}
      {booking.special_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Special Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {booking.special_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact support */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800">
            Need to make changes?{' '}
            <a
              href="mailto:support@sitemedic.co.uk"
              className="font-medium underline"
            >
              Contact support
            </a>{' '}
            or call us to modify or cancel this booking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
