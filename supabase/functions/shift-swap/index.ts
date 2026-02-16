/**
 * Shift Swap Marketplace
 * Peer-to-peer shift swaps with admin approval
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
      case 'offer_swap':
        return await offerSwap(req);
      case 'accept_swap':
        return await acceptSwap(req);
      case 'approve_swap':
        return await approveSwap(req);
      case 'deny_swap':
        return await denySwap(req);
      case 'get_available_swaps':
        return await getAvailableSwaps(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function offerSwap(req: Request) {
  const { booking_id, requesting_medic_id, swap_reason } = await req.json();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, medics!inner(*)')
    .eq('id', booking_id)
    .single();

  if (!booking) throw new Error('Booking not found');

  const { error } = await supabase.from('shift_swaps').insert({
    booking_id,
    requesting_medic_id,
    swap_reason,
    status: 'pending_acceptance',
  });

  if (error) throw error;

  // Broadcast to qualified medics (notification handled separately)
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function acceptSwap(req: Request) {
  const { swap_id, accepting_medic_id } = await req.json();

  // Check if medic qualifies
  const { data: swap } = await supabase
    .from('shift_swaps')
    .select(`
      *,
      bookings!inner(
        confined_space_required,
        trauma_specialist_required
      )
    `)
    .eq('id', swap_id)
    .single();

  if (!swap) throw new Error('Swap not found');

  const { data: medic } = await supabase
    .from('medics')
    .select('has_confined_space_cert, has_trauma_cert')
    .eq('id', accepting_medic_id)
    .single();

  const qualified =
    (!swap.bookings.confined_space_required || medic.has_confined_space_cert) &&
    (!swap.bookings.trauma_specialist_required || medic.has_trauma_cert);

  const { error } = await supabase
    .from('shift_swaps')
    .update({
      accepting_medic_id,
      status: 'pending_approval',
      accepting_medic_qualified: qualified,
      qualification_warnings: qualified ? null : { warnings: 'Missing required certifications' },
    })
    .eq('id', swap_id);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, qualified }), { headers: { 'Content-Type': 'application/json' } });
}

async function approveSwap(req: Request) {
  const { swap_id, admin_user_id } = await req.json();

  const { data: swap } = await supabase
    .from('shift_swaps')
    .select('booking_id, accepting_medic_id')
    .eq('id', swap_id)
    .single();

  if (!swap) throw new Error('Swap not found');

  // Update booking with new medic
  await supabase
    .from('bookings')
    .update({ medic_id: swap.accepting_medic_id })
    .eq('id', swap.booking_id);

  // Mark swap approved
  await supabase
    .from('shift_swaps')
    .update({
      status: 'approved',
      admin_approved_by: admin_user_id,
      admin_approved_at: new Date().toISOString(),
    })
    .eq('id', swap_id);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function denySwap(req: Request) {
  const { swap_id, admin_user_id, denial_reason } = await req.json();

  const { error } = await supabase
    .from('shift_swaps')
    .update({
      status: 'denied',
      admin_approved_by: admin_user_id,
      admin_approved_at: new Date().toISOString(),
      admin_denial_reason: denial_reason,
    })
    .eq('id', swap_id);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function getAvailableSwaps(req: Request) {
  const { medic_id } = await req.json();

  const { data, error } = await supabase
    .from('shift_swaps')
    .select(`
      *,
      bookings!inner(*),
      requesting_medic:medics!requesting_medic_id(first_name, last_name)
    `)
    .eq('status', 'pending_acceptance')
    .neq('requesting_medic_id', medic_id); // Don't show own swaps

  if (error) throw error;

  return new Response(JSON.stringify({ swaps: data }), { headers: { 'Content-Type': 'application/json' } });
}
