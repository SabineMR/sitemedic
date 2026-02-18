-- Migration 128: Motorsport Incident Reports storage bucket
-- Phase 19: Motorsport Vertical — Plan 03
-- Creates the motorsport-reports bucket for Motorsport UK Accident Form PDF storage.
-- Note: Migration 125 = event-incident-reports (Phase 20);
--       Migration 126 = motorsport concussion alert type (Phase 19-01);
--       Migration 127 = fa-incident-reports (Phase 22).

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('motorsport-reports', 'motorsport-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated org members can read their own org's motorsport reports
CREATE POLICY "Org members can read motorsport reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'motorsport-reports'
  AND EXISTS (
    SELECT 1
    FROM treatments t
    JOIN profiles p ON p.org_id = t.org_id
    WHERE t.id::text = (storage.foldername(name))[1]
    AND p.id = auth.uid()
  )
);

-- RLS: service role can insert (Edge Function uses service role key)
CREATE POLICY "Service role can insert motorsport reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'motorsport-reports'
);

-- RLS: service role can update (PDF regeneration)
CREATE POLICY "Service role can update motorsport reports"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'motorsport-reports');
