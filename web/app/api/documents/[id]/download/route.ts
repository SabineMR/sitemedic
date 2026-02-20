/**
 * GET /api/documents/[id]/download
 * Phase 45-01: Generate signed URL for document download
 *
 * Returns a signed URL (1-hour expiry) for the document's current version,
 * or for a specific version if versionId query param is provided.
 *
 * Private bucket (medic-documents) requires signed URLs for access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await requireOrgId();
    const { id: documentId } = await params;

    // Check for optional versionId query param (for downloading archived versions)
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    // Verify document belongs to user's org
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, org_id, current_version_id')
      .eq('id', documentId)
      .eq('org_id', orgId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get the version to download
    const targetVersionId = versionId || document.current_version_id;
    if (!targetVersionId) {
      return NextResponse.json(
        { error: 'No version available for this document' },
        { status: 404 }
      );
    }

    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('storage_path, file_name')
      .eq('id', targetVersionId)
      .eq('document_id', documentId)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: 'Document version not found' },
        { status: 404 }
      );
    }

    // Generate signed URL (1-hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('medic-documents')
      .createSignedUrl(version.storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Error generating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      fileName: version.file_name,
    });
  } catch (err) {
    console.error('GET /api/documents/[id]/download error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
