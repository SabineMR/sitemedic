/**
 * Calculate Out-of-Territory Cost Edge Function
 * Phase 1.5: Travel bonus vs room/board vs deny decision logic
 *
 * Purpose: Determine most cost-effective approach for out-of-territory bookings
 * Business rules:
 * - Travel bonus: £2/mile beyond 30 miles
 * - Room/board: £85 if travel time > 90 minutes
 * - Deny: if cost > 50% of shift value
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OutOfTerritoryRequest {
  medic_id: string;
  booking_site_postcode: string;
  shift_hours: number;
  base_rate: number;
}

interface OutOfTerritoryResponse {
  in_territory: boolean;
  travel_time_minutes: number;
  distance_miles: number;
  travel_bonus: number;
  room_board: number;
  recommendation: 'travel_bonus' | 'room_board' | 'deny';
  recommended_cost: number;
  shift_value: number;
  cost_percentage: number;
  requires_admin_approval: boolean;
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
      medic_id,
      booking_site_postcode,
      shift_hours,
      base_rate,
    }: OutOfTerritoryRequest = await req.json();

    // Validate inputs
    if (!medic_id || !booking_site_postcode || !shift_hours || !base_rate) {
      return new Response(
        JSON.stringify({ error: 'medic_id, booking_site_postcode, shift_hours, and base_rate required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗺️  Calculating out-of-territory cost for medic ${medic_id} to ${booking_site_postcode}`);

    // Step 1: Get medic details
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('home_postcode')
      .eq('id', medic_id)
      .single();

    if (medicError || !medic) {
      return new Response(
        JSON.stringify({ error: 'Medic not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check if medic is primary or secondary for this territory
    const postcodeSector = extractPostcodeSector(booking_site_postcode);
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('primary_medic_id, secondary_medic_id')
      .eq('postcode_sector', postcodeSector)
      .single();

    // If primary medic, it's in-territory (no extra cost)
    if (!territoryError && territory && territory.primary_medic_id === medic_id) {
      console.log('✅ Primary medic for this territory - no extra cost');
      return new Response(
        JSON.stringify({
          in_territory: true,
          cost: 0,
          requires_admin_approval: false,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Calculate travel time and distance
    const travelData = await calculateTravelTime(medic.home_postcode, booking_site_postcode);

    // Step 4: Calculate costs
    const travelBonus = calculateTravelBonus(travelData.distance_miles);
    const roomBoard = travelData.travel_time_minutes > 90 ? 85 : 0;

    // Step 5: Calculate shift value (with 20% VAT)
    const shiftValue = base_rate * shift_hours * 1.20;

    // Step 6: Determine recommendation
    let recommendation: 'travel_bonus' | 'room_board' | 'deny';
    let recommendedCost: number;

    // Deny if minimum cost > 50% of shift value
    const minCost = Math.min(travelBonus, roomBoard || Infinity);
    if (minCost > shiftValue * 0.50) {
      recommendation = 'deny';
      recommendedCost = minCost;
    } else if (travelBonus < roomBoard || roomBoard === 0) {
      recommendation = 'travel_bonus';
      recommendedCost = travelBonus;
    } else {
      recommendation = 'room_board';
      recommendedCost = roomBoard;
    }

    const costPercentage = (recommendedCost / shiftValue) * 100;

    console.log(`💰 Recommendation: ${recommendation} (£${recommendedCost.toFixed(2)}, ${costPercentage.toFixed(1)}% of shift)`);

    const response: OutOfTerritoryResponse = {
      in_territory: false,
      travel_time_minutes: travelData.travel_time_minutes,
      distance_miles: travelData.distance_miles,
      travel_bonus: travelBonus,
      room_board: roomBoard,
      recommendation,
      recommended_cost: recommendedCost,
      shift_value: shiftValue,
      cost_percentage: parseFloat(costPercentage.toFixed(1)),
      requires_admin_approval: true, // All out-of-territory bookings require approval
    };

    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error calculating out-of-territory cost:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Extract postcode sector (first 2-4 chars before space/number)
 */
function extractPostcodeSector(postcode: string): string {
  // UK postcodes: "SW1A 1AA" -> "SW1A", "N1 7GU" -> "N1", "E14 5AB" -> "E14"
  const cleaned = postcode.trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/);
  return match ? match[1] : cleaned.substring(0, 4);
}

/**
 * Calculate travel bonus: £2/mile beyond 30 miles
 */
function calculateTravelBonus(distanceMiles: number): number {
  if (distanceMiles <= 30) {
    return 0;
  }
  return (distanceMiles - 30) * 2;
}

/**
 * Call calculate-travel-time Edge Function
 */
async function calculateTravelTime(
  originPostcode: string,
  destinationPostcode: string
): Promise<{ travel_time_minutes: number; distance_miles: number }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-travel-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        origin_postcode: originPostcode,
        destination_postcode: destinationPostcode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Travel time API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      travel_time_minutes: data.travel_time_minutes,
      distance_miles: data.distance_miles,
    };
  } catch (error) {
    console.warn('⚠️  Travel time calculation failed:', error.message);
    throw new Error('Failed to calculate travel time');
  }
}
