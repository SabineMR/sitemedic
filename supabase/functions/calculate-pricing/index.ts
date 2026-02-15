/**
 * Calculate Pricing Edge Function
 * Phase 1.5: Pure calculation function for booking pricing
 *
 * Purpose: Calculate booking pricing with all cost components and 40/60 platform split
 * NO DATABASE OPERATIONS - Pure calculation only. Callers write results to bookings table.
 *
 * Pricing Formula:
 * 1. hourly_total = base_rate × shift_hours
 * 2. urgency_amount = hourly_total × (urgency_premium_percent / 100)
 * 3. subtotal = hourly_total + urgency_amount + travel_surcharge + out_of_territory_cost
 * 4. vat = subtotal × 0.20 (UK 20% VAT)
 * 5. total = subtotal + vat
 * 6. platform_fee = total × 0.40 (40% markup)
 * 7. medic_payout = total - platform_fee (60% to medic)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface PricingRequest {
  shift_hours: number;
  base_rate: number; // Per hour (medic's base rate)
  urgency_premium_percent: number; // 0, 20, 50, 75
  travel_surcharge?: number; // Optional travel cost
  out_of_territory_cost?: number; // Optional: travel bonus or room/board
  out_of_territory_type?: 'travel_bonus' | 'room_board' | null;
}

interface PricingResponse {
  // Input breakdown
  shift_hours: number;
  base_rate: number;
  urgency_premium_percent: number;
  travel_surcharge: number;
  out_of_territory_cost: number;
  out_of_territory_type: string | null;

  // Calculated values
  hourly_total: number;
  urgency_amount: number;
  subtotal: number;
  vat: number;
  total: number;

  // Platform split (40% markup)
  platform_fee: number; // 40% of total
  medic_payout: number; // 60% of total
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

    console.log(`💰 Calculating pricing: ${shift_hours}h @ £${base_rate}/hr + ${urgency_premium_percent}% urgency`);

    // Step 1: Calculate hourly total
    const hourly_total = base_rate * shift_hours;

    // Step 2: Calculate urgency premium
    const urgency_amount = hourly_total * (urgency_premium_percent / 100);

    // Step 3: Calculate subtotal (before VAT)
    const subtotal = hourly_total + urgency_amount + travel_surcharge + out_of_territory_cost;

    // Step 4: Calculate VAT (20% UK standard rate)
    const vat = subtotal * 0.20;

    // Step 5: Calculate total (client pays this)
    const total = subtotal + vat;

    // Step 6: Calculate platform fee (40% markup)
    const platform_fee = total * 0.40;

    // Step 7: Calculate medic payout (60% of total)
    const medic_payout = total - platform_fee;

    // Round all values to 2 decimal places (GBP standard)
    const response: PricingResponse = {
      // Input echo
      shift_hours,
      base_rate: parseFloat(base_rate.toFixed(2)),
      urgency_premium_percent,
      travel_surcharge: parseFloat(travel_surcharge.toFixed(2)),
      out_of_territory_cost: parseFloat(out_of_territory_cost.toFixed(2)),
      out_of_territory_type,

      // Calculated breakdown
      hourly_total: parseFloat(hourly_total.toFixed(2)),
      urgency_amount: parseFloat(urgency_amount.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat: parseFloat(vat.toFixed(2)),
      total: parseFloat(total.toFixed(2)),

      // Platform split
      platform_fee: parseFloat(platform_fee.toFixed(2)),
      medic_payout: parseFloat(medic_payout.toFixed(2)),
    };

    console.log(`✅ Pricing calculated: subtotal £${response.subtotal}, total £${response.total}, medic £${response.medic_payout}`);

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
