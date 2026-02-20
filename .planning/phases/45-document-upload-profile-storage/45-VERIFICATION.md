---
phase: 45-document-upload-profile-storage
status: passed
verified: 2026-02-20
---

# Phase 45 Verification: Document Upload & Profile Storage

## Goal Check
**Goal**: Medics can upload categorised compliance documents (PDF, image) with expiry dates from either the iOS app or web dashboard, documents are stored on the medic's profile visible to their org admin, and uploading a new version of a document type archives the previous version

**Status**: PASSED

## Must-Have Verification

### 1. Web upload with category and expiry date
- [x] POST /api/documents/upload accepts FormData with file, categoryId, expiryDate
- [x] Validates file type (PDF, JPEG, PNG) and size (10MB max)
- [x] "Does not expire" toggle stores null expiryDate
- [x] DocumentUploadDialog has drag-and-drop, category picker, expiry date toggle
- **Evidence**: `web/app/api/documents/upload/route.ts`, `web/components/documents/document-upload-dialog.tsx`

### 2. iOS upload with category and expiry date
- [x] expo-document-picker for PDF/JPEG/PNG file selection
- [x] expo-image-picker for camera capture
- [x] Category chip picker, expiry date with toggle, certificate number
- [x] Direct Supabase Storage upload (not through API routes)
- **Evidence**: `app/documents/upload.tsx`

### 3. Documents visible on medic profile to org admin
- [x] Admin document view at /admin/medics/[id]/documents
- [x] AdminDocumentView component fetches via GET /api/documents?medicId=X
- [x] Documents grouped by category with count badges
- **Evidence**: `web/components/documents/admin-document-view.tsx`, `web/app/(dashboard)/admin/medics/[id]/documents/page.tsx`

### 4. Download original file
- [x] GET /api/documents/[id]/download generates 1-hour signed URL
- [x] Supports optional versionId for archived versions
- [x] Web: window.open(signedUrl), iOS: Linking.openURL(signedUrl)
- **Evidence**: `web/app/api/documents/[id]/download/route.ts`

### 5. Version archiving
- [x] replaceDocumentId triggers versioning: increments version_number, updates current_version_id
- [x] Old versions stay in document_versions table (not deleted)
- [x] Same versioning logic on both web API and iOS direct Supabase
- **Evidence**: `web/app/api/documents/upload/route.ts` (lines with version_number), `app/documents/upload.tsx`

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DOC-01 | Complete | Web upload dialog + iOS upload screen |
| DOC-02 | Complete | Category picker on both platforms (5 defaults + custom) |
| DOC-03 | Complete | Expiry date input with "does not expire" toggle |
| DOC-04 | Complete | Documents stored on medic profile, visible at /medic/documents |
| DOC-05 | Complete | Admin can view at /admin/medics/[id]/documents |
| DOC-08 | Complete | Download via signed URL on web and iOS |
| DOC-09 | Complete | Version archiving with replaceDocumentId |
| PLAT-02 | Complete | Documents tab added to iOS bottom bar |

## Artifacts

| File | Lines | Purpose |
|------|-------|---------|
| web/app/api/documents/categories/route.ts | 118 | GET+POST categories |
| web/app/api/documents/route.ts | 116 | GET documents list |
| web/app/api/documents/upload/route.ts | 228 | POST upload with versioning |
| web/app/api/documents/[id]/download/route.ts | 89 | GET signed URL |
| web/components/documents/document-upload-dialog.tsx | 264 | Upload dialog (dark theme) |
| web/components/documents/document-list.tsx | 236 | Document list (dark theme) |
| web/app/medic/documents/page.tsx | 82 | Medic documents page |
| app/documents/upload.tsx | 463 | iOS upload screen |
| app/(tabs)/documents.tsx | 363 | iOS documents tab |
| web/components/documents/admin-document-view.tsx | 211 | Admin document view |
| web/app/(dashboard)/admin/medics/[id]/documents/page.tsx | 55 | Admin medic docs page |
| web/app/(dashboard)/admin/document-categories/page.tsx | 204 | Category management |

## Result: PASSED
All 5 success criteria met. All 8 phase requirements (DOC-01 through DOC-09, PLAT-02) verified in codebase.
