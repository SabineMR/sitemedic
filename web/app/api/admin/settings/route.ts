/**
 * GET/PUT /api/admin/settings
 * Phase 11-02: Org Settings API Route
 *
 * GET  - Fetch current org settings from org_settings table
 * PUT  - Validate and update org settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    const { data, error } = await supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    const VALID_VERTICALS = new Set([
      'construction', 'tv_film', 'motorsport', 'festivals',
      'sporting_events', 'fairs_shows', 'corporate',
      'private_events', 'education', 'outdoor_adventure',
    ]);

    let body: {
      base_rate?: unknown;
      geofence_default_radius?: unknown;
      urgency_premiums?: unknown;
      admin_email?: unknown;
      net30_eligible?: unknown;
      credit_limit?: unknown;
      industry_verticals?: unknown;
      cqc_registered?: unknown;
      cqc_registration_number?: unknown;
      cqc_registration_date?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate base_rate: must be number > 0
    if (body.base_rate !== undefined) {
      const rate = Number(body.base_rate);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          { error: 'base_rate must be a number greater than 0' },
          { status: 400 }
        );
      }
    }

    // Validate geofence_default_radius: must be integer 50-5000
    if (body.geofence_default_radius !== undefined) {
      const radius = Number(body.geofence_default_radius);
      if (!Number.isInteger(radius) || radius < 50 || radius > 5000) {
        return NextResponse.json(
          { error: 'geofence_default_radius must be an integer between 50 and 5000' },
          { status: 400 }
        );
      }
    }

    // Validate urgency_premiums: must be array of non-negative numbers with at least one element
    if (body.urgency_premiums !== undefined) {
      if (!Array.isArray(body.urgency_premiums) || body.urgency_premiums.length === 0) {
        return NextResponse.json(
          { error: 'urgency_premiums must be a non-empty array' },
          { status: 400 }
        );
      }
      const allNonNegative = (body.urgency_premiums as unknown[]).every(
        (v) => typeof v === 'number' && v >= 0
      );
      if (!allNonNegative) {
        return NextResponse.json(
          { error: 'urgency_premiums must contain only non-negative numbers' },
          { status: 400 }
        );
      }
    }

    // Validate admin_email: if provided must contain @
    if (body.admin_email !== undefined && body.admin_email !== '') {
      if (typeof body.admin_email !== 'string' || !body.admin_email.includes('@')) {
        return NextResponse.json(
          { error: 'admin_email must be a valid email address' },
          { status: 400 }
        );
      }
    }

    // Validate credit_limit: must be number >= 0
    if (body.credit_limit !== undefined) {
      const limit = Number(body.credit_limit);
      if (isNaN(limit) || limit < 0) {
        return NextResponse.json(
          { error: 'credit_limit must be a number greater than or equal to 0' },
          { status: 400 }
        );
      }
    }

    // Validate cqc_registration_number: if provided must be a non-empty string
    if (body.cqc_registration_number !== undefined && body.cqc_registration_number !== null && body.cqc_registration_number !== '') {
      if (typeof body.cqc_registration_number !== 'string' || body.cqc_registration_number.trim().length === 0) {
        return NextResponse.json(
          { error: 'cqc_registration_number must be a non-empty string' },
          { status: 400 }
        );
      }
    }

    // Validate cqc_registration_date: if provided must be a valid date string
    if (body.cqc_registration_date !== undefined && body.cqc_registration_date !== null && body.cqc_registration_date !== '') {
      if (typeof body.cqc_registration_date !== 'string' || isNaN(Date.parse(body.cqc_registration_date))) {
        return NextResponse.json(
          { error: 'cqc_registration_date must be a valid date string (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    }

    // Validate industry_verticals: must be non-empty array of known vertical IDs
    if (body.industry_verticals !== undefined) {
      if (!Array.isArray(body.industry_verticals) || body.industry_verticals.length === 0) {
        return NextResponse.json(
          { error: 'industry_verticals must be a non-empty array' },
          { status: 400 }
        );
      }
      const allValid = (body.industry_verticals as unknown[]).every(
        (v) => typeof v === 'string' && VALID_VERTICALS.has(v)
      );
      if (!allValid) {
        return NextResponse.json(
          { error: 'industry_verticals contains an unrecognised vertical ID' },
          { status: 400 }
        );
      }
    }

    // Build update payload — only include defined fields
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.base_rate !== undefined) updatePayload.base_rate = Number(body.base_rate);
    if (body.geofence_default_radius !== undefined)
      updatePayload.geofence_default_radius = Number(body.geofence_default_radius);
    if (body.urgency_premiums !== undefined) updatePayload.urgency_premiums = body.urgency_premiums;
    if (body.admin_email !== undefined) updatePayload.admin_email = body.admin_email;
    if (body.net30_eligible !== undefined) updatePayload.net30_eligible = Boolean(body.net30_eligible);
    if (body.credit_limit !== undefined) updatePayload.credit_limit = Number(body.credit_limit);
    if (body.industry_verticals !== undefined) updatePayload.industry_verticals = body.industry_verticals;
    if (body.cqc_registered !== undefined) updatePayload.cqc_registered = Boolean(body.cqc_registered);
    if (body.cqc_registration_number !== undefined)
      updatePayload.cqc_registration_number = body.cqc_registration_number === '' ? null : body.cqc_registration_number;
    if (body.cqc_registration_date !== undefined)
      updatePayload.cqc_registration_date = body.cqc_registration_date === '' ? null : body.cqc_registration_date;

    const { data, error } = await supabase
      .from('org_settings')
      .update(updatePayload)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating org settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
