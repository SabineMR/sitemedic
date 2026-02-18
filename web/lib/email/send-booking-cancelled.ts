/**
 * sendBookingCancelledEmail
 *
 * Sends a cancellation confirmation email to the client with refund details.
 * Fire-and-forget pattern — logs errors but does not throw.
 */

import { createClient } from '@/lib/supabase/server';
import { resend } from '@/lib/email/resend';
import BookingCancelledEmail from '@/lib/email/templates/booking-cancelled-email';
import { render } from '@react-email/components';
import type { EmailBranding } from '@/lib/email/types';
import { DEFAULT_EMAIL_BRANDING } from '@/lib/email/types';
import { hasFeature } from '@/lib/billing/feature-gates';

export async function sendBookingCancelledEmail(params: {
  bookingId: string;
  refundPercent: number;
  refundAmount: number;
  reason?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        clients (
          id,
          org_id,
          company_name,
          contact_name,
          contact_email
        )
      `)
      .eq('id', params.bookingId)
      .single();

    if (error || !booking) {
      console.error('Failed to fetch booking for cancellation email:', error);
      return;
    }

    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    if (!client) {
      console.error('Client data missing for cancellation email, bookingId:', params.bookingId);
      return;
    }

    const formattedDate = new Date(booking.shift_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Fetch org branding
    let branding: EmailBranding = { ...DEFAULT_EMAIL_BRANDING };
    if (client.org_id) {
      const [{ data: orgBranding }, { data: org }] = await Promise.all([
        supabase
          .from('org_branding')
          .select('company_name, logo_path, primary_colour_hex, tagline')
          .eq('org_id', client.org_id)
          .single(),
        supabase
          .from('organizations')
          .select('subscription_tier')
          .eq('id', client.org_id)
          .single(),
      ]);

      if (orgBranding) {
        const logoUrl = orgBranding.logo_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${orgBranding.logo_path}`
          : null;
        branding = {
          companyName: orgBranding.company_name || 'SiteMedic',
          logoUrl,
          primaryColourHex: orgBranding.primary_colour_hex,
          tagline: orgBranding.tagline,
          showPoweredBy: !hasFeature(org?.subscription_tier ?? null, 'white_label'),
        };
      }
    }

    const emailHtml = await render(
      BookingCancelledEmail({
        booking: {
          date: formattedDate,
          startTime: booking.shift_start_time,
          endTime: booking.shift_end_time,
          siteName: booking.site_name,
        },
        client: {
          name: client.contact_name || client.company_name,
        },
        refund: {
          percent: params.refundPercent,
          amount: params.refundAmount,
        },
        reason: params.reason,
        branding,
      })
    );

    const result = await resend.emails.send({
      from: `${branding.companyName} <bookings@sitemedic.co.uk>`,
      to: client.contact_email,
      subject: `Booking Cancelled — ${formattedDate}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('Failed to send cancellation email:', result.error);
    }
  } catch (err) {
    console.error('Error sending cancellation email:', err);
  }
}
