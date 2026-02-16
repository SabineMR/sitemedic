/**
 * Last-Minute Auto-Fill - Urgent Shift Broadcast
 * For bookings < 24 hours: Send simultaneous notifications to all available medics
 * First to accept gets the shift (Uber-style)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'broadcast':
        return await broadcastUrgentShift(req);
      case 'accept':
        return await acceptUrgentShift(req);
      case 'check_urgent':
        return await checkUrgentBookings(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function broadcastUrgentShift(req: Request) {
  const { booking_id } = await req.json();

  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:clients(company_name)')
    .eq('id', booking_id)
    .single();

  if (!booking) throw new Error('Booking not found');

  // Calculate hours until shift
  const shiftStart = new Date(`${booking.shift_date}T${booking.shift_start_time}`);
  const hoursUntil = (shiftStart.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntil > 24) {
    return new Response(JSON.stringify({
      error: 'Not urgent - shift is more than 24 hours away',
      hours_until: hoursUntil
    }), { status: 400 });
  }

  // Auto-apply urgency premium
  let urgencyPremium = 0;
  if (hoursUntil < 1) urgencyPremium = 75;
  else if (hoursUntil <= 3) urgencyPremium = 50;
  else if (hoursUntil <= 6) urgencyPremium = 20;

  await supabase
    .from('bookings')
    .update({ urgency_premium_percent: urgencyPremium })
    .eq('id', booking_id);

  // Find eligible medics (within 30 miles + opted-in to rush jobs)
  const { data: medics } = await supabase
    .from('medics')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      home_postcode,
      medic_preferences!inner(available_for_rush_jobs, push_notifications_enabled)
    `)
    .eq('available_for_work', true)
    .eq('medic_preferences.available_for_rush_jobs', true);

  if (!medics || medics.length === 0) {
    return new Response(JSON.stringify({
      error: 'No medics available for rush jobs',
      fallback: 'Try expanding search radius'
    }), { status: 404 });
  }

  // Filter by distance (simplified - in production, use travel_time_cache)
  const eligibleMedics = medics; // TODO: Filter by 30-mile radius

  // Calculate boosted rate
  const baseRate = booking.base_rate || 30;
  const boostedRate = baseRate * (1 + urgencyPremium / 100);

  // Send simultaneous notifications to all eligible medics
  const notifications = [];
  for (const medic of eligibleMedics) {
    const message = {
      title: `🚨 URGENT: Medic Needed ${Math.round(hoursUntil)}h`,
      body: `${booking.site_name} - ${booking.shift_date} ${booking.shift_start_time}. £${boostedRate.toFixed(2)}/hr (+${urgencyPremium}% premium). First to accept gets shift!`,
      data: {
        booking_id,
        urgency: 'high',
        premium_percent: urgencyPremium,
        boosted_rate: boostedRate,
      },
    };

    // Send notification
    const notifResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        type: 'urgent_shift_available',
        booking_id,
        medic_id: medic.id,
        custom_message: message,
      }),
    });

    notifications.push({
      medic_id: medic.id,
      medic_name: `${medic.first_name} ${medic.last_name}`,
      sent: notifResponse.ok,
    });
  }

  // Set 15-minute fallback timer (expand radius if no response)
  await supabase
    .from('bookings')
    .update({
      status: 'urgent_broadcast',
      broadcast_at: new Date().toISOString(),
      broadcast_medics: eligibleMedics.map(m => m.id),
    })
    .eq('id', booking_id);

  return new Response(JSON.stringify({
    success: true,
    broadcast_to: notifications.length,
    urgency_premium: urgencyPremium,
    boosted_rate: boostedRate,
    hours_until_shift: hoursUntil,
    medics_notified: notifications,
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function acceptUrgentShift(req: Request) {
  const { booking_id, medic_id } = await req.json();

  // Check if still available (race condition check)
  const { data: booking } = await supabase
    .from('bookings')
    .select('medic_id, status, broadcast_at')
    .eq('id', booking_id)
    .single();

  if (booking.medic_id) {
    return new Response(JSON.stringify({
      error: 'Shift already taken',
      assigned_to: booking.medic_id,
    }), { status: 409 });
  }

  if (booking.status !== 'urgent_broadcast') {
    return new Response(JSON.stringify({
      error: 'Shift no longer in urgent broadcast mode',
    }), { status: 400 });
  }

  // FIRST TO ACCEPT WINS - Assign immediately
  const { error } = await supabase
    .from('bookings')
    .update({
      medic_id,
      status: 'confirmed',
      accepted_at: new Date().toISOString(),
      response_time_minutes: Math.round((Date.now() - new Date(booking.broadcast_at).getTime()) / (1000 * 60)),
    })
    .eq('id', booking_id)
    .is('medic_id', null); // Atomic check - only update if still null

  if (error) {
    return new Response(JSON.stringify({
      error: 'Failed to accept shift - may have been taken by another medic',
    }), { status: 409 });
  }

  // Update fair distribution tracking
  await supabase.rpc('increment_shifts_worked', { medic_id });

  // Send confirmation to winning medic
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      type: 'shift_assigned',
      booking_id,
      medic_id,
    }),
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Shift accepted! Check My Schedule for details.',
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function checkUrgentBookings(req: Request) {
  // Find all bookings < 24 hours that are still unassigned
  const twentyFourHoursFromNow = new Date();
  twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

  const { data: urgentBookings } = await supabase
    .from('bookings')
    .select('id, site_name, shift_date, shift_start_time, status')
    .is('medic_id', null)
    .eq('status', 'pending')
    .lte('shift_date', twentyFourHoursFromNow.toISOString().split('T')[0]);

  return new Response(JSON.stringify({
    urgent_count: urgentBookings?.length || 0,
    bookings: urgentBookings,
  }), { headers: { 'Content-Type': 'application/json' } });
}
