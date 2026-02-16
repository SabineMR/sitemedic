/**
 * Net 30 Confirmation Component
 * Phase 4.5: Booking confirmation for Net 30 clients (no payment required)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { BookingFormData, PricingBreakdown } from '@/lib/booking/types';

interface Net30ConfirmationProps {
  clientId: string;
  creditLimit: number;
  outstandingBalance: number;
}

export function Net30Confirmation({
  clientId,
  creditLimit,
  outstandingBalance,
}: Net30ConfirmationProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);

  useEffect(() => {
    // Retrieve booking data from sessionStorage
    const bookingDataStr = sessionStorage.getItem('bookingFormData');
    const pricingDataStr = sessionStorage.getItem('pricingBreakdown');

    if (!bookingDataStr || !pricingDataStr) {
      setError('Booking data not found. Please return to the booking form.');
      return;
    }

    setBookingData(JSON.parse(bookingDataStr));
    setPricing(JSON.parse(pricingDataStr));
  }, []);

  const handleConfirm = async () => {
    if (!bookingData || !pricing) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingData,
          clientId,
          shiftDate: bookingData.shiftDate?.toISOString(),
          pricing: {
            baseRate: pricing.baseRate,
            shiftHours: pricing.shiftHours,
            hourlyTotal: pricing.hourlyTotal,
            urgencyPremiumPercent: pricing.urgencyPremiumPercent,
            urgencyAmount: pricing.urgencyAmount,
            travelSurcharge: pricing.travelSurcharge,
            subtotal: pricing.subtotal,
            vat: pricing.vat,
            total: pricing.total,
            platformFee: pricing.platformFee,
            medicPayout: pricing.medicPayout,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Success - navigate to confirmation page
      router.push(`/book/confirmation?booking_id=${data.bookingId}`);
    } catch (err) {
      console.error('Error confirming booking:', err);
      setError('Failed to confirm booking. Please try again.');
      setLoading(false);
    }
  };

  if (!bookingData || !pricing) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
        {error || 'Loading booking data...'}
      </div>
    );
  }

  const availableCredit = creditLimit - outstandingBalance;
  const creditAfterBooking = availableCredit - pricing.total;
  const creditExceeded = creditAfterBooking < 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Booking Summary</h2>
        <p className="text-slate-600 mt-2">
          This booking will be invoiced on Net 30 terms
        </p>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Booking Details</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Date:</span>
              <span className="font-medium">
                {bookingData.shiftDate?.toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Time:</span>
              <span className="font-medium">
                {bookingData.shiftStartTime} - {bookingData.shiftEndTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hours:</span>
              <span className="font-medium">{bookingData.shiftHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Site:</span>
              <span className="font-medium">{bookingData.siteName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Postcode:</span>
              <span className="font-medium">{bookingData.sitePostcode}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Pricing Breakdown</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">
                Base rate ({pricing.shiftHours}h @ £{pricing.baseRate}/h):
              </span>
              <span>£{pricing.hourlyTotal.toFixed(2)}</span>
            </div>
            {pricing.urgencyPremiumPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Urgency premium ({pricing.urgencyPremiumPercent}%):
                </span>
                <span>£{pricing.urgencyAmount.toFixed(2)}</span>
              </div>
            )}
            {pricing.travelSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Travel surcharge:</span>
                <span>£{pricing.travelSurcharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Subtotal:</span>
              <span>£{pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">VAT (20%):</span>
              <span>£{pricing.vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-blue-600">£{pricing.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Credit Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Credit limit:</span>
              <span>£{creditLimit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Current outstanding:</span>
              <span>£{outstandingBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Available credit:</span>
              <span>£{availableCredit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Credit after booking:</span>
              <span className={creditExceeded ? 'text-red-600' : 'text-green-600'}>
                £{creditAfterBooking.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {creditExceeded && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-md">
          <p className="font-semibold">Credit Limit Exceeded</p>
          <p className="text-sm mt-1">
            This booking exceeds your available credit. Please contact us to increase
            your credit limit or pay by card.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-md p-4">
        <p className="text-sm">
          <strong>Payment Terms:</strong> Net 30. Invoice will be sent after shift completion.
          Payment due within 30 days.
        </p>
      </div>

      <Button
        onClick={handleConfirm}
        className="w-full"
        size="lg"
        disabled={loading || creditExceeded}
      >
        {loading ? 'Confirming Booking...' : 'Confirm Booking'}
      </Button>

      <Button
        variant="outline"
        onClick={() => router.push('/book')}
        className="w-full"
        disabled={loading}
      >
        Back to Booking Details
      </Button>
    </div>
  );
}
