---
phase: 45-document-upload-profile-storage
plan: 01
status: complete
commits:
  - hash: 9eb75e6
    message: "feat(45-01): create document API routes"
  - hash: 96933a0
    message: "feat(45-01): create medic documents page and upload dialog"
---

# 45-01 Summary: Web Document Upload System & API Foundation

## What Was Built

### Task 1: Document API Routes (4 endpoints)
- **GET /api/documents** — List documents for a medic (own docs or admin viewing medic's docs via `medicId` query param). Returns documents with current version and category info.
- **POST /api/documents/upload** — Upload with FormData (file, categoryId, expiryDate, certificateNumber, notes, replaceDocumentId). Versioning logic: if replaceDocumentId provided, creates new version and updates current_version_id; otherwise creates new document + first version. Files stored at `{orgId}/{medicId}/{categorySlug}/{timestamp}-{filename}`.
- **GET /api/documents/[id]/download** — Generates 1-hour signed URL for private bucket. Supports optional `versionId` query param for archived versions.
- **GET+POST /api/documents/categories** — GET returns active categories for org. POST creates custom category (admin only) with auto-generated slug and duplicate detection.

### Task 2: Medic Documents Page & Components
- **DocumentUploadDialog** (`web/components/documents/document-upload-dialog.tsx`) — Modal with drag-and-drop dropzone, file preview (image thumbnail or PDF icon), category picker, expiry date with "does not expire" toggle, certificate number, notes. Supports replacement uploads via `replaceDocumentId` prop.
- **DocumentList** (`web/components/documents/document-list.tsx`) — Documents grouped by category with expiry badges (Current/Expiring Soon/Expired/No Expiry), file type icons, version badges, download buttons, and version history toggle.
- **Medic Documents Page** (`web/app/medic/documents/page.tsx`) — Client component at /medic/documents with parallel data fetching, upload dialog, and version replacement flow.
- **Medic Layout** — Added "Documents" nav item to medic sidebar after Payslips.

## Deviations
None. All features implemented as planned.

## Issues
None.
