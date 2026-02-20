/**
 * GET /api/messages/attachments/download
 * Phase 47-03: Generate signed URL for attachment download
 *
 * Accepts query param: path (storage path from message metadata).
 * Validates org access via path prefix, generates 1-hour signed URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get org_id
    const orgId = await requireOrgId();

    // 3. Get storage path
    const path = request.nextUrl.searchParams.get('path');
    if (!path) {
      return NextResponse.json(
        { error: 'path query parameter is required' },
        { status: 400 }
      );
    }

    // 4. Security: validate path starts with user's orgId
    if (!path.startsWith(`${orgId}/`)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 5. Generate signed URL (1 hour)
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(path, 3600);

    if (signError || !signedUrlData) {
      console.error('Signed URL error:', signError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Extract filename from path (last segment after timestamp-uuid prefix)
    const pathSegments = path.split('/');
    const rawFileName = pathSegments[pathSegments.length - 1] || 'download';
    // Remove timestamp-uuid prefix: "1708000000-abc12345-filename.pdf" -> "filename.pdf"
    const fileName = rawFileName.replace(/^\d+-[a-f0-9]+-/, '');

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      fileName,
    });
  } catch (err) {
    console.error('Attachment download error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
