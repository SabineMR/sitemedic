/**
 * Certification Expiry Checker Edge Function
 * Phase 7: Certification Tracking - Plan 02
 *
 * Purpose: Daily cron job to check medic certifications approaching expiry
 * and send progressive email notifications at 30/14/7/1 days before expiry.
 * Notifies medics at all stages, and also notifies site managers at critical stages (14/7/1 days).
 *
 * Runs: Daily at 9:00 AM UTC via pg_cron
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendCertificationExpiryEmail } from './email-templates.ts';

Deno.serve(async (req: Request) => {
  try {
    console.log('Certification expiry checker starting...');

    const { trigger, check_date } = await req.json();
    console.log(`Trigger: ${trigger}, Check date: ${check_date}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const dashboardBaseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:30500';

    // Define reminder stages (30, 14, 7, 1 days before expiry)
    const REMINDER_STAGES = [30, 14, 7, 1];

    let totalReminders = 0;
    let expiredNotifications = 0;

    // Process each reminder stage
    for (const stage of REMINDER_STAGES) {
      console.log(`\n=== Checking certifications expiring in ${stage} days ===`);

      // Call RPC function to get certifications expiring in N days
      const { data: expiringCerts, error: rpcError } = await supabase
        .rpc('get_certifications_expiring_in_days', { days_ahead: stage });

      if (rpcError) {
        console.error(`Error fetching certifications for ${stage} days ahead:`, rpcError);
        continue; // Continue with other stages even if one fails
      }

      console.log(`Found ${expiringCerts?.length || 0} certifications expiring in ${stage} days`);

      if (!expiringCerts || expiringCerts.length === 0) {
        continue;
      }

      // Process each expiring certification
      for (const cert of expiringCerts) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Check if reminder already sent today for this medic/cert/stage
          const { data: existingReminder, error: reminderCheckError } = await supabase
            .from('certification_reminders')
            .select('id')
            .eq('medic_id', cert.medic_id)
            .eq('cert_type', cert.cert_type)
            .eq('days_before', stage)
            .gte('sent_at', today.toISOString())
            .single();

          if (existingReminder) {
            console.log(`Reminder already sent today for ${cert.medic_first_name} ${cert.medic_last_name} - ${cert.cert_type} (${stage} days)`);
            continue; // Skip this cert, already reminded today
          }

          // Fetch organization name for email personalization
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', cert.org_id)
            .single();
          const orgName = org?.name || 'Your Organization';

          // Send email to medic
          console.log(`Sending email to medic: ${cert.medic_email} for ${cert.cert_type}`);
          const medicMessageId = await sendCertificationExpiryEmail({
            medicFirstName: cert.medic_first_name,
            certType: cert.cert_type,
            certNumber: cert.cert_number,
            expiryDate: cert.expiry_date_formatted,
            daysRemaining: cert.days_remaining,
            renewalUrl: cert.renewal_url,
            recipientEmail: cert.medic_email,
            recipientName: `${cert.medic_first_name} ${cert.medic_last_name}`,
            orgName: orgName,
            dashboardUrl: `${dashboardBaseUrl}/certifications`,
          });

          if (medicMessageId) {
            // Log reminder to certification_reminders table
            const { error: insertError } = await supabase
              .from('certification_reminders')
              .insert({
                medic_id: cert.medic_id,
                cert_type: cert.cert_type,
                days_before: stage,
                sent_at: new Date().toISOString(),
                resend_message_id: medicMessageId,
                org_id: cert.org_id,
              });

            if (insertError) {
              console.error(`Error logging reminder for ${cert.medic_email}:`, insertError);
            } else {
              totalReminders++;
            }
          }

          // For critical/warning stages (14, 7, 1 days), also notify site manager
          if (stage <= 14) {
            console.log(`Critical stage (${stage} days) - also notifying site manager for org ${cert.org_id}`);

            // Fetch site manager for this organization
            const { data: siteManager, error: managerError } = await supabase
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('org_id', cert.org_id)
              .eq('role', 'site_manager')
              .single();

            if (managerError || !siteManager) {
              console.warn(`No site manager found for org ${cert.org_id} (cert: ${cert.cert_type})`);
            } else {
              console.log(`Sending notification to site manager: ${siteManager.email}`);

              // Fetch org name for manager email
              const { data: managerOrg } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', cert.org_id)
                .single();

              const managerOrgName = managerOrg?.name || 'Your Organization';

              await sendCertificationExpiryEmail({
                medicFirstName: cert.medic_first_name,
                certType: cert.cert_type,
                certNumber: cert.cert_number,
                expiryDate: cert.expiry_date_formatted,
                daysRemaining: cert.days_remaining,
                renewalUrl: cert.renewal_url,
                recipientEmail: siteManager.email,
                recipientName: `${siteManager.first_name} ${siteManager.last_name}`,
                orgName: managerOrgName,
                dashboardUrl: `${dashboardBaseUrl}/certifications`,
              });
            }
          }
        } catch (certError) {
          console.error(`Error processing certification for ${cert.medic_email}:`, certError);
          // Continue with other certifications (batch resilience)
        }
      }
    }

    // Also check for EXPIRED certifications (0 days - already expired today)
    console.log('\n=== Checking for certifications that expired today ===');
    const { data: expiredCerts, error: expiredError } = await supabase
      .rpc('get_certifications_expiring_in_days', { days_ahead: 0 });

    if (!expiredError && expiredCerts && expiredCerts.length > 0) {
      console.log(`Found ${expiredCerts.length} certifications that expired today`);

      for (const cert of expiredCerts) {
        try {
          // Fetch site manager
          const { data: siteManager, error: managerError } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('org_id', cert.org_id)
            .eq('role', 'site_manager')
            .single();

          if (managerError || !siteManager) {
            console.warn(`No site manager found for expired cert notification - org ${cert.org_id}`);
            continue;
          }

          // Fetch org name
          const { data: expiredOrg } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', cert.org_id)
            .single();

          const expiredOrgName = expiredOrg?.name || 'Your Organization';

          console.log(`Sending EXPIRED notification to manager: ${siteManager.email}`);

          await sendCertificationExpiryEmail({
            medicFirstName: cert.medic_first_name,
            certType: cert.cert_type,
            certNumber: cert.cert_number,
            expiryDate: cert.expiry_date_formatted,
            daysRemaining: 0,
            renewalUrl: cert.renewal_url,
            recipientEmail: siteManager.email,
            recipientName: `${siteManager.first_name} ${siteManager.last_name}`,
            orgName: expiredOrgName,
            dashboardUrl: `${dashboardBaseUrl}/certifications`,
          });

          expiredNotifications++;
        } catch (expiredCertError) {
          console.error(`Error processing expired cert notification:`, expiredCertError);
        }
      }
    }

    console.log('\n=== Certification expiry check complete ===');
    console.log(`Total reminders sent: ${totalReminders}`);
    console.log(`Expired notifications sent: ${expiredNotifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: totalReminders,
        expired_notifications: expiredNotifications,
        check_date: check_date || new Date().toISOString().split('T')[0],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Certification expiry checker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
