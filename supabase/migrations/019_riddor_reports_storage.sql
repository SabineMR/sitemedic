-- 019_riddor_reports_storage.sql
-- Create Supabase Storage bucket for RIDDOR F2508 PDF reports
-- Phase 6: RIDDOR Auto-Flagging - Plan 03

-- Create riddor-reports storage bucket (private for compliance data)
INSERT INTO storage.buckets (id, name, public)
VALUES ('riddor-reports', 'riddor-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for riddor-reports bucket

-- Allow authenticated users to view RIDDOR reports for their organization
CREATE POLICY "Medics and managers can view RIDDOR reports for their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'riddor-reports' AND
  EXISTS (
    SELECT 1
    FROM riddor_incidents ri
    JOIN profiles p ON p.org_id = ri.org_id
    WHERE ri.id::text = (storage.foldername(name))[1]
    AND p.id = auth.uid()
  )
);

-- Allow service role to insert RIDDOR reports (Edge Function generation)
CREATE POLICY "Service role can insert RIDDOR reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'riddor-reports');

-- Allow service role to update RIDDOR reports (regeneration)
CREATE POLICY "Service role can update RIDDOR reports"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'riddor-reports');
