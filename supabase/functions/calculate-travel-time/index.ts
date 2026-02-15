/**
 * Calculate Travel Time Edge Function
 * Phase 1.5: Google Maps Distance Matrix API with 7-day caching
 *
 * Purpose: Calculate travel time from medic's home to job site for auto-assignment
 * Cost optimization: 70-80% API call reduction via caching
 * Fallback: Haversine distance if API fails
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TravelTimeRequest {
  origin_postcode: string;
  destination_postcode: string;
}

interface TravelTimeResponse {
  travel_time_minutes: number;
  distance_miles: number;
  source: 'cache' | 'google_maps' | 'haversine_fallback';
  cached_at?: string;
  api_cost?: number; // £0.005 per call
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
    const { origin_postcode, destination_postcode }: TravelTimeRequest = await req.json();

    // Validate inputs
    if (!origin_postcode || !destination_postcode) {
      return new Response(
        JSON.stringify({ error: 'origin_postcode and destination_postcode required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗺️  Calculating travel time: ${origin_postcode} → ${destination_postcode}`);

    // Step 1: Check cache (7-day TTL)
    const cachedResult = await checkCache(origin_postcode, destination_postcode);
    if (cachedResult) {
      console.log('✅ Cache hit - no API call needed');
      return new Response(
        JSON.stringify(cachedResult),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Cache miss - call Google Maps API
    console.log('❌ Cache miss - calling Google Maps API');
    try {
      const mapsResult = await callGoogleMapsAPI(origin_postcode, destination_postcode);

      // Step 3: Store in cache for 7 days
      await storeInCache(origin_postcode, destination_postcode, mapsResult);

      return new Response(
        JSON.stringify({
          ...mapsResult,
          source: 'google_maps',
          api_cost: 0.005, // £0.005 per API call
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      // Step 4: API failed - use haversine fallback
      console.warn('⚠️  Google Maps API failed, using haversine fallback:', apiError.message);
      const fallbackResult = await haversineFallback(origin_postcode, destination_postcode);

      return new Response(
        JSON.stringify({
          ...fallbackResult,
          source: 'haversine_fallback',
          warning: 'Google Maps API unavailable - using straight-line distance estimate',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error calculating travel time:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Step 1: Check 7-day cache
 */
async function checkCache(
  origin: string,
  destination: string
): Promise<TravelTimeResponse | null> {
  const { data, error } = await supabase
    .from('travel_time_cache')
    .select('*')
    .eq('origin_postcode', origin.toUpperCase())
    .eq('destination_postcode', destination.toUpperCase())
    .gte('expires_at', new Date().toISOString()) // Not expired
    .single();

  if (error || !data) {
    return null; // Cache miss
  }

  return {
    travel_time_minutes: data.travel_time_minutes,
    distance_miles: parseFloat(data.distance_miles),
    source: 'cache',
    cached_at: data.cached_at,
  };
}

/**
 * Step 2: Call Google Maps Distance Matrix API
 */
async function callGoogleMapsAPI(
  origin: string,
  destination: string
): Promise<{ travel_time_minutes: number; distance_miles: number }> {
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('departure_time', 'now'); // Account for current traffic
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.set('units', 'imperial'); // Miles

  const response = await fetch(url.toString());
  const data = await response.json();

  // Error handling
  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const element = data.rows[0]?.elements[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Route not found: ${element?.status || 'Unknown error'}`);
  }

  // Extract travel time and distance
  const travelTimeMinutes = Math.round(element.duration_in_traffic?.value / 60 || element.duration.value / 60);
  const distanceMiles = parseFloat((element.distance.value / 1609.34).toFixed(2)); // Meters to miles

  console.log(`📍 Google Maps result: ${travelTimeMinutes} min, ${distanceMiles} miles`);

  return {
    travel_time_minutes: travelTimeMinutes,
    distance_miles: distanceMiles,
  };
}

/**
 * Step 3: Store result in cache (7-day TTL)
 */
async function storeInCache(
  origin: string,
  destination: string,
  result: { travel_time_minutes: number; distance_miles: number }
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const { error } = await supabase
    .from('travel_time_cache')
    .insert({
      origin_postcode: origin.toUpperCase(),
      destination_postcode: destination.toUpperCase(),
      travel_time_minutes: result.travel_time_minutes,
      distance_miles: result.distance_miles,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.warn('⚠️  Failed to cache result:', error.message);
    // Don't throw - caching failure shouldn't break the request
  } else {
    console.log('💾 Cached for 7 days');
  }
}

/**
 * Step 4: Haversine fallback (straight-line distance estimate)
 * Accuracy: ~70% (good enough for ranking, not billing)
 */
async function haversineFallback(
  origin: string,
  destination: string
): Promise<{ travel_time_minutes: number; distance_miles: number }> {
  // Get lat/long for both postcodes (use Postcodes.io - free UK postcode API)
  const originCoords = await getPostcodeCoords(origin);
  const destinationCoords = await getPostcodeCoords(destination);

  if (!originCoords || !destinationCoords) {
    throw new Error('Could not geocode postcodes');
  }

  // Haversine formula
  const distance = haversineDistance(
    originCoords.latitude,
    originCoords.longitude,
    destinationCoords.latitude,
    destinationCoords.longitude
  );

  // Estimate travel time: distance / avg speed (30 mph urban) × road multiplier (1.3)
  const roadDistance = distance * 1.3; // Account for roads not being straight
  const travelTimeMinutes = Math.round((roadDistance / 30) * 60);

  console.log(`📐 Haversine fallback: ${travelTimeMinutes} min, ${roadDistance.toFixed(2)} miles (estimate)`);

  return {
    travel_time_minutes: travelTimeMinutes,
    distance_miles: parseFloat(roadDistance.toFixed(2)),
  };
}

/**
 * Get lat/long for UK postcode using Postcodes.io (free, no API key)
 */
async function getPostcodeCoords(
  postcode: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await response.json();

    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Haversine formula: Calculate straight-line distance between two lat/long points
 * Returns distance in miles
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}
