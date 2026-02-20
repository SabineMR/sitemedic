/**
 * Document Expiry Checker Edge Function
 * Phase 46: Expiry Tracking & Alerts - Plan 01
 *
 * Purpose: Daily cron job to check document expiry dates across all organisations
 * and send progressive digest email notifications at 30/14/7/1 days before expiry.
 *
 * Flow:
 * 1. For each reminder stage (30, 14, 7, 1 days):
 *    a. Query documents expiring at that threshold via RPC
 *    b. Deduplicate against document_expiry_reminders audit table
 *    c. Group remaining documents by medic for digest emails
 *    d. Send one digest email per medic
 *    e. At critical stages (14, 7, 1): also send admin org-wide digest
 *    f. Log all sent reminders to the audit table
 * 2. After all stages: mark past-due documents as 'expired'
 *
 * Runs: Daily at 08:00 UTC via pg_cron (migration 155)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  sendMedicDigestEmail,
  sendAdminDigestEmail,
  type DigestItem,
  type AdminDigestGroup,
} from './email-templates.ts';

// Reminder stages: days before expiry to send alerts
const REMINDER_STAGES = [30, 14, 7, 1];

// Admin gets digest at critical stages only (not 30 days -- reduces noise)
const ADMIN_STAGES = [14, 7, 1];

Deno.serve(async (req: Request) => {
  try {
    console.log('Document expiry checker starting...');

    const { trigger, check_date } = await req.json();
    console.log(`Trigger: ${trigger}, Check date: ${check_date}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const dashboardBaseUrl =
      Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:30500';

    let totalMedicReminders = 0;
    let totalAdminReminders = 0;
    let totalExpiredMarked = 0;

    // -----------------------------------------------------------------------
    // Process each reminder stage
    // -----------------------------------------------------------------------
    for (const stage of REMINDER_STAGES) {
      try {
        console.log(`\n=== Checking documents expiring in ${stage} days ===`);

        // 1. Query documents expiring at this threshold
        const { data: expiringDocs, error: rpcError } = await supabase.rpc(
          'get_documents_expiring_in_days',
          { days_ahead: stage }
        );

        if (rpcError) {
          console.error(
            `Error fetching documents for ${stage} days ahead:`,
            rpcError
          );
          continue; // Continue with other stages even if one fails
        }

        console.log(
          `Found ${expiringDocs?.length || 0} documents expiring in ${stage} days`
        );

        if (!expiringDocs || expiringDocs.length === 0) {
          continue;
        }

        // 2. Deduplicate: filter out documents that already have a reminder for this stage
        const newDocs = [];
        for (const doc of expiringDocs) {
          try {
            const { data: existingReminder } = await supabase
              .from('document_expiry_reminders')
              .select('id')
              .eq('document_version_id', doc.document_version_id)
              .eq('days_before', stage)
              .eq('recipient_type', 'medic')
              .maybeSingle();

            if (existingReminder) {
              console.log(
                `Reminder already sent for doc ${doc.document_id} at ${stage} days (medic: ${doc.medic_first_name} ${doc.medic_last_name})`
              );
              continue;
            }

            newDocs.push(doc);
          } catch (dedupError) {
            console.error(
              `Error checking dedup for doc ${doc.document_id}:`,
              dedupError
            );
            // Include the doc anyway to avoid missing alerts
            newDocs.push(doc);
          }
        }

        console.log(
          `${newDocs.length} new documents to process for ${stage}-day stage (${expiringDocs.length - newDocs.length} already sent)`
        );

        if (newDocs.length === 0) {
          continue;
        }

        // 3. Group by medic for digest emails
        const medicGroups = new Map<
          string,
          {
            medic: {
              medic_id: string;
              medic_first_name: string;
              medic_last_name: string;
              medic_email: string;
              org_id: string;
            };
            items: (DigestItem & {
              document_id: string;
              document_version_id: string;
              medic_id: string;
              org_id: string;
            })[];
          }
        >();

        for (const doc of newDocs) {
          const group = medicGroups.get(doc.medic_id) || {
            medic: {
              medic_id: doc.medic_id,
              medic_first_name: doc.medic_first_name,
              medic_last_name: doc.medic_last_name,
              medic_email: doc.medic_email,
              org_id: doc.org_id,
            },
            items: [],
          };
          group.items.push({
            categoryName: doc.category_name,
            fileName: doc.file_name,
            expiryDate: doc.expiry_date_formatted,
            daysRemaining: doc.days_remaining,
            document_id: doc.document_id,
            document_version_id: doc.document_version_id,
            medic_id: doc.medic_id,
            org_id: doc.org_id,
          });
          medicGroups.set(doc.medic_id, group);
        }

        console.log(
          `Grouped into ${medicGroups.size} medic digest(s) for ${stage}-day stage`
        );

        // 4. Send one digest email per medic
        for (const [medicId, { medic, items }] of medicGroups) {
          try {
            // Fetch organization name for email personalization
            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', medic.org_id)
              .single();
            const orgName = org?.name || 'Your Organisation';

            const messageId = await sendMedicDigestEmail({
              medicFirstName: medic.medic_first_name,
              medicLastName: medic.medic_last_name,
              medicEmail: medic.medic_email,
              orgName,
              items: items.map((i) => ({
                categoryName: i.categoryName,
                fileName: i.fileName,
                expiryDate: i.expiryDate,
                daysRemaining: i.daysRemaining,
              })),
              daysRemaining: stage,
              dashboardUrl: dashboardBaseUrl,
            });

            if (messageId) {
              // Log one reminder row per document in the digest
              for (const item of items) {
                const { error: insertError } = await supabase
                  .from('document_expiry_reminders')
                  .insert({
                    document_id: item.document_id,
                    document_version_id: item.document_version_id,
                    medic_id: item.medic_id,
                    org_id: item.org_id,
                    days_before: stage,
                    resend_message_id: messageId,
                    recipient_type: 'medic',
                  });

                if (insertError) {
                  console.error(
                    `Error logging medic reminder for doc ${item.document_id}:`,
                    insertError
                  );
                } else {
                  totalMedicReminders++;
                }
              }
            }
          } catch (emailError) {
            console.error(
              `Error sending medic digest email for ${medicId}:`,
              emailError
            );
            // Continue with other medics (batch resilience)
          }
        }

        // 5. Admin digest at critical stages (14, 7, 1 days)
        if (ADMIN_STAGES.includes(stage)) {
          console.log(
            `Critical stage (${stage} days) - sending admin org-wide digests`
          );

          // Group all new docs by org_id for admin digest
          const orgGroups = new Map<
            string,
            {
              org_id: string;
              medicGroups: Map<
                string,
                { medicName: string; items: DigestItem[] }
              >;
              allDocs: typeof newDocs;
            }
          >();

          for (const doc of newDocs) {
            const orgGroup = orgGroups.get(doc.org_id) || {
              org_id: doc.org_id,
              medicGroups: new Map(),
              allDocs: [],
            };

            const medicName = `${doc.medic_first_name} ${doc.medic_last_name}`;
            const medicGroup = orgGroup.medicGroups.get(doc.medic_id) || {
              medicName,
              items: [],
            };
            medicGroup.items.push({
              categoryName: doc.category_name,
              fileName: doc.file_name,
              expiryDate: doc.expiry_date_formatted,
              daysRemaining: doc.days_remaining,
            });
            orgGroup.medicGroups.set(doc.medic_id, medicGroup);
            orgGroup.allDocs.push(doc);
            orgGroups.set(doc.org_id, orgGroup);
          }

          // Send admin digest per org
          for (const [orgId, orgGroup] of orgGroups) {
            try {
              // Check deduplication for admin digest at this stage for this org
              // We use the first doc in the batch as a representative check
              const { data: existingAdminReminder } = await supabase
                .from('document_expiry_reminders')
                .select('id')
                .eq('org_id', orgId)
                .eq('days_before', stage)
                .eq('recipient_type', 'admin')
                .limit(1)
                .maybeSingle();

              if (existingAdminReminder) {
                console.log(
                  `Admin digest already sent for org ${orgId} at ${stage} days`
                );
                continue;
              }

              // Fetch admin email -- try profiles table first, then org_settings
              let adminEmail: string | null = null;
              let adminName = 'Admin';

              const { data: siteManager } = await supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('org_id', orgId)
                .eq('role', 'site_manager')
                .limit(1)
                .maybeSingle();

              if (siteManager?.email) {
                adminEmail = siteManager.email;
                adminName = [siteManager.first_name, siteManager.last_name]
                  .filter(Boolean)
                  .join(' ') || 'Admin';
              } else {
                // Fallback to org_settings.admin_email
                const { data: orgSettings } = await supabase
                  .from('org_settings')
                  .select('admin_email')
                  .eq('org_id', orgId)
                  .maybeSingle();

                if (orgSettings?.admin_email) {
                  adminEmail = orgSettings.admin_email;
                }
              }

              if (!adminEmail) {
                console.warn(
                  `No admin email found for org ${orgId} -- skipping admin digest`
                );
                continue;
              }

              // Fetch org name
              const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .single();
              const orgName = org?.name || 'Your Organisation';

              // Build admin digest groups
              const adminGroups: AdminDigestGroup[] = Array.from(
                orgGroup.medicGroups.values()
              );

              const adminMessageId = await sendAdminDigestEmail({
                adminEmail,
                adminName,
                orgName,
                groups: adminGroups,
                daysRemaining: stage,
                dashboardUrl: dashboardBaseUrl,
              });

              if (adminMessageId) {
                // Log admin reminder rows (one per document for audit trail)
                for (const doc of orgGroup.allDocs) {
                  const { error: insertError } = await supabase
                    .from('document_expiry_reminders')
                    .insert({
                      document_id: doc.document_id,
                      document_version_id: doc.document_version_id,
                      medic_id: doc.medic_id,
                      org_id: doc.org_id,
                      days_before: stage,
                      resend_message_id: adminMessageId,
                      recipient_type: 'admin',
                    });

                  if (insertError) {
                    console.error(
                      `Error logging admin reminder for doc ${doc.document_id}:`,
                      insertError
                    );
                  } else {
                    totalAdminReminders++;
                  }
                }
              }
            } catch (adminError) {
              console.error(
                `Error sending admin digest for org ${orgId}:`,
                adminError
              );
              // Continue with other orgs
            }
          }
        }
      } catch (stageError) {
        console.error(`Error processing stage ${stage}:`, stageError);
        // Continue with other stages
      }
    }

    // -----------------------------------------------------------------------
    // Mark expired documents
    // -----------------------------------------------------------------------
    console.log('\n=== Marking expired documents ===');
    try {
      const { error: markError } = await supabase.rpc('mark_expired_documents');
      if (markError) {
        console.error('Error marking expired documents:', markError);
      } else {
        console.log('Successfully called mark_expired_documents');
      }
    } catch (markError) {
      console.error('Error calling mark_expired_documents:', markError);
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n=== Document expiry check complete ===');
    console.log(`Medic reminders logged: ${totalMedicReminders}`);
    console.log(`Admin reminders logged: ${totalAdminReminders}`);

    return new Response(
      JSON.stringify({
        success: true,
        medic_reminders_sent: totalMedicReminders,
        admin_reminders_sent: totalAdminReminders,
        check_date: check_date || new Date().toISOString().split('T')[0],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Document expiry checker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
