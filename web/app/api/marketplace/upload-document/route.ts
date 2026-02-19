/**
 * POST /api/marketplace/upload-document
 * Phase 32: Marketplace Company Registration
 *
 * Handles multipart file upload for compliance documents.
 * Uploads to private compliance-documents storage bucket using the
 * folder convention: {companyId}/{documentType}/{filename}
 *
 * Auth required: user must be the admin_user_id of the company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/lib/marketplace/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for compliance documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Valid document types (matches SQL CHECK constraint)
const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'public_liability_insurance',
  'employers_liability_insurance',
  'professional_indemnity_insurance',
  'dbs_certificate',
  'other',
];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
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
    const companyId = formData.get('companyId') as string | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const expiryDate = formData.get('expiryDate') as string | null;
    const certificateNumber = formData.get('certificateNumber') as string | null;
    const staffMemberName = formData.get('staffMemberName') as string | null;

    // 3. Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX` },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // 4. Verify the user is the admin_user_id of the company
    const { data: company, error: companyError } = await serviceClient
      .from('marketplace_companies')
      .select('id, admin_user_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    if (company.admin_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorised to upload documents for this company' },
        { status: 403 }
      );
    }

    // 5. Upload file to Supabase Storage
    const storagePath = `${companyId}/${documentType}/${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceClient.storage
      .from('compliance-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Allow re-upload of same document
      });

    if (uploadError) {
      console.error('[Upload Document] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // 6. Create compliance_documents row
    const { data: doc, error: docError } = await serviceClient
      .from('compliance_documents')
      .insert({
        company_id: companyId,
        uploaded_by: user.id,
        document_type: documentType,
        storage_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        expiry_date: expiryDate || null,
        certificate_number: certificateNumber || null,
        staff_member_name: staffMemberName || null,
        review_status: 'pending',
      })
      .select('id, storage_path, file_name')
      .single();

    if (docError) {
      console.error('[Upload Document] DB insert error:', docError);
      return NextResponse.json(
        { error: 'Failed to save document record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        storagePath: doc.storage_path,
        fileName: doc.file_name,
      },
    });
  } catch (error) {
    console.error('[Upload Document] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
