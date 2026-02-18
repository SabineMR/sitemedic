/**
 * Fetch Combined Busy Blocks API
 *
 * Returns all busy blocks for medics in a given week, combining:
 * 1. Google Calendar events (for medics with GCal connected)
 * 2. Manual busy blocks from medic_availability table
 * 3. Approved time-off requests from medic_availability
 *
 * Used by the admin schedule board to show medic unavailability.
 *
 * Query params:
 * - weekStart: ISO date string (Monday of the week)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, fetchFreeBusy } from '@/lib/google-calendar/client';
import type { BusyBlock, BusyBlocksResponse } from '@/lib/google-calendar/types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get('weekStart');
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart parameter required' }, { status: 400 });
  }

  // Calculate week end (Sunday)
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  const weekEnd = endDate.toISOString().split('T')[0];

  const busyBlocks: Record<string, BusyBlock[]> = {};

  // 1. Fetch manual busy blocks + time-off from medic_availability
  const { data: manualBlocks } = await supabase
    .from('medic_availability')
    .select('id, medic_id, date, reason, request_type')
    .eq('is_available', false)
    .eq('status', 'approved')
    .gte('date', weekStart)
    .lte('date', weekEnd);

  if (manualBlocks) {
    for (const block of manualBlocks) {
      const medicId = block.medic_id;
      if (!busyBlocks[medicId]) busyBlocks[medicId] = [];

      const source: BusyBlock['source'] =
        block.request_type === 'time_off' || block.request_type === 'sick'
          ? 'time_off'
          : 'manual';

      busyBlocks[medicId].push({
        id: block.id,
        medicId,
        source,
        title: block.reason || (source === 'time_off' ? 'Time Off' : 'Busy'),
        date: block.date,
        startTime: '00:00',
        endTime: '23:59',
        reason: block.reason,
      });
    }
  }

  // 2. Fetch Google Calendar busy times for connected medics
  const { data: gcalMedics } = await supabase
    .from('medic_preferences')
    .select('medic_id')
    .eq('google_calendar_enabled', true)
    .eq('google_calendar_sync_enabled', true);

  if (gcalMedics) {
    const timeMin = new Date(`${weekStart}T00:00:00Z`).toISOString();
    const timeMax = new Date(`${weekEnd}T23:59:59Z`).toISOString();

    // Fetch Google Calendar busy times in parallel (max 10 concurrent)
    const gcalPromises = gcalMedics.map(async ({ medic_id }) => {
      try {
        const accessToken = await getValidAccessToken(medic_id);
        if (!accessToken) return;

        const busyTimes = await fetchFreeBusy(accessToken, timeMin, timeMax);

        if (!busyBlocks[medic_id]) busyBlocks[medic_id] = [];

        for (const slot of busyTimes) {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          const date = slotStart.toISOString().split('T')[0];
          const startTime = slotStart.toTimeString().slice(0, 5);
          const endTime = slotEnd.toTimeString().slice(0, 5);

          busyBlocks[medic_id].push({
            id: `gcal_${medic_id}_${slot.start}`,
            medicId: medic_id,
            source: 'google_calendar',
            title: 'GCal: Busy',
            date,
            startTime,
            endTime,
          });
        }
      } catch (err) {
        console.error(`[BusyBlocks] Failed to fetch GCal for medic ${medic_id}:`, err);
      }
    });

    await Promise.all(gcalPromises);
  }

  const response: BusyBlocksResponse = { busyBlocks };
  return NextResponse.json(response);
}
