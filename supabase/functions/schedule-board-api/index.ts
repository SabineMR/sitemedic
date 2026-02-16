/**
 * Schedule Board Data API
 * Provides data for admin schedule board UI (drag-and-drop calendar)
 * Returns structured data for week/month views
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get('view') || 'week';
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    if (view === 'week') {
      return await getWeekView(date);
    } else if (view === 'month') {
      return await getMonthView(date);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid view' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function getWeekView(dateStr: string) {
  const date = new Date(dateStr);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday

  // Get all bookings for the week
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      medics(id, first_name, last_name, star_rating),
      clients(id, company_name)
    `)
    .gte('shift_date', weekStart.toISOString().split('T')[0])
    .lte('shift_date', weekEnd.toISOString().split('T')[0])
    .order('shift_date', { ascending: true })
    .order('shift_start_time', { ascending: true });

  // Get all medics with their weekly stats
  const { data: medics } = await supabase
    .from('medics')
    .select('id, first_name, last_name, star_rating, has_confined_space_cert, has_trauma_cert, available_for_work')
    .eq('available_for_work', true)
    .order('first_name', { ascending: true });

  // Calculate utilization for each medic
  const medicsWithStats = await Promise.all((medics || []).map(async (medic) => {
    const medicBookings = bookings?.filter(b => b.medics?.id === medic.id) || [];
    const totalHours = medicBookings.reduce((sum, b) => sum + (b.shift_hours || 0), 0);
    const utilization = (totalHours / 40) * 100; // % of 40-hour week

    return {
      ...medic,
      weekly_hours: totalHours,
      utilization_percent: utilization,
      shifts_this_week: medicBookings.length,
    };
  }));

  // Organize bookings by date
  const bookingsByDate: Record<string, any[]> = {};
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateKey = d.toISOString().split('T')[0];
    dates.push(dateKey);
    bookingsByDate[dateKey] = bookings?.filter(b => b.shift_date === dateKey) || [];
  }

  return new Response(JSON.stringify({
    view: 'week',
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    dates,
    medics: medicsWithStats,
    bookings_by_date: bookingsByDate,
    total_bookings: bookings?.length || 0,
    unassigned_count: bookings?.filter(b => !b.medic_id).length || 0,
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function getMonthView(dateStr: string) {
  const date = new Date(dateStr);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  // Get all bookings for the month
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      medics(id, first_name, last_name),
      clients(id, company_name)
    `)
    .gte('shift_date', monthStart.toISOString().split('T')[0])
    .lte('shift_date', monthEnd.toISOString().split('T')[0])
    .order('shift_date', { ascending: true });

  // Group bookings by date
  const bookingsByDate: Record<string, any[]> = {};
  bookings?.forEach(booking => {
    if (!bookingsByDate[booking.shift_date]) {
      bookingsByDate[booking.shift_date] = [];
    }
    bookingsByDate[booking.shift_date].push(booking);
  });

  // Calculate daily stats
  const dailyStats: Record<string, any> = {};
  Object.keys(bookingsByDate).forEach(date => {
    const dayBookings = bookingsByDate[date];
    dailyStats[date] = {
      total: dayBookings.length,
      confirmed: dayBookings.filter(b => b.status === 'confirmed').length,
      pending: dayBookings.filter(b => !b.medic_id).length,
      urgent: dayBookings.filter(b => b.urgency_premium_percent > 0).length,
    };
  });

  return new Response(JSON.stringify({
    view: 'month',
    month_start: monthStart.toISOString().split('T')[0],
    month_end: monthEnd.toISOString().split('T')[0],
    bookings_by_date: bookingsByDate,
    daily_stats: dailyStats,
    total_bookings: bookings?.length || 0,
    total_confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
    total_pending: bookings?.filter(b => !b.medic_id).length || 0,
  }), { headers: { 'Content-Type': 'application/json' } });
}
