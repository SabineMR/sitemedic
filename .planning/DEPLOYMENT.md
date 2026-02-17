# SiteMedic Deployment Configuration Guide

**Created:** 2026-02-17
**Purpose:** External service configuration checklist for production deployment

## Overview

SiteMedic v1.0 requires configuration of several external services before production deployment. All code is complete - these are configuration-only setup steps.

**Estimated time:** 1-2 hours for first-time setup

---

## Prerequisites

- [ ] Supabase project deployed (eu-west-2 London region)
- [ ] GitHub repository with latest v1.0 code
- [ ] Domain configured: sitemedic.co.uk

---

## 1. Stripe Configuration

**Purpose:** Client payment processing, medic payouts via UK Faster Payments

### A. Create Stripe Account
1. Sign up at https://stripe.com
2. Enable UK region (GBP currency)
3. Complete business verification

### B. Get API Keys
Navigate to: Developers → API keys

Required keys:
- **STRIPE_SECRET_KEY** - Secret key (starts with `sk_live_` or `sk_test_`)
- **STRIPE_PUBLISHABLE_KEY** - Publishable key (starts with `pk_live_` or `pk_test_`)

### C. Enable Stripe Connect
Navigate to: Connect → Settings
1. Enable Express accounts
2. Set payout schedule: Daily automatic
3. Configure branding (SiteMedic logo, colors)

### D. Configure Webhooks
Navigate to: Developers → Webhooks → Add endpoint

**Endpoint URL:** `https://sitemedic.co.uk/api/webhooks/stripe`

**Events to listen for:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated` (for Connect accounts)
- `payout.paid`
- `payout.failed`

**Get webhook secret:** Copy signing secret (starts with `whsec_`)
- **STRIPE_WEBHOOK_SECRET** - Webhook signing secret

### E. Add to Supabase Secrets
```bash
# In Supabase Dashboard → Project Settings → Secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### F. Test Stripe Integration
1. Create test booking with test card: `4242 4242 4242 4242`
2. Verify payment appears in Stripe Dashboard
3. Check webhook delivery in Stripe Dashboard → Webhooks → Events

---

## 2. Google Maps API Configuration

**Purpose:** Distance calculations for medic auto-assignment, travel surcharges

### A. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: "SiteMedic Production"
3. Enable billing

### B. Enable APIs
Navigate to: APIs & Services → Library

Enable these APIs:
- Distance Matrix API
- Geocoding API (optional, for address validation)

### C. Create API Key
Navigate to: APIs & Services → Credentials → Create Credentials → API Key

**Restrictions (recommended):**
- Application restrictions: None (server-side Edge Functions)
- API restrictions: Distance Matrix API, Geocoding API

**Get key:** Copy API key (starts with `AIza...`)
- **GOOGLE_MAPS_API_KEY** - API key

### D. Add to Supabase Secrets
```bash
supabase secrets set GOOGLE_MAPS_API_KEY=AIza...
```

### E. Set Billing Alert
Navigate to: Billing → Budgets & alerts
- Set budget: £50/month
- Alert at 50%, 90%, 100%

**Expected costs:** £10-30/month (based on ~100 bookings/month, ~5p per distance calculation)

### F. Test Distance Calculation
```bash
# From Supabase SQL Editor
SELECT net.http_get(
  'https://maps.googleapis.com/maps/api/distancematrix/json?origins=SW1A1AA&destinations=SW1A2AA&key=' ||
  current_setting('app.google_maps_api_key')
);
```

---

## 3. Resend Email Configuration

**Purpose:** Transactional emails (booking confirmations, cert expiry alerts, RIDDOR notifications, weekly reports)

### A. Create Resend Account
1. Sign up at https://resend.com
2. Choose Pro plan (10,000 emails/month, £15/month)

### B. Verify Domain
Navigate to: Domains → Add Domain

**Domain:** sitemedic.co.uk

Add DNS records (provided by Resend):
```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: CNAME
Name: resend._domainkey
Value: [provided by Resend]

Type: CNAME
Name: resend.bounce
Value: [provided by Resend]
```

Wait for verification (5-60 minutes)

### C. Get API Key
Navigate to: API Keys → Create API Key

- **RESEND_API_KEY** - API key (starts with `re_`)

### D. Configure Webhooks
Navigate to: Webhooks → Add Webhook

**Endpoint URL:** `https://sitemedic.co.uk/api/webhooks/resend`

**Events:**
- `email.sent`
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`

**Get webhook secret:** Copy signing secret
- **RESEND_WEBHOOK_SECRET** - Webhook signing secret (optional, for verification)

### E. Add to Supabase Secrets
```bash
supabase secrets set RESEND_API_KEY=re_...
```

### F. Test Email Delivery
```bash
# From Supabase Functions directory
supabase functions invoke certification-expiry-checker --data '{"trigger":"manual","check_date":"2026-02-17"}'
```

Check Resend Dashboard → Logs for sent emails

---

## 4. Supabase Vault Configuration

**Purpose:** Secure storage for pg_cron authentication (automated jobs: weekly reports, cert expiry, payouts)

### A. Store Project URL
Navigate to: Project Settings → API

Copy Project URL (e.g., `https://xyz.supabase.co`)

Store in database:
```sql
ALTER DATABASE postgres
SET app.project_url = 'https://xyz.supabase.co';
```

### B. Store Service Role Key
Navigate to: Project Settings → API → Service Role Key

Copy service role key (starts with `eyJ...`)

Store in database:
```sql
ALTER DATABASE postgres
SET app.service_role_key = 'eyJ...';
```

### C. Verify Cron Jobs Can Authenticate
```sql
-- Test pg_cron authentication
SELECT cron.schedule(
  'test-vault-auth',
  '* * * * *',  -- Every minute for testing
  $$
  SELECT net.http_post(
    url := current_setting('app.project_url') || '/functions/v1/test',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('test', true)
  )
  $$
);

-- Check execution logs
SELECT * FROM cron.job_run_details
WHERE jobname = 'test-vault-auth'
ORDER BY start_time DESC
LIMIT 5;

-- Delete test job
SELECT cron.unschedule('test-vault-auth');
```

---

## 5. Environment Variables (Web Dashboard)

**Purpose:** Next.js web dashboard configuration

### A. Create .env.local (for local development)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe (client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### B. Deploy to Vercel/Production
Navigate to: Project Settings → Environment Variables

Add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 6. Mobile App Configuration (Expo)

**Purpose:** React Native mobile app environment configuration

### A. Update .env
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Web app URL (for cert validation API calls)
EXPO_PUBLIC_WEB_APP_URL=https://sitemedic.co.uk
```

### B. Rebuild App
```bash
cd /path/to/mobile
pnpm install
eas build --platform ios --profile production
```

---

## 7. Verification Checklist

After configuration, verify all integrations:

### Payment Flow
- [ ] Client can create booking and pay with real card
- [ ] Payment appears in Stripe Dashboard
- [ ] Booking status updates to 'confirmed'
- [ ] Confirmation email sent via Resend
- [ ] Medic auto-assigned successfully

### Email Delivery
- [ ] Booking confirmation emails arrive (<1 minute)
- [ ] Weekly reports generate and email Friday 5 PM UTC
- [ ] Certification expiry reminders send at 9 AM UTC
- [ ] RIDDOR deadline alerts trigger correctly

### Cron Jobs
- [ ] `weekly-safety-report` runs Friday 17:00 UTC
- [ ] `certification-expiry-checker` runs daily 09:00 UTC
- [ ] `friday-medic-payouts` runs Friday 09:00 UTC
- [ ] `late-payment-checker` runs daily 10:00 UTC

### Distance Calculations
- [ ] Auto-assignment calculates travel time correctly
- [ ] Travel surcharges applied for >30 miles
- [ ] Google Maps API costs within budget alerts

### Medic Payouts
- [ ] Weekly payout cron creates Stripe Transfers
- [ ] Payslip PDFs generate and email to medics
- [ ] Payouts appear in medic Stripe Connect accounts

---

## 8. Monitoring & Alerts

### Supabase Dashboard
- Database health: Settings → Database → Health
- Edge Function logs: Functions → [function name] → Logs
- Storage usage: Storage → Settings

### Stripe Dashboard
- Failed payments: Payments → Filter by Failed
- Payout delays: Connect → Payouts
- Webhook errors: Developers → Webhooks → Events

### Resend Dashboard
- Email bounces: Logs → Filter by bounced
- Spam complaints: Logs → Filter by complained
- Delivery rate: Analytics

### Google Cloud Console
- API quota usage: APIs & Services → Dashboard
- Cost trends: Billing → Cost Table
- Error rates: APIs & Services → [API] → Metrics

---

## 9. Security Checklist

- [ ] All API keys stored in Supabase secrets (never in code)
- [ ] Webhook endpoints verify signatures
- [ ] RLS policies enabled on all tables
- [ ] Service role key never exposed to client
- [ ] HTTPS enforced (no HTTP allowed)
- [ ] CORS configured for production domain only

---

## 10. Rollback Plan

If production deployment fails:

### Immediate Actions
1. Revert to previous git tag: `git checkout v0.9`
2. Redeploy previous version to Vercel
3. Pause pg_cron jobs: `SELECT cron.unschedule('[job-name]');`
4. Notify users via status page

### Investigation
1. Check Supabase Edge Function logs for errors
2. Check Stripe webhook delivery logs
3. Check Resend email delivery logs
4. Review database query performance

---

## Cost Estimate (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Pro | $25 |
| Stripe | Pay-as-you-go | ~$100 (2.9% + 30p per transaction) |
| Google Maps | Pay-as-you-go | ~£20 |
| Resend | Pro | £15 |
| Vercel | Pro | $20 |
| **Total** | | **~£180/month** |

**Note:** Costs scale with usage. Above estimates based on ~100 bookings/month.

---

## Support Contacts

- **Stripe Support:** https://support.stripe.com
- **Google Cloud Support:** https://cloud.google.com/support
- **Resend Support:** support@resend.com
- **Supabase Support:** https://supabase.com/support

---

**Last updated:** 2026-02-17
**Version:** v1.0
**Maintainer:** SiteMedic Team
