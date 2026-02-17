import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateOutOfTerritoryCost } from '@/lib/bookings/out-of-territory';
import { requireOrgId } from '@/lib/organizations/org-resolver';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

interface CalculateCostRequest {
  medicId: string;
  sitePostcode: string;
  shiftHours: number;
  baseRate: number;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body: CalculateCostRequest = await req.json();
    const { medicId, sitePostcode, shiftHours, baseRate } = body;

    // Validate inputs
    if (!medicId || !sitePostcode || !shiftHours || !baseRate) {
      return NextResponse.json(
        { error: 'Missing required fields: medicId, sitePostcode, shiftHours, baseRate' },
        { status: 400 }
      );
    }

    // Fetch medic home postcode
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('home_postcode')
      .eq('id', medicId)
      .eq('org_id', orgId)
      .single();

    if (medicError || !medic?.home_postcode) {
      return NextResponse.json(
        { error: 'Medic not found or missing home postcode' },
        { status: 404 }
      );
    }

    const medicPostcode = medic.home_postcode;

    // Check travel_time_cache for existing result
    const { data: cachedTravel } = await supabase
      .from('travel_time_cache')
      .select('*')
      .eq('origin_postcode', medicPostcode)
      .eq('destination_postcode', sitePostcode)
      .gt('expires_at', new Date().toISOString())
      .single();

    let distance_miles: number;
    let travel_time_minutes: number;
    let cached = false;

    if (cachedTravel) {
      // Cache hit
      console.log('✅ Cache hit - using cached travel data');
      distance_miles = Number(cachedTravel.distance_miles);
      travel_time_minutes = cachedTravel.travel_time_minutes;
      cached = true;
    } else {
      // Cache miss - call Google Maps Distance Matrix API
      console.log('❌ Cache miss - calling Google Maps API');

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
          medicPostcode
        )}&destinations=${encodeURIComponent(sitePostcode)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        return NextResponse.json({ error: 'Google Maps API request failed' }, { status: 500 });
      }

      const data = await response.json();

      const element = data.rows?.[0]?.elements?.[0];
      if (element?.status !== 'OK') {
        return NextResponse.json(
          { error: 'Could not calculate route - invalid postcode or unreachable destination' },
          { status: 400 }
        );
      }

      // Convert meters to miles, seconds to minutes
      distance_miles = Number((element.distance.value / 1609.34).toFixed(2));
      travel_time_minutes = Math.round(element.duration.value / 60);

      // Cache result for 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase.from('travel_time_cache').insert({
        origin_postcode: medicPostcode,
        destination_postcode: sitePostcode,
        travel_time_minutes,
        distance_miles,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      cached = false;
    }

    // Calculate shift value (base rate * hours * 1.2 for VAT)
    const shift_value = Number((shiftHours * baseRate * 1.2).toFixed(2));

    // Calculate out-of-territory cost
    const calculation = calculateOutOfTerritoryCost(distance_miles, travel_time_minutes, shift_value);

    return NextResponse.json({
      calculation,
      cached,
      medicPostcode,
      sitePostcode,
    });
  } catch (error) {
    console.error('Error calculating cost:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
