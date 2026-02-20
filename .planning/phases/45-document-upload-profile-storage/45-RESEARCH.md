# Phase 45: Document Upload & Profile Storage — Research

**Researched:** 2026-02-20
**Phase:** 45 — Document Upload & Profile Storage

## 1. Existing Schema (Phase 40 Foundation)

### Tables (migration 143_comms_docs_schema.sql)

**document_categories** — lookup table per org
- `id`, `org_id`, `name`, `slug`, `is_required`, `is_active`, `sort_order`
- UNIQUE(org_id, slug)
- Seeded with 5 defaults: Insurance, DBS, Qualification, ID, Other
- Auto-seed trigger on new org creation

**documents** — one record per document per medic
- `id`, `org_id`, `medic_id`, `category_id`, `current_version_id` (circular FK)
- `status`: pending | approved | rejected | expired | archived
- `reviewed_by`, `reviewed_at`, `review_notes`
- Indexes: org_id, medic_id, category_id, status

**document_versions** — immutable version records
- `id`, `document_id`, `org_id`, `storage_path`, `file_name`, `file_size_bytes`, `mime_type`
- `issue_date`, `expiry_date`, `certificate_number`, `notes`
- `version_number`, `uploaded_by`
- Indexes: document_id, expiry_date (WHERE NOT NULL)

### Storage (migration 144_comms_docs_storage.sql)

**Bucket: `medic-documents`** (PRIVATE)
- Path convention: `{org_id}/{medic_id}/{category_slug}/{filename}`
- 10 MB file size limit
- Allowed MIME types: PDF, JPEG, JPG, PNG, DOC, DOCX
- RLS: org-scoped via `(storage.foldername(name))[1] = (SELECT get_user_org_id())::text`

### TypeScript Types (web/types/comms.types.ts)
- `DocumentCategory`, `Document`, `DocumentVersion`, `DocumentStatus`, `DocumentWithVersion`
- All already defined — no new type creation needed

### RLS Policies
- All 3 tables: org_id-scoped SELECT/INSERT/UPDATE/DELETE + platform admin ALL
- Storage: org-folder-scoped via foldername pattern

## 2. Existing Upload Patterns

### Pattern 1: IR35 CEST PDF Upload (web/components/medics/ir35-form.tsx)
```typescript
const { data, error } = await supabase.storage
  .from('ir35-assessments')
  .upload(fileName, file, { contentType: 'application/pdf', upsert: false });
```
- Client-side upload using Supabase client
- Flat file path: `{medicId}-{timestamp}.pdf`
- getPublicUrl for download

### Pattern 2: Branding Logo Upload (web/app/(dashboard)/admin/settings/branding/)
- Client-side upload OR server-side via `logoUploadEndpoint` (for platform admin whose org_id=NULL)
- Uses `createClient()` from `@/lib/supabase/client`

### Pattern 3: Contract Signed URL (web/lib/queries/reports.ts)
- `createSignedUrl(storagePath, 604800)` — 7-day signed URLs for private files

### Key Pattern: For PRIVATE buckets → use `createSignedUrl()` for downloads
- medic-documents is PRIVATE, so `getPublicUrl()` won't work
- Must use `createSignedUrl()` (server-side API route) or `download()` (client-side)

## 3. Web Dashboard Patterns

### Dashboard Layout
- Server component at `web/app/(dashboard)/layout.tsx`
- Uses shadcn/ui Sidebar, SidebarProvider, etc.
- `DashboardNav` component for navigation items
- Messages page at `web/app/(dashboard)/messages/page.tsx`

### Page Structure (workers/[id] as reference)
- Server component with `createClient` from server
- Promise-based params: `params: Promise<{ id: string }>`
- Uses Card, CardContent, CardHeader, CardTitle from shadcn/ui
- Badge component for status indicators
- date-fns `format()` for dates
- `suppressHydrationWarning` on date displays
- Back button with ArrowLeft icon

### Styling Patterns (dashboard = light theme)
- shadcn/ui components (Card, Badge, Button, Table)
- Lucide icons throughout
- Tailwind CSS utility classes
- `text-muted-foreground` for secondary text

## 4. Medic Portal (iOS-accessible Web)

### Profile Page (web/app/medic/profile/page.tsx)
- Client component ('use client')
- Dark theme: `bg-gray-800/50 border border-gray-700/50 rounded-2xl`
- Fetches medic data via `supabase.from('medics').select('*')`
- Shows: personal info, qualifications, certifications, IR35 status, Stripe, Google Calendar
- **Documents section needs to be added here**

### Medic Layout (web/app/medic/layout.tsx)
- Sidebar with green accent (vs blue admin, purple platform)
- Nav items: Dashboard, My Shifts, Timesheets, Payslips, My Profile
- **Documents nav item needs to be added** (or tab on profile)

## 5. iOS App (Expo Router)

### Tab Layout (app/(tabs)/_layout.tsx)
- Expo Router Tabs component
- Phone: 5-tab bottom bar (80px height)
- iPad: Left sidebar rail via TabletSidebar
- Messages tab already exists with unread badge from WatermelonDB
- **Documents tab or screen needs to be added**

### Existing Screens
- Tabs: Home, Treatments, Workers, Safety, Messages, Events, Team, Settings
- Messages thread: `app/messages/[conversationId].tsx`
- No existing document screens

### Upload from iOS
- Camera capture needed (react-native-image-picker or expo-image-picker)
- Document picker needed (expo-document-picker)
- Supabase storage upload from React Native works same as web client

## 6. Versioning Logic

### Archiving Previous Version
When uploading a new document in the same category for the same medic:
1. Look up existing `documents` record for (medic_id, category_id) — CONTEXT says multiple per category allowed
2. Create new `document_versions` record with incremented version_number
3. Update `documents.current_version_id` to point to new version
4. Previous versions remain in `document_versions` table (not deleted)
5. If no existing document record, create new `documents` + `document_versions`

### "Does not expire" Toggle
- `expiry_date` is nullable in schema — NULL means no expiry
- UI: checkbox/toggle that hides date picker when checked

## 7. Custom Categories

### Adding Custom Categories
- `document_categories` table allows INSERT per org
- Need admin-only UI for managing custom categories
- Default 5 are seeded automatically
- `is_active` flag for soft-disable, `sort_order` for display ordering

## 8. API Route Patterns

### Existing API Pattern (messages as reference)
- `web/app/api/messages/conversations/route.ts` — GET conversations
- `web/app/api/messages/send/route.ts` — POST send message
- Uses `createClient()` from `@/lib/supabase/server`
- Returns `NextResponse.json()`

### Recommended API Routes for Documents
- `GET /api/documents` — list documents for current medic or specified medic (admin)
- `POST /api/documents/upload` — handle upload + versioning logic
- `GET /api/documents/[id]/download` — generate signed URL for file download
- `GET /api/documents/categories` — list categories for org
- `POST /api/documents/categories` — create custom category (admin only)

## 9. Batch Upload Considerations

- CONTEXT requests batch upload support
- Web: multiple file input or dropzone with multi-file
- Each file needs: category selection + expiry date
- UI: staged upload — select files, assign metadata to each, then confirm all
- Server: sequential Supabase Storage uploads per file

## 10. Key Decisions Needed by Planner

1. **Profile placement (web dashboard)**: New "Documents" tab in medic profile, or separate /documents page in sidebar nav?
2. **Admin view**: Same page as medic view (read-only) or separate admin documents page?
3. **iOS placement**: New Documents tab in bottom bar, or section within existing Profile/Settings?
4. **Archive access**: Expandable version history inline, or separate view?
5. **Deletion policy**: Compliance platform suggests archive-only (no hard delete for medics)
6. **Download method**: Server-side signed URL endpoint (more secure, works with private bucket)

---

## RESEARCH COMPLETE

*Phase: 45-document-upload-profile-storage*
*Researched: 2026-02-20*
