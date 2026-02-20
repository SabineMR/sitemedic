# Phase 35: Award Flow & Payment — Research

**Researched:** 2026-02-20
**Domain:** Stripe payment processing (PaymentIntent + SetupIntent), off-session charge automation, marketplace booking creation, medic commission payouts
**Confidence:** HIGH

## Summary

Phase 35 implements the award-to-payment flow where clients deposit a percentage of their chosen quote via Stripe, triggering automatic SiteMedic booking creation. The system must collect payment details once (for both deposit and future remainder), charge the deposit immediately via PaymentIntent, and charge the remainder after event completion via off-session PaymentIntent. Failed remainder charges must retry automatically (3 attempts over 7 days) per Stripe Smart Retries patterns. Commission deducts from the total using the existing platform_fee_percent/medic_payout_percent, and payouts follow the existing friday-payout Edge Function pipeline via Stripe Connect Transfers.

The key technical challenge is two-stage payment architecture: embed Stripe Elements for deposit collection (saving the payment method for future use), then schedule automated remainder charges weeks later. This differs from simple checkout because the second charge happens off-session when the customer is not present, requiring SetupIntent to establish stored payment method consent.

**Primary recommendation:** Use Stripe Payment Element with `setup_future_usage: 'off_session'` during deposit to save the card. Create separate PaymentIntents for deposit (confirm immediately) and remainder (create at event completion, confirm with `off_session: true`). Schedule remainder charges via pg_cron calling an Edge Function on day 14 post-event. Store payment method references (customer_id, payment_method_id) in a new `marketplace_booking_payments` table to track deposit/remainder lifecycle. Use Stripe Smart Retries (8 retries over 2 weeks) for remainder charge recovery rather than custom retry logic.

---

## Standard Stack

### Core Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@stripe/stripe-js` | `^8.7.0` | Stripe.js SDK (client-side) | Already in codebase; required for Payment Element and off-session setup |
| `@stripe/react-stripe-js` | `^5.6.0` | React hooks (useStripe, useElements) | Already in codebase; thin wrapper for React integration |
| `stripe` | `^20.3.1` | Node.js SDK (server-side) | Already in codebase; creates PaymentIntents, Customers, SetupIntents |
| `zod` | `^4.3.6` | Schema validation | Already in codebase (v4.3.6); validates payment form data |
| `zustand` | `^5.0.11` | State management (checkout flow) | Already in codebase; manages multi-step award confirmation + payment form state |
| `@tanstack/react-query` | `^5.90.21` | Fetch hooks | Already in codebase; handles polling for payment confirmation |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | `^2.0.7` | Toast notifications | Already in codebase; payment success/error feedback |
| `lucide-react` | `^latest` | Icons (lock, check, alert) | Already in codebase; payment security indicators |
| `shadcn/ui` | `^latest` | Modal, button, form components | Already in codebase; award confirmation modal + payment form |

### Edge Functions & Async
| Component | Purpose | How to Use |
|-----------|---------|-----------|
| `pg_cron` | Scheduled remainder charges | Enable in migration; schedule Edge Function call at `CURRENT_DATE + 14 days` for each booking |
| Supabase Edge Functions | Remainder charge processor + failure email | Create `charge-remainder-payment/index.ts` + update email templates |
| Resend API | Email notifications | Already configured in `supabase/functions/_shared/email-templates.ts` |

### No New Packages Required

All required Stripe and React libraries are already installed. The phase uses existing patterns from Phase 34.1 (direct jobs payment) and extends them for remainder auto-charge.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two separate PaymentIntents | Single PaymentIntent with authorize-then-capture | PaymentIntent authorize (on_session) only holds card for 7 days. For 14+ day remainder, must use separate intent. Two intents is the correct pattern per Stripe docs. |
| SetupIntent + later PaymentIntent | Single PaymentIntent with setup_future_usage | Single intent requires you to confirm it immediately. SetupIntent is cleaner for "save for later" without charging now. Phase 35 uses setup_future_usage during deposit charge, combining both in one intent. |
| pg_cron for scheduling | Manual HTTP cron service (e.g., EasyCron) | pg_cron is built into Supabase; no external service needed. More reliable for multi-tenant isolation. |
| Stripe Smart Retries | Custom retry logic (e.g., Node.js job queue) | Smart Retries uses AI to find optimal retry times, respects card network limits (Visa 15/month, Mastercard 35), handles multiple payment methods. Custom logic is harder to maintain and risks fines. |
| Stripe PaymentIntent for remainder | Stripe Charge API | PaymentIntent is modern and required for 3D Secure / SCA handling in UK. Charge API is legacy. |

---

## Architecture Patterns

### Recommended Project Structure

```
web/
├── lib/
│   ├── booking/
│   │   ├── award-schemas.ts           # Zod schemas for award confirmation, payment form
│   │   ├── award-calculations.ts      # Deposit % calculation, remainder amount logic
│   │   └── award-types.ts             # Types: AwardRequest, PaymentBreakdown, etc
│   ├── stripe/
│   │   ├── server.ts                  # Already exists; Stripe instance
│   │   ├── client.ts                  # NEW: loadStripe() for client-side
│   │   └── payment-intent-handler.ts  # NEW: Helper functions for PI create/confirm
│   ├── queries/
│   │   └── marketplace/
│   │       └── booking-payments.ts    # React Query hooks for payment state
│   └── stores/
│       └── useAwardCheckoutStore.ts   # NEW: Zustand store for award flow
├── components/
│   └── marketplace/
│       ├── award/
│       │   ├── AwardConfirmationModal.tsx      # "Award this quote" modal with deposit amount
│       │   ├── PaymentBreakdownSection.tsx     # Quote total, deposit %, remainder, VAT
│       │   ├── DepositPaymentForm.tsx          # Embedded Payment Element
│       │   └── PaymentMethodManager.tsx        # Client dashboard: view/update saved card
│       └── quote-detail/
│           └── QuoteDetailPage.tsx             # Add award button and payment flow
├── app/api/
│   └── marketplace/
│       ├── quotes/[id]/award/route.ts          # POST: Award quote, create PaymentIntent
│       ├── payments/deposit/confirm/route.ts   # POST: Confirm deposit PI (webhook handler)
│       └── payments/remainder/route.ts         # POST: Create remainder PI for already-saved card
└── supabase/functions/
    ├── charge-remainder-payment/index.ts       # NEW: Scheduled job for day 14 remainder charge
    ├── charge-remainder-retry/index.ts         # NEW: Retry handler for failed remainder (day 1, 3, 7)
    └── _shared/email-templates.ts              # Update with deposit receipt + remainder notifications
```

### Pattern 1: Award Confirmation with Deposit PaymentIntent

**What:** Client confirms award selection, system creates PaymentIntent for deposit, saves payment method with `setup_future_usage: 'off_session'`, confirms payment on client side.
**When to use:** On award button click → modal → payment form → confirmation.
**Key insight:** Use a single PaymentIntent with `setup_future_usage` to both charge the deposit AND save the card in one API call. This reduces friction (no separate SetupIntent needed) while ensuring off-session consent is captured.

```typescript
// web/lib/stripe/payment-intent-handler.ts

import Stripe from 'stripe';

export interface CreateDepositPaymentIntentParams {
  customerId: string;              // Stripe Customer (create if missing)
  amount: number;                  // Deposit amount in GBP
  currency: string;                // 'gbp'
  eventId: string;                 // Marketplace event ID
  quoteId: string;                 // Marketplace quote ID
  clientEmail: string;
  clientName: string;
}

export async function createDepositPaymentIntent(
  stripe: Stripe,
  params: CreateDepositPaymentIntentParams
) {
  const {
    customerId,
    amount,
    eventId,
    quoteId,
    clientEmail,
    clientName,
  } = params;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100), // GBP to pence
      currency: 'gbp',
      customer: customerId,
      // Key: save card for off-session remainder charge
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Marketplace deposit for event ${eventId}`,
      metadata: {
        event_id: eventId,
        quote_id: quoteId,
        payment_type: 'deposit',
        client_email: clientEmail,
        client_name: clientName,
      },
      receipt_email: clientEmail,
    },
    {
      // Idempotency: same event + quote = same payment intent
      idempotencyKey: `pi_deposit_${quoteId}_${Date.now()}`,
    }
  );

  return paymentIntent;
}

export interface CreateRemainderPaymentIntentParams {
  customerId: string;              // Stripe Customer
  paymentMethodId: string;          // Saved payment method from deposit
  amount: number;                   // Remainder amount
  currency: string;
  eventId: string;
  bookingId: string;               // The created booking (from deposit webhook)
  clientEmail: string;
}

/**
 * Create remainder PaymentIntent for off-session charging
 * Called 14 days after event completion
 * Confirms with off_session: true (customer not present)
 */
export async function createRemainderPaymentIntent(
  stripe: Stripe,
  params: CreateRemainderPaymentIntentParams
) {
  const {
    customerId,
    paymentMethodId,
    amount,
    eventId,
    bookingId,
    clientEmail,
  } = params;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100),
      currency: 'gbp',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true, // Critical: customer not present, using saved method
      confirm: true,     // Immediately attempt charge
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Marketplace remainder for booking ${bookingId}`,
      metadata: {
        event_id: eventId,
        booking_id: bookingId,
        payment_type: 'remainder',
      },
      receipt_email: clientEmail,
    },
    {
      idempotencyKey: `pi_remainder_${bookingId}`,
    }
  );

  return paymentIntent;
}
```

### Pattern 2: Zustand Store for Award Flow

**What:** Manages award confirmation modal state, payment form state, and checkout progression.
**When to use:** Coordinate between quote detail page, award modal, and payment form.

```typescript
// web/stores/useAwardCheckoutStore.ts

import { create } from 'zustand';

interface AwardCheckoutState {
  // Current step in flow
  step: 'confirm' | 'payment' | 'processing' | 'success' | 'error';

  // Quote/event data
  quoteId: string | null;
  eventId: string | null;
  companyId: string | null;

  // Payment calculation
  totalPrice: number;
  depositPercent: number;
  depositAmount: number;
  remainderAmount: number;

  // Stripe data
  stripeCustomerId: string | null;
  paymentMethodId: string | null; // Saved after deposit
  depositPaymentIntentId: string | null;
  clientSecret: string | null;

  // Form state
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  cardholderName: string;

  // Loading/error
  isProcessing: boolean;
  error: string | null;

  // Actions
  initializeAward: (quoteId: string, eventId: string, totalPrice: number) => void;
  setDepositPercent: (percent: number) => void;
  setClientDetails: (email: string, name: string, phone: string) => void;
  setCardholderName: (name: string) => void;
  setStripeData: (customerId: string, secret: string, intentId: string) => void;
  setPaymentMethodId: (methodId: string) => void;
  setStep: (step: AwardCheckoutState['step']) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useAwardCheckoutStore = create<AwardCheckoutState>((set) => ({
  step: 'confirm',
  quoteId: null,
  eventId: null,
  companyId: null,
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
  cardholderName: '',
  isProcessing: false,
  error: null,

  initializeAward: (quoteId, eventId, totalPrice) => {
    const depositPercent = 25; // TODO: fetch from event type settings
    const depositAmount = parseFloat((totalPrice * (depositPercent / 100)).toFixed(2));
    const remainderAmount = parseFloat((totalPrice - depositAmount).toFixed(2));

    set({
      quoteId,
      eventId,
      totalPrice,
      depositPercent,
      depositAmount,
      remainderAmount,
      step: 'confirm',
      error: null,
    });
  },

  setDepositPercent: (percent) => set((state) => {
    const depositAmount = parseFloat((state.totalPrice * (percent / 100)).toFixed(2));
    return {
      depositPercent: percent,
      depositAmount,
      remainderAmount: parseFloat((state.totalPrice - depositAmount).toFixed(2)),
    };
  }),

  setClientDetails: (email, name, phone) => set({
    clientEmail: email,
    clientName: name,
    clientPhone: phone,
  }),

  setCardholderName: (name) => set({ cardholderName: name }),

  setStripeData: (customerId, secret, intentId) => set({
    stripeCustomerId: customerId,
    clientSecret: secret,
    depositPaymentIntentId: intentId,
    step: 'payment',
  }),

  setPaymentMethodId: (methodId) => set({ paymentMethodId: methodId }),

  setStep: (step) => set({ step }),

  setError: (error) => set({ error, step: 'error' }),

  reset: () => set({
    step: 'confirm',
    quoteId: null,
    eventId: null,
    totalPrice: 0,
    depositAmount: 0,
    remainderAmount: 0,
    stripeCustomerId: null,
    paymentMethodId: null,
    clientSecret: null,
    clientEmail: '',
    clientName: '',
    cardholderName: '',
    isProcessing: false,
    error: null,
  }),
}));
```

### Pattern 3: React Stripe.js Payment Element Component

**What:** Embeds Stripe Payment Element in a React component, handles form submission and confirmation.
**When to use:** In award checkout modal after confirmation.

```typescript
// web/components/marketplace/award/DepositPaymentForm.tsx

'use client';

import { useEffect, useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAwardCheckoutStore } from '@/stores/useAwardCheckoutStore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function DepositPaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const store = useAwardCheckoutStore();
  const [isLoading, setIsLoading] = useState(false);

  // Disable submit until Stripe loads
  const isFormDisabled = !stripe || !elements || isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);
    store.setError('');

    try {
      // Confirm the deposit payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: store.clientSecret!,
        redirect: 'if_required', // Don't redirect; handle response here
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/checkout/success`,
        },
      });

      if (error) {
        // Payment failed
        store.setError(error.message || 'Payment declined. Please try another card.');
        toast.error('Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        // Payment succeeded
        store.setStep('success');
        toast.success('Deposit payment confirmed! Booking created.');

        // Payment intent webhook will create booking and send confirmation email
        // The payment method is already saved for remainder charge
      } else if (paymentIntent?.status === 'requires_action') {
        // 3D Secure or other authentication required
        // Stripe handles this automatically with Payment Element
        toast.info('Verifying payment. Please complete authentication.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
      store.setError(errorMsg);
      toast.error('Payment error');
    } finally {
      setIsLoading(false);
    }
  };

  const stripeOptions = {
    clientSecret: store.clientSecret,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
        {store.clientSecret ? (
          <PaymentElement options={{ layout: 'tabs' }} />
        ) : (
          <div className="bg-gray-50 p-4 rounded text-gray-500">
            Loading payment form...
          </div>
        )}
      </div>

      {store.error && (
        <Alert variant="destructive">
          <AlertDescription>{store.error}</AlertDescription>
        </Alert>
      )}

      {/* Payment breakdown summary */}
      <div className="bg-gray-50 p-4 rounded space-y-2">
        <div className="flex justify-between">
          <span>Quote Total:</span>
          <span className="font-semibold">£{store.totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Deposit ({store.depositPercent}%):</span>
          <span className="font-semibold text-primary">£{store.depositAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Remainder (due after event):</span>
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

      {/* Terms acceptance */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          ✓ Your card will be saved securely for the remainder charge (due 14 days after event)
        </p>
        <p>✓ You can update your payment method anytime in your dashboard</p>
      </div>
    </form>
  );
}
```

### Pattern 4: API Route for Award + Deposit PaymentIntent Creation

**What:** Backend endpoint that validates award, creates Stripe Customer if needed, creates PaymentIntent, and returns clientSecret.
**When to use:** Called when user confirms award before payment form appears.

```typescript
// web/app/api/marketplace/quotes/[id]/award/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { createDepositPaymentIntent } from '@/lib/stripe/payment-intent-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AwardRequestBody {
  eventId: string;
  depositPercent?: number; // Defaults to 25
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;
    const body: AwardRequestBody = await request.json();
    const { eventId, depositPercent = 25 } = body;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('marketplace_quotes')
      .select('id, event_id, total_price, company_id')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // 2. Fetch event and verify ownership (event poster)
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, total_price, event_name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to award this event' }, { status: 403 });
    }

    // 3. Check EXCLUSION constraints if quote has named medics
    // (Claude's discretion: hybrid overbooking check)
    // TODO: Implement EXCLUSION constraint check

    // 4. Create or fetch Stripe Customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, phone, stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || 'Client',
        metadata: {
          user_id: user.id,
          event_id: eventId,
        },
      });
      customerId = customer.id;

      // Save customer ID for future use
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Calculate deposit amount
    const depositAmount = parseFloat((quote.total_price * (depositPercent / 100)).toFixed(2));

    // 6. Create PaymentIntent with setup_future_usage for off-session remainder
    const paymentIntent = await createDepositPaymentIntent(stripe, {
      customerId,
      amount: depositAmount,
      currency: 'gbp',
      eventId,
      quoteId,
      clientEmail: profile?.email || user.email!,
      clientName: profile?.full_name || 'Client',
    });

    // 7. Return client secret for frontend to confirm
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId,
      depositAmount,
      remainderAmount: quote.total_price - depositAmount,
    });
  } catch (error) {
    console.error('[Award Payment] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Pattern 5: Deposit Payment Webhook Handler

**What:** Stripe webhook endpoint that confirms deposit succeeded, creates booking, saves payment method reference, and schedules remainder charge.
**When to use:** Webhook triggered by Stripe when deposit PaymentIntent succeeds.

```typescript
// web/app/api/stripe/webhooks/route.ts (update existing)

case 'payment_intent.succeeded': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentType = paymentIntent.metadata?.payment_type;

  if (paymentType === 'deposit') {
    // === DEPOSIT SUCCEEDED ===
    const eventId = paymentIntent.metadata?.event_id;
    const quoteId = paymentIntent.metadata?.quote_id;
    const clientEmail = paymentIntent.metadata?.client_email;

    if (!eventId || !quoteId) {
      console.error('Deposit webhook missing event_id or quote_id');
      return NextResponse.json({ received: true });
    }

    // 1. Fetch quote to get winning company
    const { data: quote } = await supabase
      .from('marketplace_quotes')
      .select('company_id, total_price, event_id, pricing_breakdown, staffing_plan')
      .eq('id', quoteId)
      .single();

    if (!quote) {
      console.error('Quote not found for deposit', { quoteId });
      return NextResponse.json({ received: true });
    }

    // 2. Create SiteMedic booking
    const depositAmount = (quote.total_price * 0.25); // TODO: use actual deposit %
    const remainderAmount = quote.total_price - depositAmount;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        // Map from marketplace_event + marketplace_quote
        event_id: eventId,
        source: 'marketplace',
        status: 'confirmed', // Deposit paid = confirmed booking
        total: quote.total_price,
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        remainder_due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        stripe_customer_id: paymentIntent.customer,
        stripe_payment_method_id: paymentIntent.payment_method,
        deposit_payment_intent_id: paymentIntent.id,
        // ... other booking fields from quote
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Failed to create booking from deposit', bookingError);
      return NextResponse.json({ received: true });
    }

    // 3. Update quote status to 'awarded'
    await supabase
      .from('marketplace_quotes')
      .update({ status: 'awarded', awarded_at: new Date() })
      .eq('id', quoteId);

    // 4. Reject other quotes on this event
    await supabase
      .from('marketplace_quotes')
      .update({ status: 'rejected', rejected_reason: 'Another quote was selected' })
      .eq('event_id', eventId)
      .neq('id', quoteId)
      .eq('status', 'submitted');

    // 5. Send confirmation emails
    // - Email to winning company: "You've been awarded! Client contact: ..."
    // - Email to client: Deposit receipt + what happens next
    // - Email to rejected companies: "Your quote wasn't selected"

    // 6. Schedule remainder charge (pg_cron will pick this up)
    // This is handled via a database trigger or the Edge Function scheduler

    break;
  }

  if (paymentType === 'remainder') {
    // === REMAINDER SUCCEEDED ===
    const bookingId = paymentIntent.metadata?.booking_id;

    if (!bookingId) {
      console.error('Remainder webhook missing booking_id');
      return NextResponse.json({ received: true });
    }

    // Update booking to 'paid_remainder'
    await supabase
      .from('bookings')
      .update({
        remainder_payment_intent_id: paymentIntent.id,
        remainder_paid_at: new Date(),
      })
      .eq('id', bookingId);

    // Trigger payout pipeline (friday-payout will include this booking)
    // Send email to client: "Remainder charged successfully"

    break;
  }

  break;
}

case 'payment_intent.payment_failed': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentType = paymentIntent.metadata?.payment_type;

  if (paymentType === 'remainder') {
    // === REMAINDER FAILED ===
    // Stripe Smart Retries will automatically retry (day 1, 3, 7)
    // We don't need custom retry logic
    // But we should send email to client: "Payment failed, we'll retry. You can update your card here: ..."

    const bookingId = paymentIntent.metadata?.booking_id;
    const clientEmail = paymentIntent.metadata?.client_email;

    // Send email to client with link to update payment method
    // TODO: Call email function

    // Update booking to track failed attempts
    // TODO: increment remainder_failed_attempts counter

    break;
  }

  break;
}
```

### Pattern 6: pg_cron Schedule for Remainder Charge (14 days post-event)

**What:** Database-level cron job that triggers an Edge Function to charge saved payment methods.
**When to use:** Every day, the cron checks for bookings where remainder is due and schedules the charge.

```sql
-- In migration file: 149_marketplace_award_payment.sql

-- Enable pg_cron (already done in earlier migrations)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check for due remainders at 8 AM UTC
SELECT cron.schedule(
  'charge-marketplace-remainders',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_SUPABASE_URL/functions/v1/charge-remainder-payment',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:=json_build_object(
        'action', 'charge_due_remainders',
        'timestamp', NOW()
      )
    ) AS request_id;
  $$
);

COMMENT ON SCHEMA public IS 'Migration 149: Daily remainder charge scheduler (8 AM UTC)';
```

### Pattern 7: Edge Function for Remainder Charge Automation

**What:** Scheduled Edge Function that queries bookings with due remainders and creates PaymentIntents.
**When to use:** Called daily by pg_cron; finds bookings where remainder_due_at <= TODAY and remainder_paid_at IS NULL.

```typescript
// supabase/functions/charge-remainder-payment/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe } from '../_shared/stripe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const startTime = Date.now();
    console.log('🚀 Marketplace Remainder Charge job started at', new Date().toISOString());

    // Find all bookings where remainder is due today and not yet paid
    const { data: dueBookings, error: queryError } = await supabase
      .from('bookings')
      .select('id, stripe_customer_id, stripe_payment_method_id, remainder_amount, event_id')
      .eq('source', 'marketplace')
      .lte('remainder_due_at', new Date().toISOString())
      .is('remainder_paid_at', null)
      .is('remainder_payment_intent_id', null);

    if (queryError) {
      console.error('❌ Error fetching due bookings:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch due bookings' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dueBookings || dueBookings.length === 0) {
      console.log('ℹ️ No remainder charges due today');
      return new Response(
        JSON.stringify({ processed: 0, success: 0, failed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${dueBookings.length} bookings with due remainders`);

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of dueBookings) {
      try {
        // Create PaymentIntent for remainder (off-session charge)
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: Math.round(booking.remainder_amount * 100), // GBP to pence
            currency: 'gbp',
            customer: booking.stripe_customer_id,
            payment_method: booking.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            description: `Marketplace remainder for booking ${booking.id}`,
            metadata: {
              booking_id: booking.id,
              event_id: booking.event_id,
              payment_type: 'remainder',
            },
          },
          {
            idempotencyKey: `pi_remainder_${booking.id}`,
          }
        );

        console.log(`✅ Remainder charge created for booking ${booking.id}: ${paymentIntent.id}`);

        // Store the remainder PaymentIntent ID
        await supabase
          .from('bookings')
          .update({ remainder_payment_intent_id: paymentIntent.id })
          .eq('id', booking.id);

        successCount++;
      } catch (error) {
        console.error(`❌ Failed to charge remainder for booking ${booking.id}:`, error);
        failedCount++;
        errors.push({
          bookingId: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Stripe Smart Retries will handle retries automatically
        // But we should update booking to track failed attempts
        await supabase
          .from('bookings')
          .update({
            remainder_failed_attempts: 1,
            remainder_last_failed_at: new Date(),
          })
          .eq('id', booking.id);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `✅ Remainder charge job completed in ${elapsed}ms: ${successCount} success, ${failedCount} failed`
    );

    return new Response(
      JSON.stringify({
        processed: dueBookings.length,
        success: successCount,
        failed: failedCount,
        errors,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Anti-Patterns to Avoid

- **Two Stripe Intents without setup_future_usage:** Using authorize-then-capture or a single intent won't work for remainder charges 14+ days later. Use setup_future_usage during deposit.
- **Custom retry logic for failed remainder charges:** Don't build your own retry scheduler. Stripe Smart Retries is battle-tested, respects card network limits, uses AI timing. Use it.
- **No idempotency keys on PaymentIntents:** Always use `idempotencyKey` to prevent duplicate charges on network retries.
- **Charging without `off_session: true` flag:** If customer isn't present, always set off_session. Stripe uses this to optimize SCA handling.
- **Storing payment method details in your database:** Never store card details. Store Stripe customer_id and payment_method_id only. Stripe handles encryption.
- **Missing EXCLUSION constraint check at award time:** If named medics are specified and they have scheduling conflicts, the award should fail. Use hybrid check (named medics + EXCLUSION) before creating booking.
- **Not sending email confirmation after deposit:** Client needs receipt + confirmation that remainder will be charged on date X at time Y.
- **Charging remainder immediately instead of waiting for event completion:** Phase 35 specifies "Net 14 days after event completion." Don't charge early.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Off-session payment retry logic | Custom scheduler + job queue | Stripe Smart Retries | Respects Visa (15 retries/month) and Mastercard (35 retries/month) limits; uses AI timing; built-in dunning emails |
| Payment method storage | In-database encryption | Stripe Customer + PaymentMethod | PCI DSS compliance is Stripe's responsibility; you avoid security liability |
| Scheduled remainder charging | Node.js Bull queues or external cron | pg_cron + Edge Function | Built into Postgres; multi-tenant isolation; no external service dependency |
| Payment form validation | Manual regex on card fields | Stripe Payment Element | Validates all 100+ payment methods; handles 3D Secure; reduces fraud |
| Customer consent management | Checkbox in your UI | Stripe SetupIntent + receipt email | Legally defensible; Stripe logs consent for audits |
| Card expiry/decline handling | Custom error messages | Stripe decline codes + Smart Retries | Network-aware error codes; automatic recovery with optimal timing |
| Deposit + remainder state tracking | Multiple flags in bookings | marketplace_booking_payments table | Single source of truth for payment lifecycle; easier auditing |
| Email notifications for payment failures | Manual email templates | Stripe Smart Retries dunning | Configured in Stripe Dashboard; compliant with regulations; automatic frequency limiting |

---

## Common Pitfalls

### Pitfall 1: Using Single PaymentIntent for Deposit + Remainder

**What goes wrong:** Developer creates one PaymentIntent, charges it immediately, then tries to charge it again 14 days later. Second charge fails because intent is already succeeded.
**Why it happens:** Stripe docs mention "setup_future_usage" in context of subscriptions, not one-time later charges. Confusion about when to use separate intents.
**How to avoid:** Use SEPARATE PaymentIntents: (1) Deposit intent with `setup_future_usage: 'off_session'` confirmed immediately, (2) Remainder intent created 14 days later, confirmed off-session. Test by checking the deposit PI status before creating remainder PI.
**Warning signs:** Webhook shows "cannot charge succeeded payment intent" error on remainder attempt.

### Pitfall 2: Missing `off_session: true` on Remainder Charge

**What goes wrong:** Remainder charge fails with SCA (Strong Customer Authentication) challenge that customer can't complete because they're not present. Payment marked failed; customer confused.
**Why it happens:** Developer assumes Stripe knows this is off-session and handles it automatically. Stripe needs the explicit flag.
**How to avoid:** Always set `off_session: true` when customer isn't present to complete authentication.
**Warning signs:** Remainder charge failures say "requires authentication" but customer never receives email/notification to authenticate.

### Pitfall 3: No Idempotency Key on PaymentIntents

**What goes wrong:** Network glitch causes Edge Function to retry remainder charge. Two identical PaymentIntents created, customer charged twice.
**Why it happens:** Idempotency keys seem optional in Stripe docs.
**How to avoid:** Always include `idempotencyKey` (e.g., `pi_remainder_${bookingId}`). Test by manually triggering the Edge Function twice for the same booking.
**Warning signs:** Customer charged £X twice within seconds; duplicate payment intents in Stripe dashboard.

### Pitfall 4: Charging Remainder Before Event Completion

**What goes wrong:** Phase 35 specifies "Net 14 days after event completion" but Edge Function uses booking creation date. Charge fires before event happens.
**Why it happens:** Remainder_due_at calculated from booking.created_at instead of booking.completed_at or event.actual_end_time.
**How to avoid:** Schedule remainder based on event completion, not booking creation. Add `event_completed_at` column to bookings. Only charge if event is marked completed.
**Warning signs:** Client complains about being charged before event happened.

### Pitfall 5: Not Sending Payment Confirmation Email After Deposit

**What goes wrong:** Client pays deposit but hears nothing. Doesn't know if payment succeeded or if remainder will be charged.
**Why it happens:** Webhook handler creates booking but forgets to send email.
**How to avoid:** Use Stripe receipt email (automatic) + send custom email with: deposit amount, remainder amount, due date, and link to update payment method.
**Warning signs:** Client support gets "Did my payment go through?" tickets.

### Pitfall 6: No Email on Remainder Charge Failure

**What goes wrong:** Remainder charge fails; customer never notified. Believes booking is paid; company waits for medic who doesn't show because booking is unpaid.
**Why it happens:** Webhook handler only logs the failure, doesn't notify customer.
**How to avoid:** Send email on payment_intent.payment_failed if payment_type='remainder'. Include link to update card in your dashboard.
**Warning signs:** Medics arrive to unpaid bookings; customers confused about payment status.

### Pitfall 7: Not Checking EXCLUSION Constraints at Award Time

**What goes wrong:** Quote specifies "John (paramedic) + Jane (paramedic)" but John is already booked during the event date. System creates booking with unavailable medics.
**Why it happens:** Award flow only checks quote existence, not scheduling conflicts.
**How to avoid:** Hybrid check: if quote.staffing_plan.type === 'named_medics', check medic_commitments for EXCLUSION conflicts before awarding. If conflict found, reject award with message "John is unavailable on this date."
**Warning signs:** Named medic no-shows because they were double-booked.

### Pitfall 8: No Company Details Sent to Winning Company

**What goes wrong:** Winning company receives "You've been awarded!" email but can't see client contact details.
**Why it happens:** CONTEXT says "full client details revealed on award" but implementation skips it.
**How to avoid:** Fetch client contact from marketplace_events.posted_by, include name/email/phone in award email AND in dashboard event detail page.
**Warning signs:** Winning company can't contact client to coordinate.

### Pitfall 9: Rejected Companies Still Receive Notifications

**What goes wrong:** All companies get an email saying "You were selected!" even those not selected.
**Why it happens:** Email sent to all companies before filtering for winning quote.
**How to avoid:** Send "awarded" email only to winning company_id. Send "not selected" email (optional) to all others, but mark as separate notification type.
**Warning signs:** Companies get conflicting notifications.

### Pitfall 10: Deposit Percent Not Configurable by Vertical

**What goes wrong:** Construction events require 50% deposit but system always charges 25%.
**Why it happens:** Hard-coded 25% in code; no lookup by event type.
**How to avoid:** Add `deposit_percent` column to marketplace_events or store in event_type settings. Query it before calculating deposit amount.
**Warning signs:** Admin complains that deposit % doesn't match contract terms.

### Pitfall 11: Payment Method Manager Not Accessible to Client

**What goes wrong:** Client's card is declined; remainder charge fails. Client can't update card because they don't know where to go.
**Why it happens:** No dashboard page to manage saved payment methods.
**How to avoid:** Add "Payment Methods" page in client dashboard. Display Stripe customer's saved cards. Allow add/update/delete. Link from failure email.
**Warning signs:** Client support gets "How do I update my card?" questions.

### Pitfall 12: No Booking Status to Distinguish "Deposit Paid" from "Remainder Paid"

**What goes wrong:** System treats deposit-paid and fully-paid bookings the same. Can't distinguish in reports.
**Why it happens:** Booking status is just "confirmed". No granularity for payment stages.
**How to avoid:** Use status values like 'confirmed' (deposit paid) and add flags: `remainder_paid_at`, `remainder_payment_intent_id`. Or use finer status: 'deposit_paid' / 'remainder_charged'.
**Warning signs:** Reports can't show "bookings pending remainder collection."

---

## Code Examples

### Complete Award Flow: Client to Payment to Booking

```typescript
// web/app/marketplace/events/[eventId]/quotes/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import AwardConfirmationModal from '@/components/marketplace/award/AwardConfirmationModal';
import DepositPaymentForm from '@/components/marketplace/award/DepositPaymentForm';

// Initialize Stripe once
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function QuoteListPage({ params }: { params: { eventId: string } }) {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Fetch quotes for this event
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes', params.eventId],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace/quotes/list?eventId=${params.eventId}`);
      return res.json();
    },
  });

  const handleAwardClick = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setShowAwardModal(true);
  };

  if (isLoading) return <div>Loading quotes...</div>;

  return (
    <div>
      {/* Quote list */}
      {quotes?.quotes.map((quote) => (
        <div key={quote.id} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold">{quote.company_name}</h3>
              <p className="text-lg font-bold">£{quote.total_price.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleAwardClick(quote.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Award This Quote
            </button>
          </div>
        </div>
      ))}

      {/* Award Modal with Stripe Payment Element */}
      {showAwardModal && selectedQuoteId && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: '', // Will be set after confirmation
            appearance: { theme: 'stripe' },
          }}
        >
          <AwardConfirmationModal
            quoteId={selectedQuoteId}
            eventId={params.eventId}
            onClose={() => setShowAwardModal(false)}
          />
        </Elements>
      )}
    </div>
  );
}
```

---

## Database Schema Changes Required

Phase 35 requires migrations to track payment details and link bookings to Stripe objects:

```sql
-- Migration 149: Marketplace Award & Payment Flow

-- 1. Add payment-related columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS (
  source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'marketplace')),
  deposit_amount DECIMAL(10, 2),
  remainder_amount DECIMAL(10, 2),
  remainder_due_at TIMESTAMPTZ,
  remainder_paid_at TIMESTAMPTZ,
  remainder_failed_attempts INT DEFAULT 0,
  remainder_last_failed_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  deposit_payment_intent_id TEXT UNIQUE,
  remainder_payment_intent_id TEXT UNIQUE
);

CREATE INDEX idx_bookings_source ON bookings(source);
CREATE INDEX idx_bookings_remainder_due_at ON bookings(remainder_due_at);
CREATE INDEX idx_bookings_stripe_customer ON bookings(stripe_customer_id);
CREATE INDEX idx_bookings_remainder_paid_at ON bookings(remainder_paid_at);

-- 2. New table to track marketplace award history (for auditing)
CREATE TABLE marketplace_award_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  winning_quote_id UUID NOT NULL REFERENCES marketplace_quotes(id) ON DELETE CASCADE,
  losing_quote_ids UUID[] NOT NULL, -- Quotes that were rejected
  awarded_by UUID NOT NULL REFERENCES auth.users(id),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  deposit_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_award_history_event ON marketplace_award_history(event_id);
CREATE INDEX idx_award_history_awarded_by ON marketplace_award_history(awarded_by);
CREATE INDEX idx_award_history_awarded_at ON marketplace_award_history(awarded_at);

-- 3. Payment method manager for clients
CREATE TABLE client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  card_brand TEXT, -- 'visa', 'mastercard', etc
  card_last_four TEXT,
  card_expiry_month INT,
  card_expiry_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_client ON client_payment_methods(client_id);
CREATE INDEX idx_payment_methods_stripe_customer ON client_payment_methods(stripe_customer_id);

COMMENT ON TABLE client_payment_methods IS 'Saved Stripe payment methods for marketplace clients (for off-session charges)';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single charge at booking time | Two-stage: deposit + remainder | 2024+ | Allows payment flexibility; clients don't pay full amount upfront; reduces chargeback risk |
| Authorize-then-capture (7-day hold) | Two PaymentIntents with setup_future_usage | 2024+ | Supports longer payment terms (14+ days); avoids hold expiry issues |
| Custom retry scheduling | Stripe Smart Retries | 2024+ | 8 retries optimized by AI; respects card network limits; no custom code needed |
| All payment methods stored in database | Stripe Customer + PaymentMethod IDs only | 2024+ | PCI DSS compliance; reduced security liability; better audit trails |
| Manual dunning emails | Stripe Smart Retries built-in notifications | 2024+ | Automatic, frequency-limited; configurable per customer segment |
| Award blocking logic without EXCLUSION check | Hybrid: named medics + EXCLUSION constraint check | 2024+ | Catches overbooking early; prevents double-bookings; improves reliability |

**Deprecated/outdated:**
- Storing Stripe intent IDs without booking reference (can't track which booking a payment belongs to)
- Hard-coded deposit percentages (should be by event type/vertical)
- Single status field for payment (should track deposit vs remainder separately)
- No payment method manager UI (clients can't update card)

---

## Open Questions

1. **Award confirmation UX: is it provisional or final?**
   - What we know: User clicks "Award" and proceeds to payment
   - What's unclear: Is the quote marked "awarded" before payment, or only after deposit succeeds?
   - Recommendation: Mark as "awarded_pending_deposit" after confirmation modal, then "awarded" after deposit succeeds. This prevents race conditions where user clicks award twice.

2. **Other-quote rejection timing: immediate or after deposit?**
   - What we know: Non-winning quotes should be rejected
   - What's unclear: Reject immediately at award confirmation, or wait for deposit webhook?
   - Recommendation: Reject immediately at award time (in API route). Cleaner UX; non-winning companies see status change right away.

3. **EXCLUSION constraint check: what error should client see?**
   - What we know: If named medics have conflicts, award should fail
   - What's unclear: Should client see technical conflict, or friendly message "John is unavailable, please contact the company"?
   - Recommendation: Show friendly message; error details in platform logs only.

4. **Escalation after 3 failed remainder charges: what happens?**
   - What we know: Net 14 days; 3 retries; after failures, action needed
   - What's unclear: Auto-suspend client account? Send to collections? Require manual payment?
   - Recommendation: Send escalation email to client + admin alert. No auto-suspend. Require client to update payment method. If still fails after 14 days, mark booking as "payment_failed_unrecoverable" and pause medic payout pipeline.

5. **Client dashboard: should clients see both "pending remainder" and "fully paid" bookings?**
   - What we know: Phase 35 requires remainder tracking
   - What's unclear: What should bookings list show? Different statuses for deposit vs remainder?
   - Recommendation: Show "Active bookings" section with deposit status, "Reminder: remainder due on [DATE]", and "Completed bookings" (paid in full). Color-code by status.

6. **Stripe Smart Retries configuration: use defaults or custom?**
   - What we know: Recommended default is 8 retries over 2 weeks
   - What's unclear: Should SiteMedic use Stripe's defaults or customize (e.g., 3 retries over 7 days per CONTEXT)?
   - Recommendation: Use Stripe Smart Retries (8/2 weeks) if available. If not using Smart Retries, manually implement 3/7 day schedule via Edge Function. Check Stripe account settings.

---

## Sources

### Primary (HIGH confidence)
- **@stripe/stripe-js v8.7.0** — Official Stripe.js SDK; PaymentElement, off_session handling
- **@stripe/react-stripe-js v5.6.0** — Official React hooks; useStripe, useElements
- **stripe v20.3.1** — Official Node.js SDK; PaymentIntent.create, Customer.create
- **Stripe Docs:** [Payment Intents API](https://docs.stripe.com/payments/payment-intents)
- **Stripe Docs:** [Setup Intents API](https://docs.stripe.com/payments/setup-intents)
- **Stripe Docs:** [Save and Reuse Payment Methods](https://docs.stripe.com/payments/save-and-reuse)
- **Stripe Docs:** [Payment Element](https://docs.stripe.com/payments/payment-element)
- **Stripe Docs:** [React Stripe.js Reference](https://docs.stripe.com/sdks/stripejs-react)
- **Stripe Docs:** [Automate Payment Retries (Smart Retries)](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- **Stripe Docs:** [Payouts to Connected Accounts](https://docs.stripe.com/connect/payouts-connected-accounts)
- **Codebase:** `web/lib/stripe/server.ts` — Stripe initialization pattern
- **Codebase:** `web/app/api/direct-jobs/[id]/payment/route.ts` — Existing deposit PaymentIntent example
- **Codebase:** `supabase/functions/friday-payout/index.ts` — Existing payout pipeline using Stripe Transfers
- **Codebase:** `supabase/functions/_shared/email-templates.ts` — Email notification patterns
- **Codebase:** `supabase/migrations/039_territory_metrics_cron.sql` — pg_cron scheduling example

### Secondary (MEDIUM confidence)
- **WebSearch:** "Stripe SetupIntent off-session payment JavaScript 2026" — Confirmed current API patterns
- **WebSearch:** "Stripe PaymentIntent with setup_future_usage off_session best practices" — Confirmed two-intent pattern for multi-stage payments
- **WebSearch:** "Stripe automatic retry failed payment 2026" — Confirmed Smart Retries availability and 8-retry default
- **WebSearch:** "React Stripe Elements Payment Element implementation 2026" — Confirmed Payment Element adoption over legacy Elements

### Tertiary (LOW confidence)
- Deposit percentage configurability per vertical — CONTEXT mentions it but no current admin panel exists
- EXCLUSION constraint implementation details — Referenced in CONTEXT but not yet implemented in codebase
- Client dashboard payment method manager — New feature; no prior art in codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack (Stripe + React): **HIGH** — all libraries verified in package.json, official docs current
- Architecture patterns (PaymentIntent + SetupIntent): **HIGH** — official Stripe docs + existing direct-jobs pattern confirm
- Off-session charging (Smart Retries): **HIGH** — official Stripe docs + friday-payout pattern confirm use of Edge Functions
- pg_cron scheduling: **HIGH** — existing 039_territory_metrics_cron.sql migration shows pattern
- EXCLUSION constraint check at award: **MEDIUM** — CONTEXT mentions hybrid check but no implementation pattern found
- Payment method manager UI: **MEDIUM** — no prior art in codebase; recommendation based on UX best practices

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Stripe APIs stable; marketplace patterns mature; marketplace_booking_payments schema not yet finalized)

---

## Next Steps for Planning

1. **Database migration** — Create marketplace_award_history, client_payment_methods, add columns to bookings
2. **Stripe client initialization** — Create web/lib/stripe/client.ts with loadStripe()
3. **Award flow store** — Implement useAwardCheckoutStore for multi-step flow
4. **Award API route** — POST /api/marketplace/quotes/[id]/award with deposit PaymentIntent creation
5. **Deposit payment form** — Embed Payment Element in React component
6. **Webhook handler update** — Add deposit + remainder handlers to /api/stripe/webhooks
7. **Remainder charge scheduler** — Create charge-remainder-payment Edge Function + pg_cron migration
8. **Email templates** — Add award confirmation, deposit receipt, remainder scheduled, remainder failed
9. **Payment method manager** — Dashboard page to view/update saved cards
10. **Tests** — Unit tests for award validation, payment calculations; E2E for deposit + remainder flow; webhook mock testing
