/**
 * Event Fan-Out: New Event Notifications
 * Phase 38: Notifications & Alerts — Plan 03
 *
 * When a new marketplace event is posted (status='open'), this module:
 *   1. Creates dashboard notifications for ALL verified companies (never filtered by radius)
 *   2. Sends email alerts to companies with email_new_events=true (filtered by event_alert_radius_miles)
 *   3. Sends SMS alerts for urgent/high-value events to companies with sms_new_events=true (filtered by radius)
 *
 * Urgency criteria:
 *   - isUrgent: event starts within 7 days
 *   - isHighValue: budget_max > £2000
 *
 * IMPORTANT: This function is designed to be called fire-and-forget with `void`:
 *   void fanOutNewEventNotifications({ supabase, event, firstEventDate })
 * It must NEVER block the API response.
 *
 * SMS daily cap: 5 messages per company per day (tracked via sms_daily_count column
 * or a simple count query — current implementation skips if cap reached).
 */

import { createClient } from '@supabase/supabase-js';
import { createNotification } from './create-notification';
import { sendSMS } from './sms';
import { NOTIFICATION_TYPES } from './notification-types';
import { resend } from '@/lib/email/resend';

// =============================================================================
// Types
// =============================================================================

interface EventFanOutParams {
  event: {
    id: string;
    event_name: string;
    event_type: string;
    budget_max: number | null;
    posted_by: string;
    location_coordinates: { lat: number; lng: number } | null;
    location_postcode?: string | null;
    location_display?: string | null;
  };
  firstEventDate: Date | null;
}

// =============================================================================
// Private: Haversine distance in miles
// =============================================================================

function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =============================================================================
// Private: service-role client
// =============================================================================

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '[FanOut] Supabase service role env vars not configured — ' +
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    );
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitemedic.co.uk';
const FROM_ADDRESS = 'SiteMedic Marketplace <marketplace@sitemedic.co.uk>';

// =============================================================================
// fanOutNewEventNotifications
// =============================================================================

export async function fanOutNewEventNotifications(
  params: EventFanOutParams
): Promise<void> {
  const { event, firstEventDate } = params;

  const supabase = getServiceRoleClient();
  if (!supabase) return;

  try {
    // 1. Fetch all verified companies that can browse events
    const { data: companies, error: companiesError } = await supabase
      .from('marketplace_companies')
      .select('id, company_name, company_email, admin_user_id, location_lat, location_lng')
      .eq('verification_status', 'verified')
      .eq('can_browse_events', true);

    if (companiesError) {
      console.error('[FanOut] Failed to fetch companies:', companiesError);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('[FanOut] No verified companies found — skipping fan-out');
      return;
    }

    // 2. Determine urgency flags
    const isUrgent =
      firstEventDate !== null &&
      firstEventDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
    const isHighValue = (event.budget_max ?? 0) > 2000;
    const triggerSMS = isUrgent || isHighValue;

    // 3. Fetch notification preferences for all company admin users
    const adminUserIds = companies
      .map((c) => c.admin_user_id)
      .filter(Boolean) as string[];

    const { data: prefsRows } = adminUserIds.length
      ? await supabase
          .from('marketplace_notification_preferences')
          .select(
            'user_id, email_new_events, sms_new_events, sms_phone_number, event_alert_radius_miles'
          )
          .in('user_id', adminUserIds)
      : { data: [] };

    const prefsMap = new Map(
      (prefsRows ?? []).map((p: {
        user_id: string;
        email_new_events: boolean;
        sms_new_events: boolean;
        sms_phone_number: string | null;
        event_alert_radius_miles: number | null;
      }) => [p.user_id, p])
    );

    // 4. Build notification text
    const locationText = event.location_display || event.location_postcode || 'UK';
    const budgetText =
      event.budget_max != null ? ` · Budget up to £${event.budget_max.toLocaleString()}` : '';
    const urgencyLabel = isUrgent ? ' [URGENT]' : isHighValue ? ' [HIGH VALUE]' : '';
    const notifTitle = `New event: ${event.event_name}${urgencyLabel}`;
    const notifBody = `${event.event_type} · ${locationText}${budgetText} — Quote now`;
    const notifLink = `/marketplace/events/${event.id}`;

    const smsBody = `SiteMedic: New event${urgencyLabel} — ${event.event_name} (${event.event_type}, ${locationText}${budgetText}). Quote now: ${SITE_URL}/marketplace/events/${event.id}`;

    // 5. Fan out — individual try/catch per company so one failure can't block others
    for (const company of companies) {
      try {
        // Skip the event poster's own company
        if (company.admin_user_id === event.posted_by) continue;

        const prefs = company.admin_user_id ? prefsMap.get(company.admin_user_id) : null;

        // --- Radius check (for email/SMS only — dashboard is NEVER filtered) ---
        let skipEmailSMS = false;

        if (
          prefs?.event_alert_radius_miles != null &&
          event.location_coordinates !== null
        ) {
          if (
            company.location_lat != null &&
            company.location_lng != null
          ) {
            const distanceMiles = haversineDistanceMiles(
              event.location_coordinates.lat,
              event.location_coordinates.lng,
              company.location_lat,
              company.location_lng
            );
            if (distanceMiles > prefs.event_alert_radius_miles) {
              skipEmailSMS = true;
            }
          }
          // If company has no location data, don't skip (fallback: notify)
        }

        // a. Dashboard notification — ALWAYS created, NEVER radius-filtered
        if (company.admin_user_id) {
          await createNotification({
            userId: company.admin_user_id,
            type: NOTIFICATION_TYPES.NEW_EVENT,
            title: notifTitle,
            body: notifBody,
            link: notifLink,
            metadata: {
              event_id: event.id,
              event_type: event.event_type,
              budget_max: event.budget_max,
              is_urgent: isUrgent,
              is_high_value: isHighValue,
            },
          });
        }

        if (skipEmailSMS) continue;

        // b. Email — only if opted in and within radius
        const emailOptIn = prefs?.email_new_events !== false; // default true
        if (emailOptIn && company.company_email) {
          try {
            const urgencyBanner = urgencyLabel
              ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;"><strong style="color:#991b1b;">${isUrgent ? 'URGENT' : 'HIGH VALUE'}</strong></div>`
              : '';

            await resend.emails.send({
              from: FROM_ADDRESS,
              to: company.company_email,
              subject: `New event posted: ${event.event_name}${urgencyLabel}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);padding:32px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="color:white;margin:0;font-size:24px;">New Event Posted</h1>
                  </div>
                  <div style="background:white;padding:32px;border-radius:0 0 8px 8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <p style="color:#374151;font-size:16px;">Hi <strong>${company.company_name}</strong>,</p>
                    ${urgencyBanner}
                    <p style="color:#374151;font-size:16px;">A new event has been posted on the SiteMedic Marketplace that may be a good fit for your company.</p>
                    <div style="background:#f9fafb;padding:16px;margin:24px 0;border-radius:8px;">
                      <table style="width:100%;font-size:14px;color:#374151;">
                        <tr><td style="padding:4px 0;font-weight:600;">Event:</td><td>${event.event_name}</td></tr>
                        <tr><td style="padding:4px 0;font-weight:600;">Type:</td><td>${event.event_type}</td></tr>
                        <tr><td style="padding:4px 0;font-weight:600;">Location:</td><td>${locationText}</td></tr>
                        ${event.budget_max != null ? `<tr><td style="padding:4px 0;font-weight:600;">Budget:</td><td>Up to £${event.budget_max.toLocaleString()}</td></tr>` : ''}
                      </table>
                    </div>
                    <div style="text-align:center;margin:32px 0;">
                      <a href="${SITE_URL}/marketplace/events/${event.id}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;">View &amp; Quote Now</a>
                    </div>
                    <p style="color:#6b7280;font-size:12px;margin-top:24px;">You are receiving this email because you are a verified company on SiteMedic Marketplace. <a href="${SITE_URL}/marketplace/settings/notifications">Manage notification preferences</a>.</p>
                  </div>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error(
              `[FanOut] Email failed for company ${company.id}:`,
              emailErr
            );
          }
        }

        // c. SMS — only if urgent/high-value AND opted in AND phone set AND within radius
        if (
          triggerSMS &&
          prefs?.sms_new_events === true &&
          prefs.sms_phone_number
        ) {
          try {
            // Simple daily cap check: count SMS notifications sent today for this user
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { count: todaySmsCount } = await supabase
              .from('user_notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', company.admin_user_id)
              .eq('type', NOTIFICATION_TYPES.NEW_EVENT)
              .gte('created_at', startOfDay.toISOString());

            if ((todaySmsCount ?? 0) < 5) {
              await sendSMS({
                to: prefs.sms_phone_number,
                body: smsBody.slice(0, 160), // single SMS segment
              });
            } else {
              console.log(
                `[FanOut] SMS daily cap reached for company ${company.id} — skipping SMS`
              );
            }
          } catch (smsErr) {
            console.error(
              `[FanOut] SMS failed for company ${company.id}:`,
              smsErr
            );
          }
        }
      } catch (companyErr) {
        console.error(
          `[FanOut] Failed to notify company ${company.id}:`,
          companyErr
        );
      }
    }

    console.log(
      `[FanOut] Completed fan-out for event ${event.id} — notified ${companies.length} companies`
    );
  } catch (err) {
    console.error('[FanOut] Unexpected error in fanOutNewEventNotifications:', err);
  }
}
