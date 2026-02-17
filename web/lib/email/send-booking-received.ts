/**
 * sendBookingReceivedEmail
 *
 * Sends an immediate "booking received" acknowledgement email to the client
 * as soon as a booking is created — independent of medic matching.
 *
 * Call this fire-and-forget from the create/create-payment-intent routes.
 */

import { createClient } from '@/lib/supabase/server';
import { resend } from '@/lib/email/resend';
import BookingReceivedEmail from '@/lib/email/templates/booking-received-email';
import { render } from '@react-email/components';

export async function sendBookingReceivedEmail(bookingId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        clients (
          id,
          company_name,
          contact_name,
          contact_email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('❌ Failed to fetch booking for received email:', error);
      return;
    }

    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    if (!client) {
      console.error('❌ Client data missing for booking received email, bookingId:', bookingId);
      return;
    }

    const formattedDate = new Date(booking.shift_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'}/dashboard`;

    const emailHtml = await render(
      BookingReceivedEmail({
        booking: {
          date: formattedDate,
          startTime: booking.shift_start_time,
          endTime: booking.shift_end_time,
          siteName: booking.site_name,
          siteAddress: `${booking.site_address}, ${booking.site_postcode}`,
        },
        client: {
          name: client.contact_name || client.company_name,
        },
        dashboardUrl,
      })
    );

    const result = await resend.emails.send({
      from: 'ASG Bookings <bookings@sitemedic.co.uk>',
      to: client.contact_email,
      subject: `Booking Received — ${formattedDate}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('⚠️  Failed to send booking received email:', result.error);
    } else {
      console.log('✅ Booking received email sent:', result.data?.id);
    }
  } catch (err) {
    console.error('⚠️  Error sending booking received email:', err);
  }
}
