# Stripe Connect Integration Guide

**Phase**: 1.5 - Business Operations Foundation
**Purpose**: Payment processing for client charges and medic payouts
**Critical**: Yes - Revenue generation depends on this

---

## Overview

SiteMedic uses **Stripe Connect** to handle:
1. **Client payments** (charge construction companies for medic bookings)
2. **Medic payouts** (transfer funds to medics weekly via UK Faster Payments)
3. **Platform fees** (40% markup automatically deducted)

**Architecture**: Platform account + medic Express accounts (NOT Standard accounts - Express is simpler for contractors)

---

## Prerequisites

- Stripe account (create at https://dashboard.stripe.com)
- Business details (company name, address, VAT number)
- UK bank account for platform payouts
- Environment variables configured

---

## Step 1: Create Platform Stripe Account

### 1.1 Sign Up
1. Go to https://dashboard.stripe.com/register
2. Enter email, create password
3. Verify email
4. Complete business profile:
   - Business name: "SiteMedic Ltd"
   - Business type: "Company"
   - Industry: "Healthcare Services"
   - Website: "https://sitemedic.com"

### 1.2 Enable Connect
1. Navigate to **Settings** → **Connect**
2. Click **Get started**
3. Select **Platform** model (NOT Marketplace - we need more control)
4. Choose **Express** accounts for connected accounts (simplest for medics)

### 1.3 Configure Connect Settings
1. **Branding**:
   - Platform name: "SiteMedic"
   - Support email: support@sitemedic.com
   - Icon: Upload logo (512x512px)

2. **Onboarding**:
   - Enable "Collect phone number"
   - Enable "Collect business profile"
   - Disable "Collect product information" (not needed for service business)

3. **Payouts**:
   - Default interval: "Manual" (we control payout timing via Friday job)
   - Minimum payout: £10 (avoid micro-transfers)

### 1.4 Get API Keys
1. Navigate to **Developers** → **API keys**
2. Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy **Secret key** (starts with `sk_test_` or `sk_live_`)
4. **CRITICAL**: Never commit secret key to git!

---

## Step 2: Environment Variables

Create `.env.local` file in project root:

```bash
# Stripe API Keys (TEST MODE - replace with live keys for production)
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnop
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop

# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_1234567890abcdefghijklmnop

# Webhooks (get from Stripe Dashboard → Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnop

# Platform details
PLATFORM_NAME="SiteMedic"
PLATFORM_SUPPORT_EMAIL="support@sitemedic.com"
PLATFORM_FEE_PERCENT=40 # 40% markup
```

**Security**:
- Add `.env.local` to `.gitignore`
- Use Vercel/Supabase environment variables for production
- Rotate keys every 90 days

---

## Step 3: Create Medic Express Account (Onboarding Flow)

### 3.1 Generate Account Link

When medic signs up, create Stripe Express account:

```typescript
// supabase/functions/stripe-create-medic-account/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const { medicId, email, firstName, lastName } = await req.json();

  try {
    // 1. Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB', // UK only
      email: email,
      capabilities: {
        transfers: { requested: true }, // Enable payouts
      },
      business_type: 'individual', // Self-employed contractors
      individual: {
        email: email,
        first_name: firstName,
        last_name: lastName,
      },
      metadata: {
        medic_id: medicId, // Link to our medics table
        platform: 'sitemedic',
      },
    });

    // 2. Create account link (onboarding URL)
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://sitemedic.com/medic/onboarding/refresh?medic_id=${medicId}`,
      return_url: `https://sitemedic.com/medic/onboarding/complete?medic_id=${medicId}`,
      type: 'account_onboarding',
    });

    // 3. Save to database
    const { error } = await supabaseClient
      .from('medics')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_url: accountLink.url,
        stripe_onboarding_complete: false,
      })
      .eq('id', medicId);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        onboarding_url: accountLink.url,
        account_id: account.id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Medic Onboarding UI Flow

1. **Trigger**: Admin creates medic account → Send email with onboarding link
2. **Email template**:
```
Subject: Complete Your SiteMedic Payout Setup

Hi Dr. Johnson,

Welcome to SiteMedic! To receive your weekly payouts, please complete your bank account setup:

[Complete Setup] → {stripe_onboarding_url}

This secure link expires in 7 days. You'll need:
- UK bank account details (sort code, account number)
- Proof of identity (driving license or passport)
- Your Unique Taxpayer Reference (UTR) if self-employed

Questions? Reply to this email or call 020 1234 5678.

Best,
SiteMedic Team
```

3. **Onboarding steps** (Stripe hosted):
   - Enter bank account details (UK account required)
   - Upload ID verification (driving license or passport)
   - Provide business details (self-employed status)
   - Accept Stripe Terms of Service

4. **Return URL**: After completion, Stripe redirects to:
   - `https://sitemedic.com/medic/onboarding/complete?medic_id=abc123`

5. **Completion handler**:
```typescript
// pages/medic/onboarding/complete.tsx
export default function OnboardingComplete() {
  const router = useRouter();
  const { medic_id } = router.query;

  useEffect(() => {
    // Verify account setup complete
    fetch(`/api/stripe/verify-medic-account?medic_id=${medic_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.charges_enabled && data.payouts_enabled) {
          // Update database
          supabase
            .from('medics')
            .update({ stripe_onboarding_complete: true })
            .eq('id', medic_id);

          toast.success('Payout setup complete! You can now receive payments.');
        } else {
          toast.error('Setup incomplete. Please finish all steps.');
        }
      });
  }, [medic_id]);

  return (
    <div>
      <h1>✅ Payout Setup Complete!</h1>
      <p>You'll receive your first payout this Friday.</p>
    </div>
  );
}
```

---

## Step 4: Client Payment Processing (Prepay)

### 4.1 Create Payment Intent

When client books medic (prepay mode):

```typescript
// supabase/functions/stripe-create-payment-intent/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const { bookingId, amount, clientId } = await req.json();

  try {
    // 1. Get client Stripe customer ID
    const { data: client } = await supabaseClient
      .from('clients')
      .select('stripe_customer_id, company_name')
      .eq('id', clientId)
      .single();

    // 2. Create Payment Intent (£42 booking = 4200 pence)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert £42.00 to 4200 pence
      currency: 'gbp',
      customer: client.stripe_customer_id,
      automatic_payment_methods: { enabled: true }, // Card, Apple Pay, Google Pay
      confirm: false, // Client confirms on frontend
      metadata: {
        booking_id: bookingId,
        client_id: clientId,
        company_name: client.company_name,
        platform: 'sitemedic',
      },
      description: `Medic booking - ${bookingId}`,
      statement_descriptor: 'SITEMEDIC', // Shows on bank statement
    });

    // 3. Save to database
    await supabaseClient.from('payments').insert({
      booking_id: bookingId,
      client_id: clientId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      platform_fee: amount * 0.4, // 40%
      medic_payout: amount * 0.6, // 60%
      status: 'pending',
    });

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Frontend Payment Form (Stripe Elements)

```tsx
// components/PaymentForm.tsx
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';

export default function PaymentForm({ clientSecret, bookingId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `https://sitemedic.com/bookings/${bookingId}/confirmation`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else if (paymentIntent.status === 'succeeded') {
      toast.success('Payment successful! Booking confirmed.');
      router.push(`/bookings/${bookingId}/confirmation`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Pay £42.00'}
      </button>
    </form>
  );
}
```

---

## Step 5: Weekly Medic Payout (Friday Automation)

### 5.1 Friday Payout Job

```typescript
// supabase/functions/friday-payout-job/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  console.log('🚀 Friday payout job started');

  try {
    // 1. Get all admin-approved timesheets
    const { data: timesheets, error } = await supabaseClient
      .from('timesheets')
      .select(`
        *,
        medic:medics(stripe_account_id, first_name, last_name, email)
      `)
      .eq('payout_status', 'admin_approved')
      .is('paid_at', null);

    if (error) throw error;
    if (!timesheets || timesheets.length === 0) {
      console.log('✅ No timesheets to process');
      return new Response(JSON.stringify({ message: 'No payouts due' }));
    }

    console.log(`📋 Processing ${timesheets.length} payouts`);

    // 2. Create Stripe Transfer for each timesheet
    const results = await Promise.allSettled(
      timesheets.map(async (timesheet) => {
        const medic = timesheet.medic;

        if (!medic.stripe_account_id) {
          throw new Error(`Medic ${medic.email} has no Stripe account`);
        }

        // Create transfer (£30 = 3000 pence)
        const transfer = await stripe.transfers.create({
          amount: Math.round(timesheet.payout_amount * 100),
          currency: 'gbp',
          destination: medic.stripe_account_id,
          metadata: {
            timesheet_id: timesheet.id,
            medic_id: timesheet.medic_id,
            booking_id: timesheet.booking_id,
          },
          description: `Payout for ${timesheet.logged_hours} hours`,
        });

        // Update timesheet status
        await supabaseClient
          .from('timesheets')
          .update({
            stripe_transfer_id: transfer.id,
            payout_status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', timesheet.id);

        // Send email confirmation to medic
        await sendPayoutEmail(medic.email, {
          amount: timesheet.payout_amount,
          hours: timesheet.logged_hours,
          transfer_id: transfer.id,
        });

        console.log(`✅ Paid ${medic.first_name} ${medic.last_name}: £${timesheet.payout_amount}`);

        return { success: true, medic: medic.email, amount: timesheet.payout_amount };
      })
    );

    // 3. Summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Payouts complete: ${successful} succeeded, ${failed} failed`);

    // 4. Alert admin if failures
    if (failed > 0) {
      await sendAdminAlert({
        subject: '⚠️ Some payouts failed',
        message: `${failed} out of ${timesheets.length} payouts failed. Check logs.`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: timesheets.length,
        successful,
        failed,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Payout job failed:', error);

    // Alert admin of critical failure
    await sendAdminAlert({
      subject: '🚨 CRITICAL: Friday payout job failed',
      message: error.message,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.2 Schedule Cron Job

Configure in `supabase/functions/_config/cron.yaml`:

```yaml
# Friday payout job - runs every Friday at 9:00 AM UK time
- name: friday-payout-job
  schedule: "0 9 * * 5" # Cron: minute hour day month weekday
  function: friday-payout-job
  timezone: Europe/London
```

---

## Step 6: Webhook Handling

### 6.1 Configure Webhooks in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-handler`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `transfer.failed`
   - `account.updated` (medic onboarding complete)

### 6.2 Webhook Handler

```typescript
// supabase/functions/stripe-webhook-handler/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);
  } catch (error) {
    console.error('⚠️ Webhook signature verification failed:', error.message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  console.log(`📨 Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }));

  } catch (error) {
    console.error(`❌ Webhook handler error:`, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`✅ Payment succeeded: ${paymentIntent.id}`);

  const bookingId = paymentIntent.metadata.booking_id;

  // Update payment status
  await supabaseClient
    .from('payments')
    .update({ status: 'succeeded' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Confirm booking
  await supabaseClient
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);

  // Send confirmation email to client
  // Send notification email to assigned medic
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ Payment failed: ${paymentIntent.id}`);

  const bookingId = paymentIntent.metadata.booking_id;

  // Update payment status
  await supabaseClient
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message,
      failure_code: paymentIntent.last_payment_error?.code,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Cancel booking
  await supabaseClient
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'Payment failed' })
    .eq('id', bookingId);

  // Send email to client with retry link
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`🔄 Account updated: ${account.id}`);

  // Check if onboarding complete
  if (account.charges_enabled && account.payouts_enabled) {
    await supabaseClient
      .from('medics')
      .update({ stripe_onboarding_complete: true })
      .eq('stripe_account_id', account.id);

    console.log(`✅ Medic onboarding complete: ${account.id}`);
  }
}
```

---

## Step 7: Testing

### 7.1 Use Stripe Test Mode

**Test Cards** (no real charges):
- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0027 6000 3184`
- Declined: `4000 0000 0000 0002`

**Test Transfers**:
- All transfers to Express accounts succeed in test mode
- Check Stripe Dashboard → Transfers to verify

### 7.2 Test Workflow

1. **Create medic account** → Get onboarding URL
2. **Complete onboarding** (use test data in Stripe hosted form)
3. **Create booking** → Generate Payment Intent
4. **Pay with test card** → Payment succeeds webhook fires
5. **Submit timesheet** → Admin approves
6. **Run Friday job** (manually trigger) → Transfer created
7. **Verify transfer** in Stripe Dashboard → Medic "paid"

---

## Step 8: Go Live

### 8.1 Activate Live Mode

1. Complete Stripe verification (business details, bank account)
2. Switch to **Live** mode in Stripe Dashboard
3. Get new API keys (`pk_live_...`, `sk_live_...`)
4. Update environment variables
5. Test with small real payment (£1)
6. Monitor for first 48 hours

### 8.2 Compliance Checklist

- ✅ Terms of Service mention Stripe
- ✅ Privacy Policy covers payment data
- ✅ Refund policy documented (48-hour cancellation window)
- ✅ PCI compliance (use Stripe Elements, never store card details)
- ✅ SCA (3D Secure) enabled for all payments

---

## Troubleshooting

### Issue: "Account not found"
**Cause**: Medic Stripe account ID not saved or invalid
**Fix**: Verify `medics.stripe_account_id` matches Stripe Express account ID

### Issue: "Transfer failed: insufficient funds"
**Cause**: Platform account doesn't have funds to pay medic
**Fix**: Ensure client payment succeeded before creating transfer

### Issue: "Webhook signature verification failed"
**Cause**: Wrong webhook secret or body not raw string
**Fix**: Use `req.text()` to get raw body, verify secret matches Stripe Dashboard

### Issue: "Payout delayed"
**Cause**: UK Faster Payments takes 1-2 business days
**Fix**: This is normal - medics receive funds Monday/Tuesday if payout Friday

---

## Security Best Practices

1. **Never log API keys** (use `console.log('stripe_***')` instead of actual key)
2. **Verify webhook signatures** (prevents fake webhook attacks)
3. **Use HTTPS only** (Stripe rejects HTTP endpoints)
4. **Rotate keys every 90 days** (Stripe Dashboard → Developers → API keys → Roll key)
5. **Monitor for fraud** (Stripe Radar auto-blocks suspicious cards)
6. **Set spending limits** (Stripe Dashboard → Settings → Spending limits)

---

## Cost Breakdown

**Stripe Fees** (UK rates):
- Card payments: 1.5% + 20p per transaction
- Transfers (UK Faster Payments): FREE
- Express account setup: FREE
- Disputes (chargebacks): £15 per dispute

**Example Transaction**:
- Client pays: £42.00
- Stripe fee: (£42 × 1.5%) + £0.20 = £0.83
- Net to platform: £41.17
- Platform fee (40%): £16.47
- Medic payout (60%): £24.70
- Platform profit: £16.47 - £0.83 = £15.64

---

## Support

- **Stripe Support**: https://support.stripe.com (24/7 chat)
- **Stripe Docs**: https://stripe.com/docs/connect
- **SiteMedic Support**: support@sitemedic.com

---

**Next Steps**: After Stripe integration complete, proceed to Phase 4.5 (Booking Portal) to build client-facing payment UI.
