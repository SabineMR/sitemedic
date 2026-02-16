/**
 * Supabase Edge Function: medic-location-ping
 *
 * Receives GPS location pings from medic mobile apps and stores them in the database.
 *
 * WHY: Mobile apps send location pings every 30 seconds. We need an API endpoint that can
 * handle high-frequency updates (1000+ pings per day per medic) efficiently without
 * overwhelming the database.
 *
 * FEATURES:
 * - Batch processing (group multiple pings into one transaction)
 * - Rate limiting (prevent abuse/bugs from flooding database)
 * - Validation (UK coordinates, recent timestamps, accuracy thresholds)
 * - RLS enforcement (medics can only submit their own location)
 * - Audit logging (log to medic_location_audit table)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Types
interface LocationPing {
  medic_id: string;
  booking_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  altitude_meters?: number;
  heading_degrees?: number;
  speed_mps?: number;
  battery_level: number;
  connection_type: string;
  gps_provider: string;
  recorded_at: string; // ISO 8601 timestamp
  is_offline_queued: boolean;
  is_background: boolean;
}

interface PingRequest {
  pings: LocationPing[]; // Support batch insert
}

// Rate limiting: Max 120 pings per hour per medic (1 ping every 30 seconds)
const RATE_LIMIT_PINGS_PER_HOUR = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Validation constraints
const UK_LAT_MIN = 49.9; // Southern tip (Cornwall)
const UK_LAT_MAX = 60.9; // Northern tip (Shetland Islands)
const UK_LNG_MIN = -8.6; // Western edge (Ireland border)
const UK_LNG_MAX = 2.0; // Eastern edge (East Anglia)
const MAX_ACCURACY_METERS = 500; // Reject pings with accuracy >500m (very unreliable)
const MAX_PING_AGE_MINUTES = 60; // Reject pings older than 60 minutes

// Rate limiting storage (in-memory - resets when function cold-starts)
// For production, use Redis or Supabase table with TTL
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for medic
 */
function checkRateLimit(medicId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = `medic:${medicId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // New window or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_PINGS_PER_HOUR - 1 };
  }

  if (record.count >= RATE_LIMIT_PINGS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_PINGS_PER_HOUR - record.count };
}

/**
 * Validate location ping
 */
function validatePing(ping: LocationPing): { valid: boolean; error?: string } {
  // Check required fields
  if (!ping.medic_id || !ping.booking_id) {
    return { valid: false, error: 'Missing medic_id or booking_id' };
  }

  // Validate coordinates are within UK bounds
  if (
    ping.latitude < UK_LAT_MIN ||
    ping.latitude > UK_LAT_MAX ||
    ping.longitude < UK_LNG_MIN ||
    ping.longitude > UK_LNG_MAX
  ) {
    return {
      valid: false,
      error: `Coordinates outside UK bounds: lat=${ping.latitude}, lng=${ping.longitude}`,
    };
  }

  // Validate accuracy is reasonable
  if (ping.accuracy_meters > MAX_ACCURACY_METERS) {
    return {
      valid: false,
      error: `Accuracy too low: ${ping.accuracy_meters}m (max ${MAX_ACCURACY_METERS}m)`,
    };
  }

  // Validate timestamp is recent (not too old)
  const recordedAt = new Date(ping.recorded_at);
  const ageMinutes = (Date.now() - recordedAt.getTime()) / 1000 / 60;
  if (ageMinutes > MAX_PING_AGE_MINUTES) {
    return {
      valid: false,
      error: `Ping too old: ${ageMinutes.toFixed(0)} minutes (max ${MAX_PING_AGE_MINUTES} minutes)`,
    };
  }

  // Validate timestamp is not in the future (clock skew protection)
  if (recordedAt.getTime() > Date.now() + 60000) {
    // Allow 1 minute clock skew
    return {
      valid: false,
      error: 'Ping timestamp is in the future (check device clock)',
    };
  }

  // Validate battery level
  if (ping.battery_level < 0 || ping.battery_level > 100) {
    return { valid: false, error: `Invalid battery level: ${ping.battery_level}` };
  }

  return { valid: true };
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Supabase client with user's auth context (enforces RLS)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: PingRequest = await req.json();
    const pings = body.pings || [];

    if (pings.length === 0) {
      return new Response(JSON.stringify({ error: 'No pings provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit batch size (prevent extremely large batches)
    const MAX_BATCH_SIZE = 50;
    if (pings.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Batch too large (max ${MAX_BATCH_SIZE} pings)` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate all pings
    const validationErrors: string[] = [];
    for (let i = 0; i < pings.length; i++) {
      const ping = pings[i];
      const validation = validatePing(ping);
      if (!validation.valid) {
        validationErrors.push(`Ping ${i}: ${validation.error}`);
      }

      // Ensure medic can only submit their own pings (additional check beyond RLS)
      if (ping.medic_id !== user.id) {
        validationErrors.push(`Ping ${i}: Cannot submit pings for other medics`);
      }
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationErrors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limit (use first ping's medic_id since all should be same)
    const medicId = pings[0].medic_id;
    const rateLimit = checkRateLimit(medicId);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_PINGS_PER_HOUR} pings per hour`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT_PINGS_PER_HOUR.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Insert pings (batch insert for performance)
    const { data, error: insertError } = await supabaseClient
      .from('medic_location_pings')
      .insert(pings)
      .select();

    if (insertError) {
      console.error('Error inserting pings:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Failed to insert pings',
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create audit log entry
    await supabaseClient.from('medic_location_audit').insert({
      medic_id: medicId,
      booking_id: pings[0].booking_id,
      action_type: 'location_ping_received',
      action_timestamp: new Date().toISOString(),
      actor_type: 'medic',
      actor_user_id: user.id,
      description: `Received ${pings.length} location ping(s)`,
      metadata: {
        ping_count: pings.length,
        offline_queued: pings.some((p) => p.is_offline_queued),
        avg_accuracy: pings.reduce((sum, p) => sum + p.accuracy_meters, 0) / pings.length,
        avg_battery: pings.reduce((sum, p) => sum + p.battery_level, 0) / pings.length,
      },
    });

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        inserted: pings.length,
        rate_limit: {
          limit: RATE_LIMIT_PINGS_PER_HOUR,
          remaining: rateLimit.remaining,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT_PINGS_PER_HOUR.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
