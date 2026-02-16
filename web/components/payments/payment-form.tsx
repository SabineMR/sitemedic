/**
 * Payment Form with Stripe Elements
 * Phase 6.5: Generic payment form component for prepay bookings
 */

'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';

const stripePromise = loadStripe();

interface PaymentFormProps {
  bookingId: string;
  amount: number;
  clientId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

/**
 * Inner payment form component with Stripe hooks
 */
function PaymentElementForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/book/confirmation`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setErrorMessage(submitError.message || 'Payment failed');
        onError(submitError.message || 'Payment failed');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded without redirect
        onSuccess(paymentIntent.id);
      }
      // If redirect happened, user will be redirected to return_url
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError(errorMsg);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-700">Total Amount:</span>
          <span className="text-2xl font-bold text-blue-600">
            £{amount.toFixed(2)}
          </span>
        </div>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || processing}
        size="lg"
      >
        {processing ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing payment...</span>
          </div>
        ) : (
          `Pay £${amount.toFixed(2)} and Confirm Booking`
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        Your payment is secure and encrypted. We use Stripe for payment processing.
        3D Secure authentication may be required.
      </p>
    </form>
  );
}

/**
 * Main PaymentForm component
 * Fetches client secret and renders Stripe Elements
 */
export function PaymentForm({
  bookingId,
  amount,
  clientId,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch client secret from API
    async function fetchClientSecret() {
      try {
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            amount,
            clientId,
          }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to initialize payment');
        }

        setClientSecret(data.clientSecret);
        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMsg);
        onError(errorMsg);
        setLoading(false);
      }
    }

    fetchClientSecret();
  }, [bookingId, amount, clientId, onError]);

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

  if (error || !clientSecret) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>{error || 'Failed to initialize payment'}</p>
        </div>
      </div>
    );
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
      <PaymentElementForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
