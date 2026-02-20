/**
 * Award Checkout Zustand Store
 * Phase 35: Award Flow & Payment — Plan 01
 *
 * Manages the multi-step award checkout flow:
 *   confirm → payment → processing → success | error
 *
 * Pattern: follows existing Zustand store conventions (useQuoteFormStore, useJobWizardStore)
 */

import { create } from 'zustand';
import { calculateAwardAmounts } from '@/lib/marketplace/award-calculations';
import type { AwardCheckoutStep, AwardCheckoutState } from '@/lib/marketplace/award-types';

interface AwardCheckoutStore extends AwardCheckoutState {
  // Actions
  initializeAward: (
    quoteId: string,
    eventId: string,
    companyId: string,
    companyName: string,
    totalPrice: number,
    depositPercent: number
  ) => void;
  setStripeData: (customerId: string, clientSecret: string, paymentIntentId: string) => void;
  setStep: (step: AwardCheckoutStep) => void;
  setError: (error: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

const initialState: AwardCheckoutState = {
  step: 'confirm',
  quoteId: null,
  eventId: null,
  companyId: null,
  companyName: null,
  totalPrice: 0,
  depositPercent: 25,
  depositAmount: 0,
  remainderAmount: 0,
  stripeCustomerId: null,
  paymentMethodId: null,
  depositPaymentIntentId: null,
  clientSecret: null,
  clientEmail: '',
  clientName: '',
  clientPhone: '',
  isProcessing: false,
  error: null,
};

export const useAwardCheckoutStore = create<AwardCheckoutStore>((set) => ({
  ...initialState,

  initializeAward: (quoteId, eventId, companyId, companyName, totalPrice, depositPercent) => {
    const breakdown = calculateAwardAmounts(totalPrice, depositPercent);
    set({
      quoteId,
      eventId,
      companyId,
      companyName,
      totalPrice,
      depositPercent,
      depositAmount: breakdown.depositAmount,
      remainderAmount: breakdown.remainderAmount,
      step: 'confirm',
      error: null,
      isProcessing: false,
    });
  },

  setStripeData: (customerId, clientSecret, paymentIntentId) =>
    set({
      stripeCustomerId: customerId,
      clientSecret,
      depositPaymentIntentId: paymentIntentId,
      step: 'payment',
    }),

  setStep: (step) => set({ step }),

  setError: (error) => set(error ? { error, step: 'error' as const } : { error: null }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  reset: () => set(initialState),
}));
