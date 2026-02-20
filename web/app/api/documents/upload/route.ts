/**
 * POST /api/documents/upload
 * Phase 45-01: Upload a compliance document with versioning
 *
 * Accepts FormData with: file, categoryId, expiryDate (optional),
 * certificateNumber (optional), notes (optional), replaceDocumentId (optional).
 *
 * Versioning: If replaceDocumentId is provided, creates a new version for that
 * document. Otherwise creates a new document record + first version.
 *
 * Storage: Files stored in private medic-documents bucket at
 * {org_id}/{medic_id}/{category_slug}/{timestamp}-{filename}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
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

    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const categoryId = formData.get('categoryId') as string | null;
    const expiryDate = formData.get('expiryDate') as string | null;
    const certificateNumber = formData.get('certificateNumber') as string | null;
    const notes = formData.get('notes') as string | null;
    const replaceDocumentId = formData.get('replaceDocumentId') as string | null;

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Accepted: PDF, JPEG, PNG' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate categoryId
    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      );
    }

    // Verify category belongs to org
    const { data: category, error: catError } = await supabase
      .from('document_categories')
      .select('id, slug')
      .eq('id', categoryId)
      .eq('org_id', orgId)
      .single();

    if (catError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get medic record for current user
    const { data: medicRecord, error: medicError } = await supabase
      .from('medics')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (medicError || !medicRecord) {
      return NextResponse.json(
        { error: 'Medic record not found for current user' },
        { status: 404 }
      );
    }

    const medicId = medicRecord.id;

    // Sanitize filename and build storage path
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/${medicId}/${category.slug}/${Date.now()}-${sanitizedFileName}`;

    // Read file as ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('medic-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Parse expiry date (null means "does not expire")
    const parsedExpiry = expiryDate && expiryDate !== 'null' ? expiryDate : null;

    if (replaceDocumentId) {
      // VERSIONING: Add new version to existing document
      // Get current max version number
      const { data: maxVersion } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', replaceDocumentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1;

      // Insert new version
      const { data: newVersion, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: replaceDocumentId,
          org_id: orgId,
          storage_path: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          expiry_date: parsedExpiry,
          certificate_number: certificateNumber || null,
          notes: notes || null,
          version_number: nextVersionNumber,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (versionError || !newVersion) {
        console.error('Error creating version:', versionError);
        return NextResponse.json(
          { error: 'Failed to create document version' },
          { status: 500 }
        );
      }

      // Update document's current_version_id
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          current_version_id: newVersion.id,
          status: 'pending',
        })
        .eq('id', replaceDocumentId);

      if (updateError) {
        console.error('Error updating document:', updateError);
      }

      return NextResponse.json(
        { document_id: replaceDocumentId, version: newVersion },
        { status: 201 }
      );
    } else {
      // NEW DOCUMENT: Create document + first version
      const { data: newDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          medic_id: medicId,
          category_id: categoryId,
          status: 'pending',
        })
        .select()
        .single();

      if (docError || !newDoc) {
        console.error('Error creating document:', docError);
        return NextResponse.json(
          { error: 'Failed to create document record' },
          { status: 500 }
        );
      }

      // Create first version
      const { data: newVersion, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: newDoc.id,
          org_id: orgId,
          storage_path: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          expiry_date: parsedExpiry,
          certificate_number: certificateNumber || null,
          notes: notes || null,
          version_number: 1,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (versionError || !newVersion) {
        console.error('Error creating version:', versionError);
        return NextResponse.json(
          { error: 'Failed to create document version' },
          { status: 500 }
        );
      }

      // Update document's current_version_id
      const { error: updateError } = await supabase
        .from('documents')
        .update({ current_version_id: newVersion.id })
        .eq('id', newDoc.id);

      if (updateError) {
        console.error('Error updating current_version_id:', updateError);
      }

      return NextResponse.json(
        { document: newDoc, version: newVersion },
        { status: 201 }
      );
    }
  } catch (err) {
    console.error('POST /api/documents/upload error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
