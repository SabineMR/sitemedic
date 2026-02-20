/**
 * Award Confirmation Modal
 * Phase 35: Award Flow & Payment — Plan 02
 *
 * Multi-step modal: confirm → payment → processing → success | error
 * Client clicks "Award This Quote", sees payment breakdown, pays deposit via Stripe.
 */

'use client';

import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@/lib/stripe/client';
import { useAwardCheckoutStore } from '@/stores/useAwardCheckoutStore';
import { calculateAwardAmounts, getDepositPercentForEventType } from '@/lib/marketplace/award-calculations';
import PaymentBreakdownSection from './PaymentBreakdownSection';
import DepositPaymentForm from './DepositPaymentForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const stripePromise = loadStripe();

interface AwardConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  eventId: string;
  companyName: string;
  totalPrice: number;
  eventType: string;
  onSuccess?: () => void;
}

export default function AwardConfirmationModal({
  open,
  onOpenChange,
  quoteId,
  eventId,
  companyName,
  totalPrice,
  eventType,
  onSuccess,
}: AwardConfirmationModalProps) {
  const store = useAwardCheckoutStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize store when modal opens
  if (open && !isInitialized) {
    const depositPercent = getDepositPercentForEventType(eventType);
    store.initializeAward(quoteId, eventId, '', companyName, totalPrice, depositPercent);
    setIsInitialized(true);
  }

  // Reset when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      store.reset();
      setIsInitialized(false);
    }
    onOpenChange(newOpen);
  };

  const breakdown = calculateAwardAmounts(totalPrice, store.depositPercent);

  const handleProceedToPayment = async () => {
    store.setProcessing(true);

    try {
      const res = await fetch(`/api/marketplace/quotes/${quoteId}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          quoteId,
          depositPercent: store.depositPercent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error || 'Scheduling conflict detected');
        } else {
          toast.error(data.error || 'Failed to initiate award');
        }
        store.setProcessing(false);
        return;
      }

      store.setStripeData(data.customerId, data.clientSecret, data.paymentIntentId);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      store.setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Step: Confirm */}
        {store.step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Award Quote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are awarding this event to <span className="font-semibold">{companyName}</span>.
                A deposit payment is required to confirm the booking.
              </p>

              <PaymentBreakdownSection
                totalPrice={breakdown.totalPrice}
                depositPercent={breakdown.depositPercent}
                depositAmount={breakdown.depositAmount}
                remainderAmount={breakdown.remainderAmount}
                subtotal={breakdown.subtotal}
                vatAmount={breakdown.vatAmount}
              />

              <Button
                onClick={handleProceedToPayment}
                disabled={store.isProcessing}
                className="w-full"
                size="lg"
              >
                {store.isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Payment...
                  </>
                ) : (
                  `Proceed to Payment (£${breakdown.depositAmount.toFixed(2)})`
                )}
              </Button>

              <p className="text-xs text-gray-400 text-center">
                Other companies will be notified that they were not selected
              </p>
            </div>
          </>
        )}

        {/* Step: Payment */}
        {store.step === 'payment' && store.clientSecret && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  onClick={() => store.setStep('confirm')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Pay Deposit
              </DialogTitle>
            </DialogHeader>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: store.clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <DepositPaymentForm />
            </Elements>
          </>
        )}

        {/* Step: Processing */}
        {store.step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Processing your payment...</p>
          </div>
        )}

        {/* Step: Success */}
        {store.step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Booking Confirmed
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Your deposit of <span className="font-semibold">£{store.depositAmount.toFixed(2)}</span> has
                been processed. A confirmation email will be sent shortly.
              </p>
              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Deposit Paid</span>
                  <span className="font-semibold">£{store.depositAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Remainder Due</span>
                  <span>£{store.remainderAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Remainder will be charged 14 days after event completion.
                  You can manage your payment method in your dashboard.
                </p>
              </div>
              <Button
                onClick={() => {
                  handleOpenChange(false);
                  onSuccess?.();
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </>
        )}

        {/* Step: Error */}
        {store.step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Payment Failed
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {store.error || 'An error occurred during payment. Please try again.'}
              </p>
              <Button
                onClick={() => store.setStep('payment')}
                variant="outline"
                className="w-full"
              >
                Back to Payment
              </Button>
              <Button
                onClick={() => store.setStep('confirm')}
                variant="ghost"
                className="w-full"
              >
                Start Over
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
