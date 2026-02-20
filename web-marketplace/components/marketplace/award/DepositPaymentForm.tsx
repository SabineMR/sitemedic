/**
 * Deposit Payment Form
 * Phase 35: Award Flow & Payment — Plan 02
 *
 * Embeds Stripe Payment Element for deposit collection.
 * Uses setup_future_usage to save card for later remainder charge.
 */

'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAwardCheckoutStore } from '@/stores/useAwardCheckoutStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DepositPaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const store = useAwardCheckoutStore();
  const [isLoading, setIsLoading] = useState(false);

  const isFormDisabled = !stripe || !elements || isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !store.clientSecret) return;

    setIsLoading(true);
    store.setProcessing(true);
    store.setStep('processing');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        store.setError(error.message || 'Payment declined. Please try another card.');
        toast.error('Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        store.setStep('success');
        toast.success('Deposit payment confirmed!');
      } else if (paymentIntent?.status === 'requires_action') {
        toast.info('Verifying payment. Please complete authentication.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
      store.setError(errorMsg);
      toast.error('Payment error');
    } finally {
      setIsLoading(false);
      store.setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between font-semibold text-primary">
          <span>Deposit ({store.depositPercent}%)</span>
          <span>£{store.depositAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Remainder (due after event)</span>
          <span>£{store.remainderAmount.toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isFormDisabled}
        size="lg"
        className="w-full"
      >
        {isLoading ? 'Processing...' : `Pay Deposit £${store.depositAmount.toFixed(2)}`}
      </Button>

      <div className="text-xs text-gray-500 space-y-1">
        <p>Your card will be saved securely for the remainder charge (due 14 days after event)</p>
        <p>You can update your payment method anytime in your dashboard</p>
      </div>
    </form>
  );
}
