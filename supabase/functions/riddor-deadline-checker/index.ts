/**
 * RIDDOR Deadline Checker Edge Function
 * Phase 6: RIDDOR Auto-Flagging - Plan 05
 *
 * Purpose: Daily cron job to check RIDDOR incidents approaching deadlines
 * and send email notifications to site managers 3 days before HSE deadline.
 *
 * Runs: Daily at 9:00 AM UTC via pg_cron
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendDeadlineEmail } from './email-templates.ts';

Deno.serve(async (req: Request) => {
  try {
    console.log('RIDDOR deadline checker starting...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target deadline dates (3 days from now)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    console.log(`Checking for deadlines on: ${threeDaysFromNow.toISOString().split('T')[0]}`);

    // Fetch RIDDOR incidents with deadlines in 3 days that are:
    // - Status = 'draft' (not yet submitted)
    // - Medic confirmed = true (confirmed as RIDDOR by medic)
    const { data: incidents, error: fetchError } = await supabase
      .from('riddor_incidents')
      .select(`
        id,
        deadline_date,
        detected_at,
        treatments (
          injury_type,
          body_part,
          created_at,
          reference_number
        ),
        workers (
          first_name,
          last_name,
          company
        ),
        organizations (
          company_name,
          site_address,
          phone
        )
      `)
      .eq('status', 'draft')
      .eq('medic_confirmed', true)
      .eq('deadline_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (fetchError) {
      console.error('Error fetching RIDDOR incidents:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500 }
      );
    }

    console.log(`Found ${incidents?.length || 0} incidents with deadlines in 3 days`);

    if (!incidents || incidents.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No incidents approaching deadline',
          incidents_checked: 0,
          emails_sent: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send deadline emails
    let emailsSent = 0;
    const errors: string[] = [];

    for (const incident of incidents) {
      try {
        // TODO: Fetch actual site manager email from profiles table
        // For now, using organization phone as placeholder
        const siteManagerEmail = 'site-manager@example.com'; // Replace with actual lookup

        await sendDeadlineEmail({
          incidentId: incident.id,
          workerName: `${incident.workers.first_name} ${incident.workers.last_name}`,
          workerCompany: incident.workers.company || 'Not specified',
          injuryType: incident.treatments.injury_type,
          bodyPart: incident.treatments.body_part || 'not specified',
          incidentDate: incident.treatments.created_at,
          deadlineDate: incident.deadline_date,
          daysRemaining: 3,
          dashboardUrl: `${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:30500'}/riddor/${incident.id}`,
          siteManagerEmail,
          orgName: incident.organizations.company_name,
        });

        emailsSent++;
      } catch (emailError) {
        console.error(`Error sending email for incident ${incident.id}:`, emailError);
        errors.push(`${incident.id}: ${emailError.message}`);
      }
    }

    console.log(`Deadline check complete. Emails sent: ${emailsSent}/${incidents.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deadline check complete`,
        incidents_checked: incidents.length,
        emails_sent: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('RIDDOR deadline checker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
