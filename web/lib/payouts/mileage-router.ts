/**
 * Daily Mileage Router
 *
 * Calculates per-leg mileage reimbursement for a medic's full working day
 * and writes the results to each booking's timesheet.
 *
 * Algorithm:
 *   1. Fetch all confirmed/completed bookings for the medic on the given date,
 *      ordered by shift start time.
 *   2. Build the day's route chain:
 *        single site:  home → site → home
 *        multi-site:   home → site1 → site2 → ... → siteN → home
 *   3. For each leg, check travel_time_cache (7-day TTL).
 *      On cache miss: call Google Maps Distance Matrix API and cache result.
 *   4. Assign leg miles to each booking's timesheet:
 *        Booking 1:     home → site1  miles
 *        Booking 2:     site1 → site2  miles
 *        ...
 *        Last booking:  site(N-1) → siteN  miles  +  siteN → home  miles
 *   5. Calculate mileage_reimbursement = leg_miles × HMRC rate (£0.45/mile).
 *   6. Update timesheets: mileage_miles, mileage_rate_pence, mileage_reimbursement.
 *
 * Key decisions:
 *   - Detours are ignored — we reimburse the Google Maps road distance between
 *     postcodes, not actual GPS tracking.
 *   - The return home always attaches to the LAST booking of the day.
 *   - travel_time_cache is keyed by (origin_postcode, destination_postcode) and
 *     supports arbitrary pairs, not just home→site.
 *   - HMRC rate is snapshotted at time of calculation onto the timesheet so
 *     rate changes do not affect historical records.
 */

import { createClient } from '@/lib/supabase/server';
import { HMRC_MILEAGE_RATE_PENCE, calculateMileageReimbursement } from '@/lib/medics/experience';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const CACHE_TTL_DAYS = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MileageLeg {
  from: string;    // Origin postcode
  to: string;      // Destination postcode
  miles: number;   // Road distance (one direction, this specific leg)
  cached: boolean; // true = came from travel_time_cache
}

export interface BookingMileageResult {
  bookingId: string;
  timesheetId: string | null;  // null if no timesheet exists yet
  sitePostcode: string;
  legMiles: number;            // Miles assigned to this booking
  mileageReimbursement: number; // GBP reimbursement
  mileageRatePence: number;    // Snapshot of HMRC rate used
  legs: MileageLeg[];          // The specific legs contributing to this booking's miles
  updated: boolean;            // Whether the timesheet was updated
}

export interface DailyMileageResult {
  medicId: string;
  date: string;
  homePostcode: string;
  totalMiles: number;          // Sum of all leg miles for the day
  totalReimbursement: number;  // Sum of all mileage_reimbursement values
  bookings: BookingMileageResult[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Google Maps helper
// ---------------------------------------------------------------------------

/**
 * Look up distance between two postcodes.
 * Checks travel_time_cache first; falls back to Google Maps Distance Matrix API.
 */
async function getDistanceMiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  originPostcode: string,
  destinationPostcode: string
): Promise<{ miles: number; cached: boolean }> {
  // Normalise postcodes to uppercase with no trailing spaces
  const origin = originPostcode.trim().toUpperCase();
  const destination = destinationPostcode.trim().toUpperCase();

  if (origin === destination) {
    return { miles: 0, cached: true };
  }

  // 1. Cache check
  const { data: cached } = await supabase
    .from('travel_time_cache')
    .select('distance_miles')
    .eq('origin_postcode', origin)
    .eq('destination_postcode', destination)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return { miles: Number(cached.distance_miles), cached: true };
  }

  // 2. Google Maps Distance Matrix API
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Maps API HTTP error: ${res.status}`);
  }

  const data = await res.json();
  const element = data.rows?.[0]?.elements?.[0];

  if (element?.status !== 'OK') {
    throw new Error(
      `Google Maps could not route ${origin} → ${destination}: ${element?.status ?? 'unknown'}`
    );
  }

  // Convert metres → miles
  const miles = Number((element.distance.value / 1609.34).toFixed(2));
  const travelTimeMinutes = Math.round(element.duration.value / 60);

  // Cache for 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await supabase.from('travel_time_cache').upsert(
    {
      origin_postcode: origin,
      destination_postcode: destination,
      distance_miles: miles,
      travel_time_minutes: travelTimeMinutes,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'origin_postcode,destination_postcode' }
  );

  return { miles, cached: false };
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

/**
 * Calculate and persist mileage for all of a medic's bookings on a given date.
 *
 * @param medicId - UUID of the medic
 * @param date    - ISO date string (YYYY-MM-DD)
 * @returns       DailyMileageResult with per-booking breakdown
 */
export async function routeDailyMileage(
  medicId: string,
  date: string
): Promise<DailyMileageResult> {
  const supabase = await createClient();
  const errors: string[] = [];

  // 1. Fetch medic home postcode
  const { data: medic, error: medicError } = await supabase
    .from('medics')
    .select('home_postcode')
    .eq('id', medicId)
    .single();

  if (medicError || !medic?.home_postcode) {
    throw new Error(`Medic ${medicId} not found or missing home_postcode`);
  }

  const homePostcode = medic.home_postcode.trim().toUpperCase();

  // 2. Fetch all bookings for this medic on this date, ordered by shift start time
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      site_postcode,
      shift_start_time,
      timesheets ( id )
    `)
    .eq('assigned_medic_id', medicId)
    .eq('shift_date', date)
    .in('status', ['confirmed', 'completed'])
    .order('shift_start_time', { ascending: true });

  if (bookingsError) {
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
  }

  if (!bookings || bookings.length === 0) {
    return {
      medicId,
      date,
      homePostcode,
      totalMiles: 0,
      totalReimbursement: 0,
      bookings: [],
      errors: [],
    };
  }

  // 3. Build the ordered list of postcodes for the day's route
  //    Route: home → site1 → site2 → ... → siteN → home
  const sitePostcodes = bookings.map(b => b.site_postcode.trim().toUpperCase());
  const routePostcodes = [homePostcode, ...sitePostcodes, homePostcode];

  // 4. Fetch distance for each leg in the route
  //    Legs: [home→site1, site1→site2, ..., siteN→home]
  //    There are bookings.length + 1 legs (N sites + return home = N+1 legs)
  const routeLegs: MileageLeg[] = [];

  for (let i = 0; i < routePostcodes.length - 1; i++) {
    const from = routePostcodes[i];
    const to   = routePostcodes[i + 1];
    try {
      const { miles, cached } = await getDistanceMiles(supabase, from, to);
      routeLegs.push({ from, to, miles, cached });
    } catch (err: any) {
      errors.push(`Leg ${from} → ${to}: ${err.message}`);
      routeLegs.push({ from, to, miles: 0, cached: false });
    }
  }

  // 5. Assign legs to bookings
  //
  //    routeLegs layout for N bookings:
  //      routeLegs[0]       → home → site1        (booking 0's inbound leg)
  //      routeLegs[1]       → site1 → site2       (booking 1's inbound leg)
  //      ...
  //      routeLegs[N-1]     → site(N-1) → siteN   (booking N-1's inbound leg)
  //      routeLegs[N]       → siteN → home         (return home, added to last booking)
  //
  //    Each booking gets its inbound leg.
  //    The last booking also gets the return-home leg.

  const bookingResults: BookingMileageResult[] = [];

  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i];
    const isLast  = i === bookings.length - 1;

    const inboundLeg = routeLegs[i];               // leg to reach this site
    const returnLeg  = isLast ? routeLegs[bookings.length] : null; // return home (last booking only)

    const contributingLegs = returnLeg ? [inboundLeg, returnLeg] : [inboundLeg];
    const legMiles = contributingLegs.reduce((sum, l) => sum + l.miles, 0);
    const legMilesRounded = parseFloat(legMiles.toFixed(2));

    const mileageReimbursement = calculateMileageReimbursement(legMilesRounded);

    // 6. Update the timesheet
    const timesheetRaw = (booking.timesheets as any);
    // timesheets is a one-to-one join: could be array or single object
    const timesheetObj = Array.isArray(timesheetRaw) ? timesheetRaw[0] : timesheetRaw;
    const timesheetId: string | null = timesheetObj?.id ?? null;

    let updated = false;
    if (timesheetId) {
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({
          mileage_miles: legMilesRounded,
          mileage_rate_pence: HMRC_MILEAGE_RATE_PENCE,
          mileage_reimbursement: mileageReimbursement,
        })
        .eq('id', timesheetId);

      if (updateError) {
        errors.push(`Timesheet ${timesheetId}: ${updateError.message}`);
      } else {
        updated = true;
      }
    }

    bookingResults.push({
      bookingId: booking.id,
      timesheetId,
      sitePostcode: booking.site_postcode,
      legMiles: legMilesRounded,
      mileageReimbursement,
      mileageRatePence: HMRC_MILEAGE_RATE_PENCE,
      legs: contributingLegs,
      updated,
    });
  }

  const totalMiles = parseFloat(
    bookingResults.reduce((sum, b) => sum + b.legMiles, 0).toFixed(2)
  );
  const totalReimbursement = parseFloat(
    bookingResults.reduce((sum, b) => sum + b.mileageReimbursement, 0).toFixed(2)
  );

  return {
    medicId,
    date,
    homePostcode,
    totalMiles,
    totalReimbursement,
    bookings: bookingResults,
    errors,
  };
}
