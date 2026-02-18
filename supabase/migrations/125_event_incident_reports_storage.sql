-- 125_event_incident_reports_storage.sql
-- Create Supabase Storage bucket for event incident report PDFs
-- Phase 20: Festivals & Events Vertical - Plan 03

-- Create event-incident-reports storage bucket (private — contains patient data)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-incident-reports', 'event-incident-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-incident-reports bucket

-- Allow authenticated users to view event incident reports for their organization
CREATE POLICY "Medics and managers can view event incident reports for their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-incident-reports' AND
  EXISTS (
    SELECT 1
    FROM treatments t
    JOIN profiles p ON p.org_id = t.org_id
    WHERE t.id::text = (storage.foldername(name))[1]
    AND p.id = auth.uid()
  )
);

-- Allow service role to insert event incident reports (Edge Function generation)
CREATE POLICY "Service role can insert event incident reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'event-incident-reports');

-- Allow service role to update event incident reports (regeneration)
CREATE POLICY "Service role can update event incident reports"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'event-incident-reports');
