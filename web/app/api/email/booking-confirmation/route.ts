/**
 * Booking Confirmation Email API
 * Phase 4.5: Send confirmation emails with calendar invite
 *
 * Supports two email types:
 *   type: 'received'  — Immediate acknowledgement sent on booking creation (no medic_id required)
 *   type: 'confirmed' — Full confirmation with medic details (default; requires medic_id)
 */

import { createClient } from '@/lib/supabase/server';
import { resend } from '@/lib/email/resend';
import { generateBookingIcs } from '@/lib/booking/calendar';
import BookingConfirmationEmail from '@/lib/email/templates/booking-confirmation-email';
import MedicAssignmentEmail from '@/lib/email/templates/medic-assignment-email';
import { sendBookingReceivedEmail } from '@/lib/email/send-booking-received';
import { NextResponse } from 'next/server';
import { render } from '@react-email/components';
import type { EmailBranding } from '@/lib/email/types';
import { DEFAULT_EMAIL_BRANDING } from '@/lib/email/types';
import { hasFeature } from '@/lib/billing/feature-gates';

interface EmailRequest {
  bookingId: string;
  type?: 'received' | 'confirmed';
}

export async function POST(request: Request) {
  try {
    const { bookingId, type = 'confirmed' }: EmailRequest = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      );
    }

    // Handle 'received' type — delegate to shared helper, no medic required
    if (type === 'received') {
      await sendBookingReceivedEmail(bookingId);
      return NextResponse.json({ clientEmailSent: true, medicEmailSent: false });
    }

    const supabase = await createClient();

    // Fetch booking with medic, client, and site details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        clients (
          id,
          org_id,
          company_name,
          contact_name,
          contact_email
        ),
        medics (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Failed to fetch booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found', details: bookingError?.message },
        { status: 404 }
      );
    }

    // SAFETY CHECK: booking.medic_id MUST be set
    if (!booking.medic_id) {
      console.error('❌ Booking has no assigned medic');
      return NextResponse.json(
        { error: 'Booking has no assigned medic. Cannot send confirmation email.' },
        { status: 400 }
      );
    }

    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    const medic = Array.isArray(booking.medics) ? booking.medics[0] : booking.medics;

    if (!client || !medic) {
      console.error('❌ Client or medic data missing');
      return NextResponse.json(
        { error: 'Client or medic data missing' },
        { status: 400 }
      );
    }

    // Fetch org branding for email personalisation
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

    // Generate .ics calendar invite
    const icsString = generateBookingIcs({
      date: booking.shift_date,
      startTime: booking.shift_start_time,
      endTime: booking.shift_end_time,
      siteName: booking.site_name,
      siteAddress: `${booking.site_address}, ${booking.site_postcode}`,
      medicName: `${medic.first_name} ${medic.last_name}`,
      clientEmail: client.contact_email,
      clientName: client.contact_name || client.company_name,
    });

    // Format date for email display
    const formattedDate = new Date(booking.shift_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'}/book/confirmation?booking_id=${bookingId}`;
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'}/dashboard`;

    // Send email to CLIENT
    let clientEmailSent = false;
    try {
      const clientEmailHtml = await render(
        BookingConfirmationEmail({
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
          medic: {
            name: `${medic.first_name} ${medic.last_name}`,
          },
          pricing: {
            total: booking.total || 0,
          },
          confirmationUrl,
          branding,
        })
      );

      const clientEmailResult = await resend.emails.send({
        from: `${branding.companyName} Bookings <bookings@sitemedic.co.uk>`,
        to: client.contact_email,
        subject: `Booking Confirmed - ${formattedDate}`,
        html: clientEmailHtml,
        attachments: [
          {
            filename: 'booking.ics',
            content: icsString,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
      });

      if (clientEmailResult.error) {
        console.error('⚠️  Failed to send client email:', clientEmailResult.error);
      } else {
        clientEmailSent = true;
      }
    } catch (error) {
      console.error('⚠️  Client email error:', error);
    }

    // Send email to MEDIC
    let medicEmailSent = false;
    try {
      const medicEmailHtml = await render(
        MedicAssignmentEmail({
          booking: {
            date: formattedDate,
            startTime: booking.shift_start_time,
            endTime: booking.shift_end_time,
            siteName: booking.site_name,
            siteAddress: `${booking.site_address}, ${booking.site_postcode}`,
            siteContactName: booking.site_contact_name || client.contact_name,
            siteContactPhone: booking.site_contact_phone || '',
            specialNotes: booking.special_notes || '',
            confinedSpaceRequired: booking.confined_space_required || false,
            traumaSpecialistRequired: booking.trauma_specialist_required || false,
          },
          medic: {
            name: `${medic.first_name} ${medic.last_name}`,
          },
          dashboardUrl,
          branding,
        })
      );

      const medicEmailResult = await resend.emails.send({
        from: `${branding.companyName} <bookings@sitemedic.co.uk>`,
        to: medic.email,
        subject: `New Booking Assignment - ${formattedDate} at ${booking.site_name}`,
        html: medicEmailHtml,
        // NO .ics attachment for medic (they use the dashboard)
      });

      if (medicEmailResult.error) {
        console.error('⚠️  Failed to send medic email:', medicEmailResult.error);
      } else {
        medicEmailSent = true;
      }
    } catch (error) {
      console.error('⚠️  Medic email error:', error);
    }

    return NextResponse.json({
      clientEmailSent,
      medicEmailSent,
    });

  } catch (error) {
    console.error('❌ Email confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
