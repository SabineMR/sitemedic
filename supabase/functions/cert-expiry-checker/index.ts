/**
 * Certification Expiry Checker - Scheduled Job
 * Runs daily to check expiring certifications and send alerts
 * Auto-removes medics from candidate pool when certs expire
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  try {
    console.log('🔍 Running certification expiry check...');

    const { data: medics, error } = await supabase
      .from('medics')
      .select('id, first_name, last_name, email, certifications, available_for_work');

    if (error) throw error;

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in14Days = new Date(today);
    in14Days.setDate(today.getDate() + 14);

    const results = {
      checked: medics.length,
      expiring_30d: [],
      expiring_14d: [],
      expired: [],
      medics_disabled: [],
    };

    for (const medic of medics) {
      if (!medic.certifications || medic.certifications.length === 0) continue;

      for (const cert of medic.certifications) {
        const expiryDate = new Date(cert.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          // EXPIRED - disable medic for shifts requiring this cert
          console.log(`❌ EXPIRED: ${medic.first_name} ${medic.last_name} - ${cert.type} expired ${Math.abs(daysUntilExpiry)} days ago`);
          results.expired.push({ medic_id: medic.id, cert_type: cert.type, days_ago: Math.abs(daysUntilExpiry) });

          // Send notification
          await sendNotification(medic.id, medic.email, cert.type, 0);

          // Set available_for_work = FALSE for shifts requiring this cert
          if (cert.type === 'Confined Space' && medic.available_for_work) {
            await supabase
              .from('medics')
              .update({ available_for_work: false, unavailable_reason: `${cert.type} certification expired` })
              .eq('id', medic.id);
            results.medics_disabled.push(medic.id);
          }

        } else if (daysUntilExpiry <= 14) {
          // 14 days warning - escalate to admin
          console.log(`⚠️  14-DAY WARNING: ${medic.first_name} ${medic.last_name} - ${cert.type} expires in ${daysUntilExpiry} days`);
          results.expiring_14d.push({ medic_id: medic.id, cert_type: cert.type, days_remaining: daysUntilExpiry });

          await sendNotification(medic.id, medic.email, cert.type, daysUntilExpiry);

        } else if (daysUntilExpiry <= 30) {
          // 30 days notice
          console.log(`📅 30-DAY NOTICE: ${medic.first_name} ${medic.last_name} - ${cert.type} expires in ${daysUntilExpiry} days`);
          results.expiring_30d.push({ medic_id: medic.id, cert_type: cert.type, days_remaining: daysUntilExpiry });

          await sendNotification(medic.id, medic.email, cert.type, daysUntilExpiry);
        }
      }
    }

    console.log(`✅ Check complete: ${results.expired.length} expired, ${results.expiring_14d.length} expiring soon, ${results.medics_disabled.length} medics disabled`);

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Error checking certifications:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function sendNotification(medic_id: string, email: string, cert_type: string, days_remaining: number) {
  let message: string;

  if (days_remaining === 0) {
    message = `URGENT: Your ${cert_type} certification has EXPIRED. Please renew immediately to continue receiving shifts.`;
  } else if (days_remaining <= 14) {
    message = `WARNING: Your ${cert_type} certification expires in ${days_remaining} days. Please renew as soon as possible.`;
  } else {
    message = `Reminder: Your ${cert_type} certification expires in ${days_remaining} days. Please plan to renew.`;
  }

  // Call notification service
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      type: 'cert_expiry_30d',
      medic_id,
      custom_message: message,
    }),
  });
}
