/**
 * POST /api/marketplace/roster/invite — Send email invitation to join roster
 * Phase 37: Company Accounts — Plan 01
 *
 * Creates a roster entry with status='pending', generates a signed JWT invitation
 * token (7-day expiry), and sends an email via Resend.
 *
 * Body: { companyId, email, title?, qualifications? }
 * Auth: company admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SignJWT } from 'jose';
import { rosterInviteSchema } from '@/lib/marketplace/roster-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// JWT secret for invitation tokens
// =============================================================================

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ROSTER_INVITE_SECRET || 'dev-roster-invite-secret-not-for-production';
  return new TextEncoder().encode(secret);
}

// =============================================================================
// POST: Send invitation email
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = rosterInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { companyId, email, title, qualifications } = parsed.data;

    // Verify caller is company admin
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id, company_name')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not company admin' }, { status: 403 });
    }

    // Check if invitation already exists for this email + company
    const { data: existing } = await supabase
      .from('company_roster_medics')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('invitation_email', email)
      .in('status', ['pending', 'active'])
      .single();

    if (existing) {
      const statusMsg = existing.status === 'active'
        ? 'This email is already on the roster'
        : 'An invitation has already been sent to this email';
      return NextResponse.json({ error: statusMsg }, { status: 409 });
    }

    // Also check if a medic with this email is already in the roster
    const { data: existingMedic } = await supabase
      .from('medics')
      .select('id')
      .eq('email', email)
      .single();

    if (existingMedic) {
      const { data: existingRoster } = await supabase
        .from('company_roster_medics')
        .select('id')
        .eq('company_id', companyId)
        .eq('medic_id', existingMedic.id)
        .in('status', ['active', 'pending'])
        .single();

      if (existingRoster) {
        return NextResponse.json(
          { error: 'This medic is already on the roster' },
          { status: 409 }
        );
      }
    }

    // Generate signed JWT invitation token (7-day expiry)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await new SignJWT({
      company_id: companyId,
      email: email,
      type: 'roster_invite',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJwtSecret());

    // Create pending roster entry
    const { data: rosterEntry, error: insertError } = await supabase
      .from('company_roster_medics')
      .insert({
        company_id: companyId,
        medic_id: existingMedic?.id || null,
        status: 'pending',
        title: title || null,
        qualifications: qualifications || null,
        invitation_email: email,
        invitation_token: token,
        invitation_sent_at: new Date().toISOString(),
        added_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Roster Invite] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:30500';
    const acceptUrl = `${appUrl}/marketplace/roster/accept?token=${token}`;

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'SiteMedic <noreply@sitemedic.co.uk>',
          to: email,
          subject: `${company.company_name} invites you to join their roster on SiteMedic`,
          html: `
            <h2>You've been invited to join ${company.company_name}'s roster</h2>
            <p>${company.company_name} would like to add you to their team on SiteMedic's MedBid Marketplace.</p>
            ${title ? `<p><strong>Role:</strong> ${title}</p>` : ''}
            <p>Click the link below to accept the invitation:</p>
            <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background-color:#2563EB;color:white;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
            <p><small>This invitation expires on ${expiresAt.toLocaleDateString('en-GB')}.</small></p>
            <p><small>If you did not expect this invitation, you can safely ignore this email.</small></p>
          `,
        });
      } else {
        // Dev fallback: log to console
        console.log('[Roster Invite] Dev mode — email not sent (no RESEND_API_KEY)');
        console.log(`[Roster Invite] Accept URL: ${acceptUrl}`);
        console.log(`[Roster Invite] To: ${email}, Company: ${company.company_name}`);
      }
    } catch (emailError) {
      // Email failure should NOT block the invitation creation
      console.error('[Roster Invite] Email send error (non-blocking):', emailError);
    }

    return NextResponse.json({
      rosterEntry,
      invitation: {
        company_id: companyId,
        invitation_email: email,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Roster Invite] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
