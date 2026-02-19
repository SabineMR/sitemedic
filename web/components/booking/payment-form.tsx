/**
 * Payment Form with Stripe Payment Element
 * Phase 4.5: Card payment form for prepay clients
 */

'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';
import type { BookingFormData, PricingBreakdown } from '@/lib/booking/types';

const stripePromise = loadStripe();

interface PaymentFormProps {
  clientId: string;
}

function CheckoutForm({ bookingId, total }: { bookingId: string; total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError(null);
    setPaymentFailed(false);
    setLoading(true);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/book/confirmation?booking_id=${bookingId}`,
        },
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setPaymentFailed(true);
        setLoading(false);
      }
      // If successful, user will be redirected to return_url
    } catch (err) {
      setError('An unexpected error occurred');
      setPaymentFailed(true);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold text-blue-600">
            £{total.toFixed(2)}
          </span>
        </div>
      </div>

      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {paymentFailed && (
        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-gray-700">
            <p className="font-medium">Reference: {bookingId}</p>
            <p className="mt-1 text-gray-500">Please quote this reference if contacting support.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Retrying...' : 'Try Again'}
            </Button>

            <a
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@sitemedic.co.uk'}?subject=${encodeURIComponent(`Payment Issue - Ref ${bookingId}`)}`}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Contact Support
            </a>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || loading}
        size="lg"
      >
        {loading ? 'Processing...' : `Pay £${total.toFixed(2)} and Confirm Booking`}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        Your payment is secure and encrypted. We use Stripe for payment processing.
      </p>
    </form>
  );
}

export function PaymentForm({ clientId }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Retrieve booking data from sessionStorage
    const bookingDataStr = sessionStorage.getItem('bookingFormData');
    const pricingDataStr = sessionStorage.getItem('bookingPricing');

    if (!bookingDataStr || !pricingDataStr) {
      setError('Booking data not found. Please return to the booking form.');
      setLoading(false);
      return;
    }

    let bookingData: BookingFormData;
    let pricing: PricingBreakdown;
    try {
      bookingData = JSON.parse(bookingDataStr);
      pricing = JSON.parse(pricingDataStr);
    } catch {
      setError('Booking data is corrupted. Please return to the booking form.');
      setLoading(false);
      return;
    }

    // Call API to create booking + Payment Intent
    fetch('/api/bookings/create-payment-intent', {
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
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setClientSecret(data.clientSecret);
        setBookingId(data.bookingId);
        setTotal(pricing.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error creating payment intent:', err);
        setError('Failed to initialize payment. Please try again.');
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600">Preparing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
        {error}
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563EB',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '0.5rem',
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <CheckoutForm bookingId={bookingId} total={total} />
    </Elements>
  );
}
