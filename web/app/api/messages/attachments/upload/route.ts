/**
 * POST /api/messages/attachments/upload
 * Phase 47-03: Upload a file attachment in a conversation
 *
 * Accepts FormData with: file (required), conversationId (required),
 * content (optional text caption). Stores file in message-attachments
 * bucket and creates an attachment message with metadata.
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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
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

    // 3. Parse FormData
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
    const conversationId = formData.get('conversationId') as string | null;
    const captionText = (formData.get('content') as string | null)?.trim() || null;

    // 4. Validate
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'File type not supported. Accepted: PDF, JPEG, PNG, Word documents.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // 5. Verify conversation exists and belongs to org
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, org_id')
      .eq('id', conversationId)
      .eq('org_id', orgId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 6. Upload file to storage
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const storagePath = `${orgId}/${conversationId}/${Date.now()}-${uniqueId}-${sanitizedFileName}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
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

    // 7. Create attachment message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        org_id: orgId,
        sender_id: user.id,
        message_type: 'attachment',
        content: captionText,
        metadata: {
          attachment: {
            storage_path: storagePath,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
          },
        },
        status: 'sent',
      })
      .select()
      .single();

    if (msgError || !message) {
      console.error('Error inserting attachment message:', msgError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    // 8. Update conversation metadata
    const preview = `📎 ${file.name}`.substring(0, 100);
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at,
        last_message_preview: preview,
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation metadata:', updateError);
    }

    // 9. Upsert sender's read status
    await supabase
      .from('conversation_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          org_id: orgId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_id' }
      );

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Attachment upload error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
