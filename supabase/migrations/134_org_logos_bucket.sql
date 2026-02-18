-- Migration 134: Create org-logos storage bucket
-- Org logos must be publicly accessible so they can appear in:
--   * PDFs rendered by Edge Functions (signed URLs would expire mid-render)
--   * Transactional emails (embedded image URLs must be stable)
--   * White-label portal headers served to end users
-- Write access is org-scoped so admins can only upload under their own org_id prefix.
-- Platform admins have unrestricted write access (their org_id is NULL in JWT).

-- ---------------------------------------------------------------------------
-- 1. CREATE BUCKET
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,       -- PUBLIC: logos appear in PDFs, emails, and portal header
  2097152,    -- 2 MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. RLS POLICIES
-- Path convention: <org_id>/<filename>  e.g. "abc-123/logo.png"
-- Folder check uses 1-indexed Postgres array: (storage.foldername(name))[1]
-- ---------------------------------------------------------------------------

-- Policy 1: Org admins can upload logos — restricted to their own org_id folder
CREATE POLICY "Org admins can upload org logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND is_org_admin()
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Policy 2: Platform admins can upload logos for any org
-- No folder restriction — platform admin org_id is NULL in the JWT
CREATE POLICY "Platform admins can upload any org logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND is_platform_admin()
  );

-- Policy 3: Anyone (including unauthenticated) can view org logos
-- Required because logos are embedded in publicly served PDFs and emails
CREATE POLICY "Anyone can view org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Policy 4: Org admins can update their own org logos (within their folder)
CREATE POLICY "Org admins can update org logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND is_org_admin()
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Policy 5: Platform admins can update logos for any org
CREATE POLICY "Platform admins can update any org logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND is_platform_admin()
  );

-- Policy 6: Org admins can delete their own org logos (within their folder)
CREATE POLICY "Org admins can delete org logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND is_org_admin()
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Policy 7: Platform admins can delete logos for any org
CREATE POLICY "Platform admins can delete any org logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- SUMMARY
-- Bucket : org-logos (PUBLIC)
-- Limit  : 2 MB per file
-- Types  : image/png, image/jpeg, image/jpg, image/svg+xml, image/webp
-- Policies (7):
--   INSERT × 2 — org admin (folder-scoped) + platform admin (unrestricted)
--   SELECT × 1 — anyone, including unauthenticated
--   UPDATE × 2 — org admin (folder-scoped) + platform admin (unrestricted)
--   DELETE × 2 — org admin (folder-scoped) + platform admin (unrestricted)
-- Referenced by: org_branding.logo_path (Phase 31)
-- ---------------------------------------------------------------------------
