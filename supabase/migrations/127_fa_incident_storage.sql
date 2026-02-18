-- Migration 127: FA Incident Reports storage bucket
-- Phase 22: Football / Sports Vertical — FOOT-07
-- Creates the fa-incident-reports bucket for FA Match Day and SGSA PDF storage.
-- Note: Migration 125 was used by event-incident-reports (Phase 20);
--       Migration 126 was used by motorsport concussion alert type (Phase 19).

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fa-incident-reports', 'fa-incident-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated org members can read their own org's reports
CREATE POLICY "Org members can read fa incident reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fa-incident-reports'
  AND EXISTS (
    SELECT 1
    FROM treatments t
    JOIN profiles p ON p.org_id = t.org_id
    WHERE t.id::text = (storage.foldername(name))[1]
    AND p.id = auth.uid()
  )
);

-- RLS: service role can insert (Edge Function uses service role key)
CREATE POLICY "Service role can insert fa incident reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'fa-incident-reports'
);

-- RLS: service role can update (PDF regeneration)
CREATE POLICY "Service role can update fa incident reports"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'fa-incident-reports');
