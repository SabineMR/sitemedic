/**
 * Stripe Connect Edge Function
 * Phase 1.5: Express account creation, onboarding, Payment Intent creation
 *
 * Actions:
 * - create_express_account: Create Stripe Express account for medic + onboarding link
 * - create_payment_intent: Create Payment Intent for client booking charge
 * - create_customer: Create Stripe Customer for client
 * - check_account_status: Retrieve Express account status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe } from '../_shared/stripe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://sitemedic.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ConnectRequest {
  action: 'create_express_account' | 'create_payment_intent' | 'create_customer' | 'check_account_status';
  [key: string]: any;
}

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const requestData: ConnectRequest = await req.json();
    const { action } = requestData;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔌 Stripe Connect action: ${action}`);

    // Route by action
    switch (action) {
      case 'create_express_account':
        return await createExpressAccount(requestData);

      case 'create_payment_intent':
        return await createPaymentIntent(requestData);

      case 'create_customer':
        return await createCustomer(requestData);

      case 'check_account_status':
        return await checkAccountStatus(requestData);

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Action: create_express_account
 * Create Stripe Express account for medic + generate onboarding link
 */
async function createExpressAccount(data: any): Promise<Response> {
  const { medic_id, email, first_name, last_name } = data;

  if (!medic_id || !email || !first_name || !last_name) {
    return new Response(
      JSON.stringify({ error: 'medic_id, email, first_name, last_name required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`👤 Creating Express account for medic ${medic_id} (${email})`);

  // Step 1: Create Stripe Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      email,
      first_name,
      last_name,
    },
    metadata: {
      medic_id,
    },
  });

  console.log(`✅ Express account created: ${account.id}`);

  // Step 2: Update medics table with stripe_account_id
  const { error: updateError } = await supabase
    .from('medics')
    .update({ stripe_account_id: account.id })
    .eq('id', medic_id);

  if (updateError) {
    console.error('Error updating medic with stripe_account_id:', updateError);
    throw new Error('Failed to update medic record');
  }

  // Step 3: Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${SITE_URL}/medic/onboarding/refresh`,
    return_url: `${SITE_URL}/medic/onboarding/complete`,
    type: 'account_onboarding',
  });

  console.log(`🔗 Onboarding link created: ${accountLink.url}`);

  // Step 4: Store onboarding URL in medics table
  await supabase
    .from('medics')
    .update({ stripe_onboarding_url: accountLink.url })
    .eq('id', medic_id);

  return new Response(
    JSON.stringify({
      account_id: account.id,
      onboarding_url: accountLink.url,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Action: create_payment_intent
 * Create Payment Intent for client booking charge
 */
async function createPaymentIntent(data: any): Promise<Response> {
  const { booking_id, client_id, amount_pence, description } = data;

  if (!booking_id || !client_id || !amount_pence) {
    return new Response(
      JSON.stringify({ error: 'booking_id, client_id, amount_pence required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`💳 Creating Payment Intent for booking ${booking_id}, amount: £${(amount_pence / 100).toFixed(2)}`);

  // Step 1: Look up client's stripe_customer_id
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('stripe_customer_id')
    .eq('id', client_id)
    .single();

  if (clientError || !client) {
    return new Response(
      JSON.stringify({ error: 'Client not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!client.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'Client has no Stripe customer ID. Call create_customer first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Step 2: Create Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount_pence,
    currency: 'gbp',
    customer: client.stripe_customer_id,
    metadata: {
      booking_id,
      client_id,
    },
    description: description || `Booking ${booking_id}`,
  });

  console.log(`✅ Payment Intent created: ${paymentIntent.id}`);

  // Step 3: Insert payment record into payments table
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id,
      client_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount_pence / 100, // Store in GBP (decimal)
      status: 'pending',
      // platform_fee and medic_payout will be calculated from booking
    });

  if (paymentError) {
    console.error('Error inserting payment record:', paymentError);
    throw new Error('Failed to create payment record');
  }

  return new Response(
    JSON.stringify({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Action: create_customer
 * Create Stripe Customer for client
 */
async function createCustomer(data: any): Promise<Response> {
  const { client_id, email, company_name } = data;

  if (!client_id || !email || !company_name) {
    return new Response(
      JSON.stringify({ error: 'client_id, email, company_name required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`🏢 Creating Stripe Customer for client ${client_id} (${company_name})`);

  // Create Stripe Customer
  const customer = await stripe.customers.create({
    email,
    name: company_name,
    metadata: {
      client_id,
    },
  });

  console.log(`✅ Customer created: ${customer.id}`);

  // Update clients table with stripe_customer_id
  const { error: updateError } = await supabase
    .from('clients')
    .update({ stripe_customer_id: customer.id })
    .eq('id', client_id);

  if (updateError) {
    console.error('Error updating client with stripe_customer_id:', updateError);
    throw new Error('Failed to update client record');
  }

  return new Response(
    JSON.stringify({
      customer_id: customer.id,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Action: check_account_status
 * Retrieve Express account status
 */
async function checkAccountStatus(data: any): Promise<Response> {
  const { stripe_account_id } = data;

  if (!stripe_account_id) {
    return new Response(
      JSON.stringify({ error: 'stripe_account_id required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`🔍 Checking account status: ${stripe_account_id}`);

  // Retrieve account
  const account = await stripe.accounts.retrieve(stripe_account_id);

  return new Response(
    JSON.stringify({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
