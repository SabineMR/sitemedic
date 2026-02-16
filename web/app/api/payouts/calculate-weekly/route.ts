/**
 * GET /api/payouts/calculate-weekly
 * Phase 06.5-02: Calculate weekly payout summary for admin dashboard
 *
 * Returns:
 * - List of medics with admin-approved timesheets from last 7 days
 * - Total hours, payout amounts, Stripe onboarding status
 * - Aggregate totals: medic count, total payouts, platform fees, revenue
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculatePayout } from '@/lib/payouts/calculator';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Calculate date range: last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Query timesheets with admin_approved status from last 7 days
    const { data: timesheets, error: queryError } = await supabase
      .from('timesheets')
      .select(
        `
        id,
        medic_id,
        booking_id,
        logged_hours,
        payout_amount,
        payout_status,
        medic_submitted_at,
        medics (
          id,
          first_name,
          last_name,
          email,
          stripe_account_id,
          stripe_onboarding_complete
        ),
        bookings (
          id,
          total,
          site_name,
          shift_date
        )
      `
      )
      .eq('payout_status', 'admin_approved')
      .gte('medic_submitted_at', sevenDaysAgo.toISOString())
      .lt('medic_submitted_at', today.toISOString())
      .order('medic_id')
      .order('medic_submitted_at');

    if (queryError) {
      console.error('Error querying timesheets:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch timesheets' },
        { status: 500 }
      );
    }

    // Group by medic and calculate totals
    const medicMap = new Map<
      string,
      {
        medic_id: string;
        medic_name: string;
        email: string;
        timesheet_count: number;
        total_hours: number;
        total_payout: number;
        stripe_account_id: string | null;
        stripe_onboarding_complete: boolean;
        timesheets: any[];
      }
    >();

    let totalPayouts = 0;
    let totalPlatformFees = 0;
    let totalRevenue = 0;

    for (const timesheet of timesheets || []) {
      const medic = timesheet.medics as any;
      const booking = timesheet.bookings as any;

      if (!medic || !booking) continue;

      const medicId = medic.id;
      const medicName = `${medic.first_name} ${medic.last_name}`;

      // Get or create medic entry
      if (!medicMap.has(medicId)) {
        medicMap.set(medicId, {
          medic_id: medicId,
          medic_name: medicName,
          email: medic.email,
          timesheet_count: 0,
          total_hours: 0,
          total_payout: 0,
          stripe_account_id: medic.stripe_account_id,
          stripe_onboarding_complete: medic.stripe_onboarding_complete,
          timesheets: [],
        });
      }

      const medicEntry = medicMap.get(medicId)!;
      medicEntry.timesheet_count += 1;
      medicEntry.total_hours += Number(timesheet.logged_hours);
      medicEntry.total_payout += Number(timesheet.payout_amount);
      medicEntry.timesheets.push({
        id: timesheet.id,
        site_name: booking.site_name,
        shift_date: booking.shift_date,
        hours: timesheet.logged_hours,
        payout: timesheet.payout_amount,
      });

      // Calculate platform fee
      const calculation = calculatePayout(booking.total);
      totalPayouts += calculation.medicPayout;
      totalPlatformFees += calculation.platformFee;
      totalRevenue += booking.total;
    }

    // Convert map to array
    const medics = Array.from(medicMap.values());

    return NextResponse.json({
      medics,
      totals: {
        medicCount: medics.length,
        totalPayouts: Number(totalPayouts.toFixed(2)),
        totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error calculating weekly payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
