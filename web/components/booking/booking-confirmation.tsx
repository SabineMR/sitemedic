/**
 * Booking Confirmation Component
 * Phase 4.5: Display confirmed booking details with next steps
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, MapPin, User, Mail, FileText } from 'lucide-react';
import Link from 'next/link';
import { RecurringSummary } from './recurring-summary';
import { What3WordsDisplay } from './what3words-display';

interface BookingConfirmationProps {
  booking: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    siteName: string;
    siteAddress: string;
    medicName: string;
    medicRating: number;
    clientEmail: string;
    specialNotes?: string | null;
    what3wordsAddress?: string | null;
    pricing: {
      baseRate: number;
      shiftHours: number;
      hourlyTotal: number;
      urgencyPremiumPercent: number;
      urgencyAmount: number;
      travelSurcharge: number;
      subtotal: number;
      vat: number;
      total: number;
    };
  };
  recurringBookings?: Array<{
    id: string;
    date: string;
    status: string;
  }>;
  recurrencePattern?: 'weekly' | 'biweekly' | null;
}

export function BookingConfirmation({
  booking,
  recurringBookings,
  recurrencePattern,
}: BookingConfirmationProps) {
  const hasRecurring = recurringBookings && recurringBookings.length > 0;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Booking Confirmed</h1>
        <p className="text-slate-600">
          Your booking has been confirmed and your medic has been notified.
        </p>
      </div>

      {/* Booking Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Date</p>
              <p className="text-slate-600">{booking.date}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Shift Time</p>
              <p className="text-slate-600">
                {booking.startTime} - {booking.endTime}
              </p>
            </div>
          </div>

          {/* Site Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">{booking.siteName}</p>
              <p className="text-slate-600">{booking.siteAddress}</p>
            </div>
          </div>

          {/* What3Words Location */}
          {booking.what3wordsAddress && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">What3Words Location</p>
                <What3WordsDisplay address={booking.what3wordsAddress} />
              </div>
            </div>
          )}

          {/* Special Notes */}
          {booking.specialNotes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-500 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Special Notes</p>
                <p className="text-slate-600 whitespace-pre-wrap">{booking.specialNotes}</p>
              </div>
            </div>
          )}

          {/* Assigned Medic */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Assigned Medic</p>
              <p className="text-slate-600">
                {booking.medicName} ({booking.medicRating.toFixed(1)} ★)
              </p>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t pt-4">
            <p className="font-medium text-slate-900 mb-3">Pricing Breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Base Rate (£{booking.pricing.baseRate}/hr × {booking.pricing.shiftHours} hrs)
                </span>
                <span className="font-medium">£{booking.pricing.hourlyTotal.toFixed(2)}</span>
              </div>

              {booking.pricing.urgencyPremiumPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Urgency Premium ({booking.pricing.urgencyPremiumPercent}%)
                  </span>
                  <span className="font-medium">£{booking.pricing.urgencyAmount.toFixed(2)}</span>
                </div>
              )}

              {booking.pricing.travelSurcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Travel Surcharge</span>
                  <span className="font-medium">£{booking.pricing.travelSurcharge.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">£{booking.pricing.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">VAT (20%)</span>
                <span className="font-medium">£{booking.pricing.vat.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-lg">£{booking.pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Summary (if applicable) */}
      {hasRecurring && recurrencePattern && (
        <RecurringSummary
          bookings={recurringBookings}
          pattern={recurrencePattern}
          medicName={booking.medicName}
        />
      )}

      {/* What Happens Next */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p>
              A confirmation email with calendar invite has been sent to{' '}
              <span className="font-medium">{booking.clientEmail}</span>
            </p>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p>
              Your medic <span className="font-medium">{booking.medicName}</span> has been
              notified and will arrive at <span className="font-medium">{booking.startTime}</span>
            </p>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p>You can view your booking anytime in your dashboard</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="flex-1">
          <Link href="/dashboard">View in Dashboard</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/book">Book Another Medic</Link>
        </Button>
      </div>
    </div>
  );
}
