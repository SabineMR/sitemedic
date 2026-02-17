/**
 * POST /api/contact/submit
 * Accepts the /contact page enquiry form.
 *
 * DB-first: Persists to contact_submissions via service-role client (bypasses RLS).
 * DB insert is blocking — returns 500 if it fails.
 * Email notification is fire-and-forget after successful DB write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

    // DB insert is FIRST and BLOCKING
    const supabase = getServiceRoleClient();
    const orgId = process.env.ASG_ORG_ID;
    const { error: dbError } = await supabase.from('contact_submissions').insert({
      org_id: orgId,
      first_name: body.firstName,
      last_name: body.lastName,
      company: body.company,
      email: body.email,
      phone: body.phone || null,
      site_size: body.siteSize || null,
      enquiry_type: body.enquiryType,
      message: body.message || null,
      status: 'new',
    });

    if (dbError) {
      console.error('Failed to persist contact submission to DB:', dbError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let adminEmail = process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk';
    if (orgId) {
      const { data: orgSettings } = await supabase
        .from('org_settings')
        .select('admin_email')
        .eq('org_id', orgId)
        .single();
      if (orgSettings?.admin_email) {
        adminEmail = orgSettings.admin_email;
      }
    }
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

    // Email is FIRE-AND-FORGET — failure does not block the response
    resend.emails.send({
      from: 'SiteMedic Contact <bookings@sitemedic.co.uk>',
      to: adminEmail,
      replyTo: body.email,
      subject: `New Enquiry: ${body.enquiryType} — ${body.company} (${fullName})`,
      html: emailHtml,
    }).catch((err: unknown) => console.error('Email send failed (non-blocking):', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/contact/submit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
