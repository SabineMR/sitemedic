/**
 * GET/PUT /api/admin/branding
 * Org branding API route (logo, colour, company name, tagline)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { requireTier } from '@/lib/billing/require-tier';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    try {
      await requireTier('white_label');
    } catch (err) {
      if (err instanceof Error && err.message === 'TIER_INSUFFICIENT') {
        return NextResponse.json(
          { error: 'This feature requires the Growth plan or higher' },
          { status: 403 }
        );
      }
      throw err;
    }

    const { data, error } = await supabase
      .from('org_branding')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        company_name: null,
        tagline: null,
        primary_colour_hex: null,
        logo_path: null,
      });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/admin/branding error:', err);
    const message = err instanceof Error ? err.message : '';
    const isAuthError = message.includes('org') || message.includes('auth') || message.includes('Unauthorized');
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : 'Internal server error' },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    try {
      await requireTier('white_label');
    } catch (err) {
      if (err instanceof Error && err.message === 'TIER_INSUFFICIENT') {
        return NextResponse.json(
          { error: 'This feature requires the Growth plan or higher' },
          { status: 403 }
        );
      }
      throw err;
    }

    let body: {
      company_name?: unknown;
      tagline?: unknown;
      primary_colour_hex?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate hex colour format if provided
    if (body.primary_colour_hex !== undefined && body.primary_colour_hex !== null) {
      if (typeof body.primary_colour_hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.primary_colour_hex)) {
        return NextResponse.json(
          { error: 'primary_colour_hex must be a valid hex colour (e.g. #1A2B3C)' },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.company_name !== undefined) updatePayload.company_name = body.company_name || null;
    if (body.tagline !== undefined) updatePayload.tagline = body.tagline || null;
    if (body.primary_colour_hex !== undefined) updatePayload.primary_colour_hex = body.primary_colour_hex || null;

    const { data, error } = await supabase
      .from('org_branding')
      .update(updatePayload)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating org branding:', error);
      return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('PUT /api/admin/branding error:', err);
    const message = err instanceof Error ? err.message : '';
    const isAuthError = message.includes('org') || message.includes('auth') || message.includes('Unauthorized');
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : 'Internal server error' },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
