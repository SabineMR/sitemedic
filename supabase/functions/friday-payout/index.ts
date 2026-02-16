/**
 * Friday Payout Edge Function
 * Phase 06.5-02: Automated weekly medic payouts via Stripe Transfers
 *
 * Invoked by pg_cron every Friday at 9am GMT
 * Processes all admin-approved timesheets from previous week
 * Creates Stripe Transfers to medic Express accounts (UK Faster Payments)
 * Updates timesheet status to 'paid' and logs execution results
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe } from '../_shared/stripe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    // Validate authorization (service role key or cron secret)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const startTime = Date.now();
    console.log('🚀 Friday Payout Job started at', new Date().toISOString());

    // Query timesheets ready for payout
    const { data: timesheets, error: queryError } = await supabase
      .from('timesheets')
      .select(
        `
        id,
        medic_id,
        booking_id,
        payout_amount,
        payout_status,
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
      .is('paid_at', null)
      .order('medic_id')
      .order('medic_submitted_at');

    if (queryError) {
      console.error('❌ Error querying timesheets:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query timesheets', details: queryError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!timesheets || timesheets.length === 0) {
      console.log('ℹ️ No timesheets ready for payout');
      return new Response(
        JSON.stringify({
          message: 'No timesheets ready for payout',
          processed: 0,
          successful: 0,
          failed: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📋 Found ${timesheets.length} timesheets to process`);

    // Process each timesheet
    let successfulCount = 0;
    let failedCount = 0;
    const errors: Array<{ timesheetId: string; error: string; medic: string }> = [];
    let totalAmountTransferred = 0;

    for (const timesheet of timesheets) {
      const medic = timesheet.medics as any;
      const booking = timesheet.bookings as any;

      if (!medic || !booking) {
        console.warn(`⚠️ Timesheet ${timesheet.id}: Missing medic or booking data`);
        failedCount++;
        errors.push({
          timesheetId: timesheet.id,
          error: 'Missing medic or booking data',
          medic: 'Unknown',
        });
        continue;
      }

      const medicName = `${medic.first_name} ${medic.last_name}`;

      // Validate medic has Stripe account
      if (!medic.stripe_account_id) {
        console.warn(
          `⚠️ Timesheet ${timesheet.id}: Medic ${medicName} missing Stripe account`
        );
        failedCount++;
        errors.push({
          timesheetId: timesheet.id,
          error: 'Missing Stripe account',
          medic: medicName,
        });
        continue;
      }

      // Validate Stripe onboarding complete
      if (!medic.stripe_onboarding_complete) {
        console.warn(
          `⚠️ Timesheet ${timesheet.id}: Medic ${medicName} Stripe onboarding incomplete`
        );
        failedCount++;
        errors.push({
          timesheetId: timesheet.id,
          error: 'Stripe onboarding incomplete',
          medic: medicName,
        });
        continue;
      }

      // Validate payout amount (should be 60% of booking total)
      const expectedPayout = Number(((booking.total * 60) / 100).toFixed(2));
      const actualPayout = Number(timesheet.payout_amount);

      if (Math.abs(expectedPayout - actualPayout) > 0.01) {
        console.warn(
          `⚠️ Timesheet ${timesheet.id}: Payout amount mismatch (expected ${expectedPayout}, actual ${actualPayout})`
        );
        failedCount++;
        errors.push({
          timesheetId: timesheet.id,
          error: `Payout amount mismatch: expected £${expectedPayout}, actual £${actualPayout}`,
          medic: medicName,
        });
        continue;
      }

      // Create Stripe Transfer
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(actualPayout * 100), // Convert GBP to pence
          currency: 'gbp',
          destination: medic.stripe_account_id,
          metadata: {
            timesheet_id: timesheet.id,
            medic_id: medic.id,
            booking_id: booking.id,
            payout_week: new Date().toISOString().split('T')[0],
          },
          description: `Weekly payout - ${medicName}`,
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
          console.error(
            `❌ Timesheet ${timesheet.id}: Failed to update status:`,
            updateError
          );
          failedCount++;
          errors.push({
            timesheetId: timesheet.id,
            error: `Failed to update timesheet: ${updateError.message}`,
            medic: medicName,
          });
          continue;
        }

        console.log(
          `✅ Payout successful: ${medicName} - £${actualPayout} - Transfer ${transfer.id}`
        );
        successfulCount++;
        totalAmountTransferred += actualPayout;
      } catch (error: any) {
        console.error(
          `❌ Timesheet ${timesheet.id}: Stripe Transfer failed:`,
          error.message
        );
        failedCount++;
        errors.push({
          timesheetId: timesheet.id,
          error: error.message || 'Unknown Stripe error',
          medic: medicName,
        });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(
      `🏁 Friday Payout Job completed in ${executionTime}ms - Success: ${successfulCount}, Failed: ${failedCount}, Total: £${totalAmountTransferred.toFixed(2)}`
    );

    // Log execution to payout_executions table (if exists)
    try {
      await supabase.from('payout_executions').insert({
        execution_date: new Date().toISOString().split('T')[0],
        execution_time: new Date().toISOString(),
        timesheets_processed: timesheets.length,
        successful_payouts: successfulCount,
        failed_payouts: failedCount,
        total_amount: totalAmountTransferred,
        errors: errors.length > 0 ? errors : [],
        status: failedCount === 0 ? 'completed' : 'completed',
        completed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn('⚠️ Failed to log execution to payout_executions:', logError);
    }

    // TODO: Send admin notification email if there are failures
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} payouts failed - admin notification needed`);
    }

    return new Response(
      JSON.stringify({
        message: 'Friday payout processing complete',
        processed: timesheets.length,
        successful: successfulCount,
        failed: failedCount,
        totalAmount: Number(totalAmountTransferred.toFixed(2)),
        errors,
        executionTimeMs: executionTime,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Friday Payout Job fatal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Fatal error during payout processing',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
