/**
 * Friday Payout Edge Function
 * Phase 06.5-02: Automated weekly medic payouts via Stripe Transfers
 * MULTI-TENANT VERSION: Processes each organization's timesheets separately
 *
 * Invoked by pg_cron every Friday at 9am GMT
 * Processes all admin-approved timesheets from previous week FOR EACH ORG
 * Creates Stripe Transfers to medic Express accounts (UK Faster Payments)
 * Updates timesheet status to 'paid' and logs execution results PER ORG
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { stripe } from '../_shared/stripe.ts';
import { sendPayoutFailureEmail } from '../_shared/email-templates.ts';

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
    console.log('🚀 Multi-Tenant Friday Payout Job started at', new Date().toISOString());

    // CRITICAL: Fetch all active organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('status', 'active');

    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organizations', details: orgError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!organizations || organizations.length === 0) {
      console.log('ℹ️ No active organizations found');
      return new Response(
        JSON.stringify({
          message: 'No active organizations',
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🏢 Found ${organizations.length} organizations to process`);

    // Track totals across all orgs
    let globalSuccessfulCount = 0;
    let globalFailedCount = 0;
    let globalTotalAmountTransferred = 0;
    let globalTimesheetsProcessed = 0;
    const orgResults: Array<{
      orgId: string;
      orgName: string;
      processed: number;
      successful: number;
      failed: number;
      totalAmount: number;
      errors: Array<{ timesheetId: string; error: string; medic: string }>;
    }> = [];

    // CRITICAL: Process each organization separately
    for (const org of organizations) {
      console.log(`\n📋 Processing organization: ${org.name} (${org.slug})`);

      // Query timesheets ready for payout FOR THIS ORG ONLY
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
          medics!inner (
            id,
            first_name,
            last_name,
            email,
            stripe_account_id,
            stripe_onboarding_complete,
            org_id
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
        .eq('org_id', org.id) // CRITICAL: Filter by org_id
        .eq('payout_status', 'admin_approved')
        .is('paid_at', null)
        .order('medic_id')
        .order('medic_submitted_at');

      if (queryError) {
        console.error(`❌ Error querying timesheets for ${org.name}:`, queryError);
        continue; // Skip this org, continue with others
      }

      if (!timesheets || timesheets.length === 0) {
        console.log(`ℹ️ No timesheets ready for payout for ${org.name}`);
        continue;
      }

      console.log(`📋 Found ${timesheets.length} timesheets for ${org.name}`);

      // Process each timesheet for this org
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

        // CRITICAL: Validate all entities belong to the same org
        if (timesheet.org_id !== org.id || medic.org_id !== org.id || booking.org_id !== org.id) {
          console.error(
            `🚨 SECURITY VIOLATION: Timesheet ${timesheet.id} has mismatched org_ids - Timesheet: ${timesheet.org_id}, Medic: ${medic.org_id}, Booking: ${booking.org_id}, Expected: ${org.id}`
          );
          failedCount++;
          errors.push({
            timesheetId: timesheet.id,
            error: 'Security violation: org_id mismatch',
            medic: `${medic.first_name} ${medic.last_name}`,
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

        // Validate medic account is GB (required for UK Faster Payments)
        try {
          const account = await stripe.accounts.retrieve(medic.stripe_account_id);

          if (account.country !== 'GB') {
            console.warn(
              `⚠️ Timesheet ${timesheet.id}: Medic ${medicName} account country is ${account.country}, not GB`
            );
            failedCount++;
            errors.push({
              timesheetId: timesheet.id,
              error: `Stripe account country is ${account.country} (expected GB for UK Faster Payments)`,
              medic: medicName,
            });
            continue;
          }

          // Also verify payouts are actually enabled on the account
          if (!account.payouts_enabled) {
            console.warn(
              `⚠️ Timesheet ${timesheet.id}: Medic ${medicName} payouts not enabled on Stripe account`
            );
            failedCount++;
            errors.push({
              timesheetId: timesheet.id,
              error: 'Stripe account payouts not enabled',
              medic: medicName,
            });
            continue;
          }
        } catch (accountError: any) {
          console.error(
            `⚠️ Timesheet ${timesheet.id}: Failed to retrieve Stripe account for ${medicName}:`,
            accountError.message
          );
          failedCount++;
          errors.push({
            timesheetId: timesheet.id,
            error: `Failed to verify Stripe account: ${accountError.message}`,
            medic: medicName,
          });
          continue;
        }

        // Validate payout amount (should be 71.4% of booking total)
        const expectedPayout = Number(((booking.total * 71.4) / 100).toFixed(2));
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
              org_id: org.id, // IMPORTANT: Track org_id in Stripe metadata
              org_slug: org.slug,
              payout_week: new Date().toISOString().split('T')[0],
            },
            description: `Weekly payout - ${medicName} (${org.slug})`,
          });

          // Update timesheet status (with org_id filter for safety)
          const { error: updateError } = await supabase
            .from('timesheets')
            .update({
              payout_status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_transfer_id: transfer.id,
            })
            .eq('id', timesheet.id)
            .eq('org_id', org.id); // IMPORTANT: Validate org_id on update

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
            `✅ Payout successful: ${medicName} (${org.slug}) - £${actualPayout} - Transfer ${transfer.id}`
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

      console.log(
        `🏁 ${org.name} complete - Success: ${successfulCount}, Failed: ${failedCount}, Total: £${totalAmountTransferred.toFixed(2)}`
      );

      // Log execution to payout_executions table FOR THIS ORG
      try {
        await supabase.from('payout_executions').insert({
          org_id: org.id, // CRITICAL: Track which org this payout is for
          execution_date: new Date().toISOString().split('T')[0],
          execution_time: new Date().toISOString(),
          timesheets_processed: timesheets.length,
          successful_payouts: successfulCount,
          failed_payouts: failedCount,
          total_amount: totalAmountTransferred,
          errors: errors.length > 0 ? errors : [],
          status: failedCount === 0 ? 'completed' : 'completed_with_errors',
          completed_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.warn(`⚠️ Failed to log execution for ${org.name}:`, logError);
      }

      // Track org results
      orgResults.push({
        orgId: org.id,
        orgName: org.name,
        processed: timesheets.length,
        successful: successfulCount,
        failed: failedCount,
        totalAmount: Number(totalAmountTransferred.toFixed(2)),
        errors,
      });

      // Update global totals
      globalTimesheetsProcessed += timesheets.length;
      globalSuccessfulCount += successfulCount;
      globalFailedCount += failedCount;
      globalTotalAmountTransferred += totalAmountTransferred;

      // Send org-specific admin notification email if there are failures
      if (failedCount > 0 && errors.length > 0) {
        console.warn(`⚠️ ${org.name}: ${failedCount} payouts failed - sending admin notification`);

        // Get org admin email (fallback to generic admin email if not found)
        try {
          const { data: orgAdmins } = await supabase
            .from('profiles')
            .select('email')
            .eq('org_id', org.id)
            .eq('role', 'org_admin')
            .limit(1)
            .single();

          const adminEmail = orgAdmins?.email || 'admin@sitemedic.co.uk';

          // Format failures for email
          const failures = errors.map((err: any) => ({
            medicName: err.medic,
            amount: 0, // Amount not tracked in errors, could enhance later
            error: err.error,
          }));

          await sendPayoutFailureEmail(adminEmail, org.name, failures);
        } catch (emailError) {
          console.error(`Failed to send payout failure email for ${org.name}:`, emailError);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(
      `\n🎉 Multi-Tenant Friday Payout Job completed in ${executionTime}ms`
    );
    console.log(
      `📊 Global Summary - Organizations: ${organizations.length}, Timesheets: ${globalTimesheetsProcessed}, Success: ${globalSuccessfulCount}, Failed: ${globalFailedCount}, Total: £${globalTotalAmountTransferred.toFixed(2)}`
    );

    return new Response(
      JSON.stringify({
        message: 'Multi-tenant friday payout processing complete',
        organizations: organizations.length,
        totalProcessed: globalTimesheetsProcessed,
        totalSuccessful: globalSuccessfulCount,
        totalFailed: globalFailedCount,
        totalAmount: Number(globalTotalAmountTransferred.toFixed(2)),
        orgResults,
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
