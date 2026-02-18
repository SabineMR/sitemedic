/**
 * Client Booking Detail Page
 *
 * Shows full details of a single booking including site info,
 * shift times, medic assignment, pricing breakdown, and notes.
 * Supports cancellation with refund policy enforcement.
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';

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

function getRefundInfo(shiftDate: string, total: number) {
  const daysUntil = differenceInDays(new Date(shiftDate), new Date());

  if (daysUntil >= 7) return { percent: 100, amount: total, label: '100% refund' };
  if (daysUntil >= 3) return { percent: 50, amount: parseFloat((total * 0.5).toFixed(2)), label: '50% refund' };
  return { percent: 0, amount: 0, label: 'No refund (less than 72 hours notice)' };
}

export default function ClientBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params.id as string;
  const { data: booking, isLoading, error } = useClientBookingDetail(bookingId);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = async () => {
    if (!booking) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel booking');
        setCancelling(false);
        return;
      }

      toast.success(
        data.refundAmount > 0
          ? `Booking cancelled. ${formatGBP(data.refundAmount)} refund will be processed.`
          : 'Booking cancelled.'
      );

      // Invalidate queries so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['client-booking', bookingId] });

      setShowCancelDialog(false);
      router.push('/client/bookings');
    } catch (err) {
      toast.error('Failed to cancel booking. Please try again.');
      setCancelling(false);
    }
  };

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);

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

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const refundInfo = canCancel ? getRefundInfo(booking.shift_date, booking.total) : null;

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

      {/* Cancel Booking */}
      {canCancel && !showCancelDialog && (
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => setShowCancelDialog(true)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Booking
        </Button>
      )}

      {/* Cancel Confirmation Dialog */}
      {canCancel && showCancelDialog && refundInfo && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Cancel This Booking?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium">Cancellation Policy</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>7+ days before shift: 100% refund</li>
                <li>3-6 days before shift: 50% refund</li>
                <li>Less than 72 hours: No refund</li>
              </ul>
            </div>

            <div className={`p-3 rounded-lg text-sm font-medium ${
              refundInfo.percent === 100
                ? 'bg-green-50 text-green-800'
                : refundInfo.percent === 50
                ? 'bg-amber-50 text-amber-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {refundInfo.percent > 0
                ? `You will receive a ${refundInfo.label} of ${formatGBP(refundInfo.amount)}`
                : refundInfo.label}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cancel-reason">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancel-reason"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Let us know why you're cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelling}
              >
                Keep Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact support (for non-cancellable bookings) */}
      {!canCancel && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              Need help with this booking?{' '}
              <a
                href="mailto:support@sitemedic.co.uk"
                className="font-medium underline"
              >
                Contact support
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
