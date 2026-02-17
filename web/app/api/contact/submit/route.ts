/**
 * POST /api/contact/submit
 * Accepts the /contact page enquiry form, emails admin via Resend.
 *
 * No DB table required. Admin receives full enquiry details by email and
 * can reply directly to the sender.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

interface ContactRequest {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone?: string;
  siteSize?: string;
  enquiryType: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactRequest = await request.json();

    if (!body.firstName || !body.lastName || !body.email || !body.enquiryType) {
      return NextResponse.json(
        { error: 'First name, last name, email, and enquiry type are required' },
        { status: 400 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk';
    const fullName = `${body.firstName} ${body.lastName}`;

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e293b">New Contact Enquiry — ${body.enquiryType}</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;width:40%">Name</td><td style="padding:8px 0">${fullName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Company</td><td style="padding:8px 0">${body.company}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email</td><td style="padding:8px 0"><a href="mailto:${body.email}">${body.email}</a></td></tr>
          ${body.phone ? `<tr><td style="padding:8px 0;color:#64748b;font-weight:600">Phone</td><td style="padding:8px 0">${body.phone}</td></tr>` : ''}
          ${body.siteSize ? `<tr><td style="padding:8px 0;color:#64748b;font-weight:600">Site Workforce Size</td><td style="padding:8px 0">${body.siteSize}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Enquiry Type</td><td style="padding:8px 0">${body.enquiryType}</td></tr>
          ${body.message ? `<tr><td style="padding:8px 0;color:#64748b;font-weight:600;vertical-align:top">Message</td><td style="padding:8px 0;white-space:pre-wrap">${body.message}</td></tr>` : ''}
        </table>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
        <p style="color:#64748b;font-size:14px">Reply to <a href="mailto:${body.email}">${body.email}</a>${body.phone ? ` or call ${body.phone}` : ''} to follow up.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: 'SiteMedic Contact <bookings@sitemedic.co.uk>',
      to: adminEmail,
      replyTo: body.email,
      subject: `New Enquiry: ${body.enquiryType} — ${body.company} (${fullName})`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('⚠️  Failed to send contact enquiry email:', result.error);
      // Don't expose Resend errors to the client — still return success
    } else {
      console.log('✅ Contact enquiry email sent:', result.data?.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/contact/submit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
