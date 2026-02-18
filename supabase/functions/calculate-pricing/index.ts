/**
 * Calculate Pricing Edge Function
 * Phase 1.5: Pure calculation function for booking pricing
 *
 * Purpose: Calculate booking pricing with all cost components, configurable
 * platform/medic split (per-medic or env default), and optional referral payout.
 * NO DATABASE OPERATIONS - Pure calculation only. Callers write results to bookings table.
 *
 * Pricing Formula (client-facing — UNCHANGED for both pay models):
 * 1. hourly_total = base_rate × shift_hours
 * 2. urgency_amount = hourly_total × (urgency_premium_percent / 100)
 * 3. subtotal = hourly_total + urgency_amount + travel_surcharge + out_of_territory_cost
 * 4. vat = subtotal × 0.20 (UK 20% VAT)
 * 5. total = subtotal + vat  (client pays this)
 *
 * Percentage model (legacy pay_model = 'percentage'):
 * 6. platform_fee = total × (platform_fee_percent / 100)
 * 7. medic_payout = total × (medic_payout_percent / 100)
 * 8. [referral only] referral_payout_amount = subtotal × (referral_payout_percent / 100)
 * 9. platform_net = platform_fee − referral_payout_amount
 *
 * Hourly model (new pay_model = 'hourly'):
 * 6. medic_hourly_rate = medic's rate from medics.hourly_rate (passed in request)
 * 7. medic_pay = medic_hourly_rate × shift_hours
 * 8. [referral only] referral_payout_amount = subtotal × (referral_payout_percent / 100)
 * 9. net_after_costs = total − medic_pay − referral_payout_amount
 * 10. 4-way split: net / 4 → sabine_share | kai_share | operational | reserve
 *     (The split is informational at price-calc time; recorded in profit_splits on payment)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Env defaults — override per-medic via request body fields
const ENV_PLATFORM_FEE_PERCENT = parseFloat(Deno.env.get('DEFAULT_PLATFORM_FEE_PERCENT') ?? '60');
const ENV_MEDIC_PAYOUT_PERCENT  = parseFloat(Deno.env.get('DEFAULT_MEDIC_PAYOUT_PERCENT')  ?? '40');
const ENV_REFERRAL_PAYOUT_PERCENT = parseFloat(Deno.env.get('REFERRAL_PAYOUT_PERCENT') ?? '10');

interface PricingRequest {
  shift_hours: number;
  base_rate: number;                          // Per hour (client billing rate)
  urgency_premium_percent: number;            // 0, 20, 50, 75
  travel_surcharge?: number;                  // Optional travel cost
  out_of_territory_cost?: number;             // Optional: travel bonus or room/board
  out_of_territory_type?: 'travel_bonus' | 'room_board' | null;

  // Pay model — 'hourly' for new bookings, 'percentage' for legacy
  pay_model?: 'percentage' | 'hourly';

  // Percentage model fields — if omitted, env defaults are used
  platform_fee_percent?: number;              // e.g. 60
  medic_payout_percent?: number;              // e.g. 40

  // Hourly model fields — required when pay_model = 'hourly'
  medic_hourly_rate?: number;                 // £/hr from medics.hourly_rate

  // Referral — omit or set is_referral=false for direct bookings
  is_referral?: boolean;
  referral_payout_percent?: number;           // Defaults to REFERRAL_PAYOUT_PERCENT env var
}

interface PricingResponse {
  // Input echo
  shift_hours: number;
  base_rate: number;
  urgency_premium_percent: number;
  travel_surcharge: number;
  out_of_territory_cost: number;
  out_of_territory_type: string | null;
  pay_model: 'percentage' | 'hourly';

  // Calculated client-facing values (unchanged for both models)
  hourly_total: number;
  urgency_amount: number;
  subtotal: number;
  vat: number;
  total: number;

  // Percentage model fields (always present for backward compat)
  platform_fee_percent: number;
  medic_payout_percent: number;
  platform_fee: number;
  medic_payout: number;

  // Hourly model fields (populated when pay_model = 'hourly', null otherwise)
  medic_hourly_rate: number | null;
  medic_pay: number | null;         // medic_hourly_rate × shift_hours
  net_after_costs: number | null;   // total − medic_pay − referral_payout_amount

  // 4-way split preview (hourly model only)
  sabine_share: number | null;
  kai_share: number | null;
  operational_amount: number | null;
  reserve_amount: number | null;

  // Referral
  is_referral: boolean;
  referral_payout_percent: number;
  referral_payout_amount: number;
  platform_net: number;                       // percentage model: platform_fee − referral
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
    const {
      shift_hours,
      base_rate,
      urgency_premium_percent,
      travel_surcharge = 0,
      out_of_territory_cost = 0,
      out_of_territory_type = null,
      pay_model = 'percentage',
      platform_fee_percent = ENV_PLATFORM_FEE_PERCENT,
      medic_payout_percent  = ENV_MEDIC_PAYOUT_PERCENT,
      medic_hourly_rate = null,
      is_referral = false,
      referral_payout_percent = ENV_REFERRAL_PAYOUT_PERCENT,
    }: PricingRequest = await req.json();

    // Validation: shift_hours >= 8 (UK construction standard)
    if (!shift_hours || shift_hours < 8) {
      return new Response(
        JSON.stringify({
          error: 'shift_hours must be >= 8 (UK construction standard minimum)',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: base_rate > 0
    if (!base_rate || base_rate <= 0) {
      return new Response(
        JSON.stringify({ error: 'base_rate must be > 0' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: urgency_premium_percent in [0, 20, 50, 75]
    const validUrgencyPremiums = [0, 20, 50, 75];
    if (!validUrgencyPremiums.includes(urgency_premium_percent)) {
      return new Response(
        JSON.stringify({
          error: 'urgency_premium_percent must be 0, 20, 50, or 75',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: split must sum to 100 (percentage model only)
    if (pay_model === 'percentage' && Math.abs(platform_fee_percent + medic_payout_percent - 100) > 0.01) {
      return new Response(
        JSON.stringify({ error: 'platform_fee_percent + medic_payout_percent must equal 100' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: hourly model requires medic_hourly_rate > 0
    if (pay_model === 'hourly' && (!medic_hourly_rate || medic_hourly_rate <= 0)) {
      return new Response(
        JSON.stringify({ error: 'medic_hourly_rate must be > 0 when pay_model is hourly' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `💰 Calculating pricing: ${shift_hours}h @ £${base_rate}/hr + ${urgency_premium_percent}% urgency` +
      ` | pay_model=${pay_model}` +
      (pay_model === 'hourly' ? ` | medic_rate £${medic_hourly_rate}/hr` : ` | split ${platform_fee_percent}/${medic_payout_percent}`) +
      (is_referral ? ` | referral ${referral_payout_percent}%` : '')
    );

    // Step 1: Hourly total
    const hourly_total = base_rate * shift_hours;

    // Step 2: Urgency premium
    const urgency_amount = hourly_total * (urgency_premium_percent / 100);

    // Step 3: Subtotal (before VAT)
    const subtotal = hourly_total + urgency_amount + travel_surcharge + out_of_territory_cost;

    // Step 4: VAT (20% UK standard rate)
    const vat = subtotal * 0.20;

    // Step 5: Total (client pays this)
    const total = subtotal + vat;

    // Step 6: Platform fee and medic payout (percentage model — always computed for backward compat)
    const platform_fee = total * (platform_fee_percent / 100);
    const medic_payout  = total * (medic_payout_percent  / 100);

    // Step 7: Referral payout (calculated on pre-VAT subtotal — referrer paid net of VAT)
    const effective_referral_percent = is_referral ? referral_payout_percent : 0;
    const referral_payout_amount = subtotal * (effective_referral_percent / 100);

    // Step 8: Platform net (percentage model)
    const platform_net = platform_fee - referral_payout_amount;

    // Steps 6–10 (hourly model only)
    let hourly_medic_pay: number | null = null;
    let net_after_costs: number | null = null;
    let sabine_share: number | null = null;
    let kai_share: number | null = null;
    let operational_amount: number | null = null;
    let reserve_amount: number | null = null;

    if (pay_model === 'hourly' && medic_hourly_rate != null) {
      hourly_medic_pay = parseFloat((medic_hourly_rate * shift_hours).toFixed(2));
      net_after_costs  = parseFloat((total - hourly_medic_pay - referral_payout_amount).toFixed(2));
      const quarter    = parseFloat((net_after_costs / 4).toFixed(2));
      sabine_share       = quarter;
      kai_share          = quarter;
      operational_amount = quarter;
      reserve_amount     = quarter;
    }

    const response: PricingResponse = {
      // Input echo
      shift_hours,
      base_rate:               parseFloat(base_rate.toFixed(2)),
      urgency_premium_percent,
      travel_surcharge:        parseFloat(travel_surcharge.toFixed(2)),
      out_of_territory_cost:   parseFloat(out_of_territory_cost.toFixed(2)),
      out_of_territory_type,
      pay_model,

      // Calculated client-facing breakdown (unchanged for both models)
      hourly_total:   parseFloat(hourly_total.toFixed(2)),
      urgency_amount: parseFloat(urgency_amount.toFixed(2)),
      subtotal:       parseFloat(subtotal.toFixed(2)),
      vat:            parseFloat(vat.toFixed(2)),
      total:          parseFloat(total.toFixed(2)),

      // Percentage model fields (always present for backward compat)
      platform_fee_percent,
      medic_payout_percent,
      platform_fee:   parseFloat(platform_fee.toFixed(2)),
      medic_payout:   parseFloat(medic_payout.toFixed(2)),

      // Hourly model fields
      medic_hourly_rate: medic_hourly_rate != null ? parseFloat(medic_hourly_rate.toFixed(2)) : null,
      medic_pay:         hourly_medic_pay,
      net_after_costs,
      sabine_share,
      kai_share,
      operational_amount,
      reserve_amount,

      // Referral
      is_referral,
      referral_payout_percent: effective_referral_percent,
      referral_payout_amount:  parseFloat(referral_payout_amount.toFixed(2)),
      platform_net:            parseFloat(platform_net.toFixed(2)),
    };

    console.log(
      `✅ Pricing: subtotal £${response.subtotal}, total £${response.total}` +
      (pay_model === 'hourly'
        ? `, medic_pay £${response.medic_pay}, net_after_costs £${response.net_after_costs}`
        : `, medic £${response.medic_payout}, platform net £${response.platform_net}`) +
      (is_referral ? `, referral £${response.referral_payout_amount}` : '')
    );

    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error calculating pricing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
