# Plan 47-03 Summary: File Attachments in Messages

## Status: Complete

## What Was Built

File attachment support for messages. Users can attach files (PDF, JPEG, PNG, Word docs) to messages via a Paperclip button in the compose area. Files are stored in the message-attachments Supabase Storage bucket. Attachments display inline in conversation threads with thumbnails for images and file icons for documents, plus download links.

## Deliverables

| File | What it does |
|------|-------------|
| `web/app/api/messages/attachments/upload/route.ts` | POST endpoint accepting FormData, stores in message-attachments bucket |
| `web/app/api/messages/attachments/download/route.ts` | GET endpoint generating 1-hour signed URLs with org-scoped access |
| `web/app/(dashboard)/messages/components/AttachmentPicker.tsx` | Paperclip button with hidden file input and validation |
| `web/app/(dashboard)/messages/components/MessageAttachment.tsx` | Inline display with image thumbnails or file icon cards |
| `web/app/(dashboard)/messages/components/MessageInput.tsx` | Extended with attachment picker, pending file preview, dual send mode |
| `web/app/(dashboard)/messages/components/MessageItem.tsx` | Renders attachment messages with MessageAttachment component |
| `web/types/comms.types.ts` | AttachmentMetadata interface |

## Key Decisions

- Storage path: `{orgId}/{conversationId}/{timestamp}-{uuid8}-{sanitizedFileName}` for collision resistance
- File validation: 10MB max, PDF/JPEG/PNG/Word only, validated both client-side (toast errors) and server-side (400 response)
- message_type='attachment' with metadata JSONB containing file info (storage_path, file_name, file_size_bytes, mime_type)
- Conversation preview shows emoji prefix: "📎 filename.pdf"
- Image thumbnails lazy-loaded via signed URL fetch on component mount
- Optional text caption alongside attachment (content field on message)
- Download generates signed URL and opens in new tab (not direct download)
- Cross-org access prevented by validating storage path starts with user's orgId

## Commits

- `09a18d5` feat(47-03): attachment upload/download API routes and types
- `dac7a34` feat(47-03): attachment UI components and MessageInput/MessageItem integration
