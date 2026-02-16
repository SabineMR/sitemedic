/**
 * Medic Availability Management
 * Handles time-off requests, availability calendar, approval workflow
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, PUT', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'request_time_off':
        return await requestTimeOff(req);
      case 'approve_time_off':
        return await approveTimeOff(req);
      case 'deny_time_off':
        return await denyTimeOff(req);
      case 'get_pending_requests':
        return await getPendingRequests(req);
      case 'set_availability':
        return await setAvailability(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function requestTimeOff(req: Request) {
  const { medic_id, start_date, end_date, reason, notes } = await req.json();

  const dates = getDateRange(start_date, end_date);
  const records = dates.map(date => ({
    medic_id,
    date,
    is_available: false,
    request_type: reason,
    status: 'pending_approval',
    reason: notes,
    requested_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('medic_availability').insert(records);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, dates_requested: dates.length }), { headers: { 'Content-Type': 'application/json' } });
}

async function approveTimeOff(req: Request) {
  const { medic_id, dates, approved_by } = await req.json();

  const { error } = await supabase
    .from('medic_availability')
    .update({ status: 'approved', approved_by, approved_at: new Date().toISOString() })
    .eq('medic_id', medic_id)
    .in('date', dates)
    .eq('status', 'pending_approval');

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function denyTimeOff(req: Request) {
  const { medic_id, dates, denial_reason, approved_by } = await req.json();

  const { error } = await supabase
    .from('medic_availability')
    .update({ status: 'denied', denial_reason, approved_by, approved_at: new Date().toISOString() })
    .eq('medic_id', medic_id)
    .in('date', dates)
    .eq('status', 'pending_approval');

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function getPendingRequests(req: Request) {
  const { data, error } = await supabase
    .from('medic_availability')
    .select(`
      *,
      medics!inner(id, first_name, last_name, email)
    `)
    .eq('status', 'pending_approval')
    .order('requested_at', { ascending: false });

  if (error) throw error;

  return new Response(JSON.stringify({ requests: data }), { headers: { 'Content-Type': 'application/json' } });
}

async function setAvailability(req: Request) {
  const { medic_id, date, is_available } = await req.json();

  const { error } = await supabase
    .from('medic_availability')
    .upsert({
      medic_id,
      date,
      is_available,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

function getDateRange(start: string, end: string): string[] {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
