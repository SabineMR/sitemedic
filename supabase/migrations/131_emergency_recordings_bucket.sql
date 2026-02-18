-- Migration: Create emergency-recordings storage bucket
-- The EmergencyAlertService uploads voice recordings from SOS alerts
-- to Supabase Storage. This migration creates the bucket and RLS policies
-- so uploads succeed.

-- Create the private bucket for emergency audio recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergency-recordings',
  'emergency-recordings',
  false,           -- private: URLs require a signed URL to access
  52428800,        -- 50 MB max per file (well above any 90s m4a)
  ARRAY['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Medics can upload recordings into their own user-id-prefixed folder
-- e.g. <user_id>/1234567890.m4a
CREATE POLICY "medic_upload_emergency_audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'emergency-recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Any authenticated org member can read/download emergency recordings
-- (needed for the recipient to play back the audio in the alert modal)
CREATE POLICY "authenticated_read_emergency_audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'emergency-recordings'
    AND auth.uid() IS NOT NULL
  );

-- Medics can delete their own recordings (e.g. cleanup after alert resolved)
CREATE POLICY "medic_delete_own_emergency_audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'emergency-recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
