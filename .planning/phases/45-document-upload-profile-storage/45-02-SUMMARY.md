---
phase: 45-document-upload-profile-storage
plan: 02
status: complete
commits:
  - hash: ff5dc8c
    message: "feat(45-02): create iOS document upload and list screens"
---

# 45-02 Summary: iOS Document Upload & List

## What Was Built

### Task 1: iOS Upload Screen (`app/documents/upload.tsx`)
- Document picker (PDF, JPEG, PNG) via expo-document-picker (newly installed)
- Camera capture via expo-image-picker with 0.8 quality compression
- File preview (image thumbnail or PDF icon) with size display and change button
- Category chip picker from Supabase document_categories table
- Expiry date input with "Does not expire" toggle
- Certificate number and notes optional fields
- Direct Supabase Storage upload at `{orgId}/{medicId}/{categorySlug}/{timestamp}-{filename}`
- Versioning: supports replaceDocumentId route param for new version uploads

### Task 2: Documents Tab (`app/(tabs)/documents.tsx`)
- Documents list grouped by category with download and "New Version" actions
- Expiry badges: Current (green), Expiring Soon (amber), Expired (red), No Expiry (gray)
- Download via Supabase createSignedUrl + Linking.openURL
- Pull-to-refresh and auto-refresh on tab focus
- Empty state with upload prompt
- "New Version" navigates to upload screen with replaceDocumentId param

### Tab Layout (`app/(tabs)/_layout.tsx`)
- Added Documents tab between Messages and Events in bottom nav
- Visible to all roles (both medic and admin)

## Dependencies Added
- expo-document-picker@14.0.8

## Deviations
None.

## Issues
None.
