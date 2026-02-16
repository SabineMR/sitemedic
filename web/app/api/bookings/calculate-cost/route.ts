/**
 * POST /api/bookings/calculate-cost
 * Phase 6.5-05: Calculate out-of-territory cost with Google Maps integration
 *
 * Flow:
 * 1. Fetch medic home postcode from database
 * 2. Check travel_time_cache for existing route data
 * 3. If cache miss: call Google Maps Distance Matrix API
 * 4. Calculate travel bonus vs room/board cost
 * 5. Return recommendation with cost breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateOutOfTerritoryCost } from '@/lib/bookings/out-of-territory';

export const dynamic = 'force-dynamic';

interface CostCalculationRequest {
  medicId: string;
  sitePostcode: string;
  shiftHours: number;
  baseRate: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: CostCalculationRequest = await request.json();

    // Validate required fields
    if (!body.medicId || !body.sitePostcode || !body.shiftHours || !body.baseRate) {
      return NextResponse.json(
        { error: 'Missing required fields: medicId, sitePostcode, shiftHours, baseRate' },
        { status: 400 }
      );
    }

    // Validate postcode format (basic UK postcode validation)
    const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(body.sitePostcode.trim())) {
      return NextResponse.json(
        { error: 'Invalid UK postcode format' },
        { status: 400 }
      );
    }

    // Fetch medic home postcode
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('home_postcode, first_name, last_name')
      .eq('id', body.medicId)
      .single();

    if (medicError || !medic) {
      return NextResponse.json(
        { error: 'Medic not found' },
        { status: 404 }
      );
    }

    const medicPostcode = medic.home_postcode;
    const sitePostcode = body.sitePostcode.trim().toUpperCase();

    // Check cache for existing route data
    const { data: cachedRoute, error: cacheError } = await supabase
      .from('travel_time_cache')
      .select('*')
      .eq('origin_postcode', medicPostcode)
      .eq('destination_postcode', sitePostcode)
      .gt('expires_at', new Date().toISOString())
      .order('cached_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let distance_miles: number;
    let travel_time_minutes: number;
    let cached = false;

    if (cachedRoute && !cacheError) {
      // Use cached data
      distance_miles = cachedRoute.distance_miles;
      travel_time_minutes = cachedRoute.travel_time_minutes;
      cached = true;
    } else {
      // Cache miss: call Google Maps Distance Matrix API
      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

      if (!GOOGLE_MAPS_API_KEY) {
        console.error('GOOGLE_MAPS_API_KEY not configured');
        return NextResponse.json(
          { error: 'Google Maps API key not configured' },
          { status: 500 }
        );
      }

      try {
        const mapsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(medicPostcode)}&destinations=${encodeURIComponent(sitePostcode)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`
        );

        if (!mapsResponse.ok) {
          throw new Error(`Google Maps API returned ${mapsResponse.status}`);
        }

        const mapsData = await mapsResponse.json();

        if (mapsData.status !== 'OK') {
          console.error('Google Maps API error:', mapsData.status, mapsData.error_message);
          return NextResponse.json(
            { error: `Google Maps API error: ${mapsData.status}` },
            { status: 400 }
          );
        }

        const element = mapsData.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
          return NextResponse.json(
            { error: 'Could not calculate route between postcodes' },
            { status: 400 }
          );
        }

        // Convert meters to miles, seconds to minutes
        distance_miles = Number((element.distance.value / 1609.34).toFixed(2));
        travel_time_minutes = Math.round(element.duration.value / 60);

        // Cache result for 7 days
        await supabase.from('travel_time_cache').insert({
          origin_postcode: medicPostcode,
          destination_postcode: sitePostcode,
          travel_time_minutes,
          distance_miles,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        cached = false;
      } catch (apiError) {
        console.error('Error calling Google Maps API:', apiError);
        return NextResponse.json(
          { error: 'Failed to calculate route distance' },
          { status: 500 }
        );
      }
    }

    // Calculate shift value (with VAT)
    const shift_value = Number((body.shiftHours * body.baseRate * 1.2).toFixed(2));

    // Calculate out-of-territory cost
    const calculation = calculateOutOfTerritoryCost(
      distance_miles,
      travel_time_minutes,
      shift_value
    );

    return NextResponse.json({
      calculation,
      cached,
      medicName: `${medic.first_name} ${medic.last_name}`,
      medicPostcode,
      sitePostcode,
    });
  } catch (error) {
    console.error('Error in /api/bookings/calculate-cost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
