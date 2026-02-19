/**
 * GET/PUT/POST /api/platform/organizations/[id]/branding
 * Phase 31-02: Platform admin branding override for any org.
 *
 * Uses service-role client to bypass RLS — platform admin's JWT has org_id=NULL,
 * so regular RLS policies would block all writes.
 *
 * GET  — Read branding for the given org
 * PUT  — Auto-save text fields (company_name, tagline, primary_colour_hex, logo_path)
 * POST — Upload logo via FormData (server-side storage upload)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Service-role Supabase client (same pattern as activate/route.ts)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Platform admin auth check helper
// ---------------------------------------------------------------------------

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  if (user.app_metadata?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — platform admin access required' }, { status: 403 }) };
  }

  return { user };
}

// ---------------------------------------------------------------------------
// Hex colour validation
// ---------------------------------------------------------------------------

const HEX_COLOUR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// Logo upload constants
// ---------------------------------------------------------------------------

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

// ---------------------------------------------------------------------------
// GET handler — Read org branding
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformAdmin();
    if ('error' in auth && auth.error) return auth.error;

    const { id: orgId } = await params;

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
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
    console.error('GET /api/platform/organizations/[id]/branding error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler — Auto-save text fields
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformAdmin();
    if ('error' in auth && auth.error) return auth.error;

    const { id: orgId } = await params;

    let body: {
      company_name?: unknown;
      tagline?: unknown;
      primary_colour_hex?: unknown;
      logo_path?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate hex colour format if provided
    if (body.primary_colour_hex !== undefined && body.primary_colour_hex !== null) {
      if (
        typeof body.primary_colour_hex !== 'string' ||
        !HEX_COLOUR_REGEX.test(body.primary_colour_hex)
      ) {
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
    if (body.logo_path !== undefined) updatePayload.logo_path = typeof body.logo_path === 'string' ? body.logo_path : null;

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
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
    console.error('PUT /api/platform/organizations/[id]/branding error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — Logo upload via FormData (server-side storage upload)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformAdmin();
    if ('error' in auth && auth.error) return auth.error;

    const { id: orgId } = await params;

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('logo') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: PNG, JPEG, SVG.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // Determine file extension from MIME type
    const ext = MIME_TO_EXT[file.type] || 'png';
    const storagePath = `${orgId}/logo.${ext}`;

    // Convert File to Buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());

    const serviceClient = getServiceClient();

    // Upload to Supabase Storage via service-role client
    const { error: uploadError } = await serviceClient.storage
      .from('org-logos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Logo upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      );
    }

    // Update org_branding.logo_path
    const { error: updateError } = await serviceClient
      .from('org_branding')
      .update({
        logo_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Failed to update logo_path:', updateError);
      return NextResponse.json(
        { error: 'Logo uploaded but failed to save path' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('org-logos')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      logo_path: storagePath,
      logo_url: urlData.publicUrl,
    });
  } catch (err) {
    console.error('POST /api/platform/organizations/[id]/branding error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
