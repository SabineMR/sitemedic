-- Create storage bucket for treatment photos
-- Used by Phase 3 sync engine for progressive photo uploads
-- Bucket is private (requires auth) with 50MB file size limit

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'treatment-photos',
  'treatment-photos',
  false,
  52428800, -- 50MB limit per file
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can upload to their org's folder
CREATE POLICY "Users can upload treatment photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'treatment-photos');

-- RLS policy: authenticated users can read treatment photos
CREATE POLICY "Users can view treatment photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'treatment-photos');

-- RLS policy: authenticated users can update their uploads
CREATE POLICY "Users can update treatment photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'treatment-photos');
