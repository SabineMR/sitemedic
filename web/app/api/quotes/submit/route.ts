/**
 * POST /api/quotes/submit
 * Accepts a QuoteBuilder form payload, persists to DB, emails admin, returns quote reference.
 *
 * DB-first: Persists to quote_submissions via service-role client (bypasses RLS).
 * DB insert is blocking — returns 500 if it fails.
 * Email notification is fire-and-forget after successful DB write.
 * Caller receives a short quote reference (QT-XXXX) for the confirmation screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

interface QuoteSubmitRequest {
  workerCount: string;
  projectType: string;
  medicCount: string;
  duration: string;
  durationKnown: string;
  estimatedDuration: string;
  location: string;
  siteAddress: string;
  coordinates?: string;
  what3wordsAddress?: string;
  startDate: string;
  endDate: string;
  projectPhase: string;
  specialRequirements: string[];
  name: string;
  email: string;
  phone: string;
  company: string;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteSubmitRequest = await request.json();

    // Basic validation — name/email/phone are the minimum we need to follow up
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Generate a short, human-readable quote reference
    const quoteRef = `QT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // DB insert is FIRST and BLOCKING
    const supabase = getServiceRoleClient();
    const orgId = process.env.ASG_ORG_ID;
    const { error: dbError } = await supabase.from('quote_submissions').insert({
      org_id: orgId,
      quote_ref: quoteRef,
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company || null,
      worker_count: body.workerCount || null,
      project_type: body.projectType || null,
      medic_count: body.medicCount || null,
      duration_known: body.durationKnown || null,
      estimated_duration: body.estimatedDuration || null,
      site_address: body.siteAddress || null,
      coordinates: body.coordinates || null,
      what3words_address: body.what3wordsAddress || null,
      start_date: body.startDate || null,
      end_date: body.endDate || null,
      project_phase: body.projectPhase || null,
      special_requirements: body.specialRequirements ?? [],
      status: 'new',
    });

    if (dbError) {
      console.error('Failed to persist quote submission to DB:', dbError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk';

    // Build a plain-text summary for the admin email
    const specialReqs = body.specialRequirements?.length
      ? body.specialRequirements.join(', ')
      : 'None';

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e293b">New Quote Request — ${quoteRef}</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600;width:40%">Reference</td><td style="padding:8px 0">${quoteRef}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Name</td><td style="padding:8px 0">${body.name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email</td><td style="padding:8px 0"><a href="mailto:${body.email}">${body.email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Phone</td><td style="padding:8px 0">${body.phone}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Company</td><td style="padding:8px 0">${body.company || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Workers on Site</td><td style="padding:8px 0">${body.workerCount || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Project Type</td><td style="padding:8px 0">${body.projectType || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Medics Required</td><td style="padding:8px 0">${body.medicCount || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Duration</td><td style="padding:8px 0">${body.estimatedDuration || '—'} (${body.durationKnown})</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Site Address</td><td style="padding:8px 0">${body.siteAddress || '—'}</td></tr>
          ${body.what3wordsAddress ? `<tr><td style="padding:8px 0;color:#64748b;font-weight:600">what3words</td><td style="padding:8px 0">${body.what3wordsAddress}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Start Date</td><td style="padding:8px 0">${body.startDate || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">End Date</td><td style="padding:8px 0">${body.endDate || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Project Phase</td><td style="padding:8px 0">${body.projectPhase || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Special Requirements</td><td style="padding:8px 0">${specialReqs}</td></tr>
        </table>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
        <p style="color:#64748b;font-size:14px">Reply to <a href="mailto:${body.email}">${body.email}</a> or call ${body.phone} to follow up.</p>
      </div>
    `;

    // Email is FIRE-AND-FORGET — failure does not block the response
    resend.emails.send({
      from: 'SiteMedic Quotes <bookings@sitemedic.co.uk>',
      to: adminEmail,
      replyTo: body.email,
      subject: `New Quote Request ${quoteRef} — ${body.company || body.name}`,
      html: emailHtml,
    }).catch(err => console.error('Email send failed (non-blocking):', err));

    return NextResponse.json({ success: true, quoteRef });
  } catch (error) {
    console.error('Error in /api/quotes/submit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
