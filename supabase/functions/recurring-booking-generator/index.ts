/**
 * Recurring Booking Generator
 * Creates multiple booking instances from recurring pattern
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

  try {
    const {
      client_id,
      site_name,
      site_address,
      site_postcode,
      shift_template_id,
      start_date,
      end_date,
      pattern, // 'weekly', 'biweekly', 'monthly'
      days_of_week, // [1, 3, 5] for Mon, Wed, Fri
      exception_dates, // ['2026-12-25', '2026-01-01']
      base_rate,
      shift_hours,
      confined_space_required,
      trauma_specialist_required,
    } = await req.json();

    const dates = generateRecurringDates(start_date, end_date, pattern, days_of_week, exception_dates);

    console.log(`📅 Generating ${dates.length} recurring bookings from ${start_date} to ${end_date}`);

    // Get shift template if provided
    let templateData = null;
    if (shift_template_id) {
      const { data } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', shift_template_id)
        .single();
      templateData = data;
    }

    // Create parent booking (first instance)
    const parentBooking = {
      client_id,
      site_name,
      site_address,
      site_postcode,
      shift_date: dates[0],
      shift_start_time: templateData?.shift_start_time || '08:00:00',
      shift_end_time: templateData?.shift_end_time || '17:00:00',
      shift_hours: shift_hours || templateData?.shift_hours || 8,
      base_rate: base_rate || templateData?.default_base_rate || 30,
      subtotal: 0,
      vat: 0,
      total: 0,
      platform_fee: 0,
      medic_payout: 0,
      confined_space_required: confined_space_required || false,
      trauma_specialist_required: trauma_specialist_required || false,
      is_recurring: true,
      recurrence_pattern: pattern,
      recurring_until: end_date,
      status: 'pending',
    };

    // Calculate pricing
    const hours = parentBooking.shift_hours;
    const rate = parentBooking.base_rate;
    const subtotal = hours * rate;
    const vat = subtotal * 0.2;
    const total = subtotal + vat;
    const medic_payout = subtotal * 0.6;
    const platform_fee = subtotal * 0.4;

    Object.assign(parentBooking, { subtotal, vat, total, medic_payout, platform_fee });

    const { data: parent, error: parentError } = await supabase
      .from('bookings')
      .insert(parentBooking)
      .select()
      .single();

    if (parentError) throw parentError;

    // Create child bookings (remaining instances)
    const childBookings = dates.slice(1).map(date => ({
      ...parentBooking,
      shift_date: date,
      parent_booking_id: parent.id,
    }));

    const { error: childError } = await supabase
      .from('bookings')
      .insert(childBookings);

    if (childError) throw childError;

    console.log(`✅ Created ${dates.length} bookings (1 parent + ${dates.length - 1} children)`);

    return new Response(
      JSON.stringify({
        success: true,
        parent_booking_id: parent.id,
        total_bookings: dates.length,
        dates,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function generateRecurringDates(
  start: string,
  end: string,
  pattern: string,
  daysOfWeek: number[],
  exceptions: string[]
): string[] {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  const exceptionSet = new Set(exceptions || []);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];

    // Skip exception dates
    if (exceptionSet.has(dateStr)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Check if current day matches pattern
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const shouldInclude = daysOfWeek.includes(dayOfWeek);

    if (shouldInclude) {
      if (pattern === 'weekly') {
        dates.push(dateStr);
      } else if (pattern === 'biweekly') {
        const weekNumber = getWeekNumber(current);
        if (weekNumber % 2 === 0) dates.push(dateStr);
      } else if (pattern === 'monthly') {
        const isFirstOccurrence = dates.filter(d => {
          const prevDate = new Date(d);
          return prevDate.getMonth() === current.getMonth() && prevDate.getDay() === dayOfWeek;
        }).length === 0;
        if (isFirstOccurrence) dates.push(dateStr);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
