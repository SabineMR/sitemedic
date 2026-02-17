/**
 * POST /api/payouts/process-batch
 * Phase 06.5-02: Process batch payout for admin-approved timesheets
 *
 * Creates Stripe Transfers to medic Express accounts (UK Faster Payments)
 * Updates timesheet status to 'paid' and records stripe_transfer_id
 *
 * Accepts: { timesheetIds: string[], dryRun?: boolean }
 * Returns: { success: count, failed: count, errors: [] }
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validatePayout } from '@/lib/payouts/calculator';
import { stripe } from '@/lib/stripe/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Parse request body
    const body = await request.json();
    const { timesheetIds, dryRun = false } = body;

    if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      return NextResponse.json(
        { error: 'timesheetIds array is required' },
        { status: 400 }
      );
    }

    // Fetch timesheets with medic and booking relations
    // CRITICAL: Filter by org_id to prevent cross-org payout processing
    const { data: timesheets, error: queryError } = await supabase
      .from('timesheets')
      .select(
        `
        id,
        medic_id,
        booking_id,
        payout_amount,
        payout_status,
        org_id,
        mileage_miles,
        medics!inner (
          id,
          first_name,
          last_name,
          stripe_account_id,
          stripe_onboarding_complete,
          org_id,
          medic_payout_percent
        ),
        bookings!inner (
          id,
          total,
          site_name,
          shift_date,
          org_id
        )
      `
      )
      .in('id', timesheetIds)
      .eq('org_id', orgId);

    if (queryError) {
      console.error('Error fetching timesheets:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch timesheets' },
        { status: 500 }
      );
    }

    if (!timesheets || timesheets.length === 0) {
      return NextResponse.json({ error: 'No timesheets found' }, { status: 404 });
    }

    // Validation errors
    const validationErrors: string[] = [];

    // Validate all timesheets
    for (const timesheet of timesheets) {
      const medic = timesheet.medics as any;
      const booking = timesheet.bookings as any;

      // Check status is admin_approved
      if (timesheet.payout_status !== 'admin_approved') {
        validationErrors.push(
          `Timesheet ${timesheet.id} has status '${timesheet.payout_status}' (must be 'admin_approved')`
        );
      }

      // Check medic has Stripe account
      if (!medic?.stripe_account_id) {
        validationErrors.push(
          `Timesheet ${timesheet.id}: Medic ${medic?.first_name} ${medic?.last_name} missing Stripe account`
        );
      }

      // Check Stripe onboarding complete
      if (!medic?.stripe_onboarding_complete) {
        validationErrors.push(
          `Timesheet ${timesheet.id}: Medic ${medic?.first_name} ${medic?.last_name} Stripe onboarding incomplete`
        );
      }

      // Validate payout amount matches expected calculation
      if (booking && !validatePayout(
        Number(timesheet.payout_amount),
        Number(booking.total),
        Number(medic?.medic_payout_percent ?? 40),
        timesheet.mileage_miles ?? null
      )) {
        validationErrors.push(
          `Timesheet ${timesheet.id}: Payout amount £${timesheet.payout_amount} does not match expected calculation for booking total £${booking.total}`
        );
      }
    }

    // If validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // If dry run, return validation results only
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        timesheetsValidated: timesheets.length,
        totalPayout: timesheets.reduce(
          (sum, t) => sum + Number(t.payout_amount),
          0
        ),
        message: 'Validation passed. Ready to process.',
      });
    }

    // Process each timesheet
    let successCount = 0;
    let failedCount = 0;
    const errors: { timesheetId: string; error: string }[] = [];

    for (const timesheet of timesheets) {
      const medic = timesheet.medics as any;
      const booking = timesheet.bookings as any;

      try {
        // Create Stripe Transfer
        const transfer = await stripe.transfers.create({
          amount: Math.round(Number(timesheet.payout_amount) * 100), // Convert GBP to pence
          currency: 'gbp',
          destination: medic.stripe_account_id,
          metadata: {
            timesheet_id: timesheet.id,
            medic_id: medic.id,
            booking_id: booking.id,
            payout_week: new Date().toISOString().split('T')[0],
          },
          description: `Payout for ${booking.site_name} on ${booking.shift_date}`,
        });

        // Update timesheet status
        const { error: updateError } = await supabase
          .from('timesheets')
          .update({
            payout_status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
          })
          .eq('id', timesheet.id);

        if (updateError) {
          throw new Error(`Failed to update timesheet: ${updateError.message}`);
        }

        successCount++;
      } catch (error: any) {
        console.error(
          `❌ Failed to process timesheet ${timesheet.id}:`,
          error.message
        );

        // Log error reason in timesheet (we'd need a column for this)
        errors.push({
          timesheetId: timesheet.id,
          error: error.message || 'Unknown error',
        });

        failedCount++;
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors,
      message: `Processed ${successCount}/${timesheets.length} payouts successfully`,
    });
  } catch (error: any) {
    console.error('Error processing batch payout:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
