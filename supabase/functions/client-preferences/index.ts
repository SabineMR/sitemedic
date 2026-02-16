/**
 * Client Preferences & Self-Service Features
 * Handles favorite medics, ratings, and client-medic relationships
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'add_favorite':
        return await addFavoriteMedic(req);
      case 'remove_favorite':
        return await removeFavoriteMedic(req);
      case 'get_favorites':
        return await getFavoriteMedics(req);
      case 'rate_medic':
        return await rateMedic(req);
      case 'request_medic':
        return await requestSpecificMedic(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function addFavoriteMedic(req: Request) {
  const { client_id, medic_id, notes } = await req.json();

  // Check if already favorited
  const { data: existing } = await supabase
    .from('client_favorite_medics')
    .select('id')
    .eq('client_id', client_id)
    .eq('medic_id', medic_id)
    .single();

  if (existing) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Medic already in favorites',
    }), { status: 400 });
  }

  // Get medic details
  const { data: medic } = await supabase
    .from('medics')
    .select('first_name, last_name, star_rating')
    .eq('id', medic_id)
    .single();

  if (!medic) {
    return new Response(JSON.stringify({ error: 'Medic not found' }), { status: 404 });
  }

  // Add to favorites
  const { error } = await supabase
    .from('client_favorite_medics')
    .insert({
      client_id,
      medic_id,
      notes,
      favorited_at: new Date().toISOString(),
      total_shifts_together: 0,
      avg_client_rating: 0,
    });

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    medic_name: `${medic.first_name} ${medic.last_name}`,
    message: 'Medic added to favorites',
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function removeFavoriteMedic(req: Request) {
  const { client_id, medic_id } = await req.json();

  const { error } = await supabase
    .from('client_favorite_medics')
    .delete()
    .eq('client_id', client_id)
    .eq('medic_id', medic_id);

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    message: 'Medic removed from favorites',
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function getFavoriteMedics(req: Request) {
  const { client_id } = await req.json();

  const { data: favorites, error } = await supabase
    .from('client_favorite_medics')
    .select(`
      *,
      medics!inner(
        id,
        first_name,
        last_name,
        star_rating,
        total_shifts_completed,
        has_confined_space_cert,
        has_trauma_cert
      )
    `)
    .eq('client_id', client_id)
    .order('favorited_at', { ascending: false });

  if (error) throw error;

  return new Response(JSON.stringify({
    favorites: favorites || [],
    total: favorites?.length || 0,
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function rateMedic(req: Request) {
  const { client_id, medic_id, booking_id, rating, feedback } = await req.json();

  if (rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), { status: 400 });
  }

  // Update booking with rating
  await supabase
    .from('bookings')
    .update({
      client_rating: rating,
      client_feedback: feedback,
      rated_at: new Date().toISOString(),
    })
    .eq('id', booking_id);

  // Update medic's average star rating
  const { data: allRatings } = await supabase
    .from('bookings')
    .select('client_rating')
    .eq('medic_id', medic_id)
    .not('client_rating', 'is', null);

  if (allRatings && allRatings.length > 0) {
    const avgRating = allRatings.reduce((sum, b) => sum + b.client_rating, 0) / allRatings.length;

    await supabase
      .from('medics')
      .update({ star_rating: avgRating })
      .eq('id', medic_id);
  }

  // Update client-medic relationship if favorited
  const { data: favorite } = await supabase
    .from('client_favorite_medics')
    .select('id, total_shifts_together')
    .eq('client_id', client_id)
    .eq('medic_id', medic_id)
    .single();

  if (favorite) {
    await supabase
      .from('client_favorite_medics')
      .update({
        total_shifts_together: favorite.total_shifts_together + 1,
        avg_client_rating: rating, // Simplified - should be running average
      })
      .eq('id', favorite.id);
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Rating submitted',
    new_average: allRatings ? (allRatings.reduce((sum, b) => sum + b.client_rating, 0) / allRatings.length) : rating,
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function requestSpecificMedic(req: Request) {
  const { booking_id, requested_medic_id } = await req.json();

  // Get booking and medic details
  const { data: booking } = await supabase
    .from('bookings')
    .select('client_id, shift_date, shift_start_time, shift_end_time, confined_space_required, trauma_specialist_required')
    .eq('id', booking_id)
    .single();

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
  }

  // Check if medic is available
  const { data: medic } = await supabase
    .from('medics')
    .select('id, first_name, last_name, available_for_work, has_confined_space_cert, has_trauma_cert')
    .eq('id', requested_medic_id)
    .single();

  if (!medic || !medic.available_for_work) {
    return new Response(JSON.stringify({
      success: false,
      reason: 'Medic not available',
      fallback: 'Use auto-assign to find alternative medics',
    }), { status: 400 });
  }

  // Check qualifications
  const qualified =
    (!booking.confined_space_required || medic.has_confined_space_cert) &&
    (!booking.trauma_specialist_required || medic.has_trauma_cert);

  if (!qualified) {
    return new Response(JSON.stringify({
      success: false,
      reason: 'Requested medic lacks required certifications',
      fallback: 'Use auto-assign to find qualified medics',
    }), { status: 400 });
  }

  // Run conflict check
  const conflictResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/conflict-detector`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      booking_id,
      medic_id: requested_medic_id,
      shift_date: booking.shift_date,
      shift_start_time: booking.shift_start_time,
      shift_end_time: booking.shift_end_time,
      confined_space_required: booking.confined_space_required,
      trauma_specialist_required: booking.trauma_specialist_required,
    }),
  });

  const conflictData = await conflictResponse.json();

  if (!conflictData.can_assign) {
    return new Response(JSON.stringify({
      success: false,
      reason: 'Conflicts detected',
      conflicts: conflictData.conflicts,
      fallback: 'Use auto-assign to find alternative medics',
    }), { status: 400 });
  }

  // All checks passed - assign requested medic with 95% priority flag
  await supabase
    .from('bookings')
    .update({
      medic_id: requested_medic_id,
      status: 'confirmed',
      auto_matched: false,
      requested_by_client: true,
      match_score: 95, // High priority for client requests
    })
    .eq('id', booking_id);

  return new Response(JSON.stringify({
    success: true,
    medic_name: `${medic.first_name} ${medic.last_name}`,
    message: 'Requested medic assigned',
    warnings: conflictData.warnings || [],
  }), { headers: { 'Content-Type': 'application/json' } });
}
