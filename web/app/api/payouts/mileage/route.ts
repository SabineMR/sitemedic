/**
 * POST /api/payouts/mileage
 *
 * Runs the daily mileage router for a medic on a given date.
 * Calculates per-leg mileage for all bookings that day (sequential routing),
 * writes results to each booking's timesheet, and returns the full breakdown.
 *
 * This endpoint is called:
 *   - When a timesheet is approved (auto-trigger)
 *   - Manually from the admin payout dashboard
 *   - By the Friday payout cron (to catch any shifts not yet calculated)
 *
 * Body:
 *   { medicId: string, date: string }  // date = YYYY-MM-DD
 *
 * Access: org_admin only
 *
 * Response:
 *   {
 *     medicId, date, homePostcode,
 *     totalMiles, totalReimbursement,
 *     bookings: [
 *       {
 *         bookingId, timesheetId, sitePostcode,
 *         legMiles, mileageReimbursement, mileageRatePence,
 *         legs: [{ from, to, miles, cached }],
 *         updated: boolean
 *       }
 *     ],
 *     errors: string[]
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { routeDailyMileage } from '@/lib/payouts/mileage-router';

export async function POST(req: NextRequest) {
  try {
    // Authenticate: require logged-in user with org membership
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Multi-tenant: ensure caller belongs to an org
    await requireOrgId();

    let body: { medicId?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { medicId, date } = body;

    if (!medicId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: medicId, date (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Basic date format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const result = await routeDailyMileage(medicId, date);

    // Return 207 Multi-Status if there were partial errors (some timesheets updated, some not)
    const status = result.errors.length > 0 ? 207 : 200;

    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[POST /api/payouts/mileage]', err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
