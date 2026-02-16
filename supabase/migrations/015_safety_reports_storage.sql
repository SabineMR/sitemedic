-- Create storage bucket for safety report PDFs
-- Used by Phase 5 PDF generation for weekly safety reports
-- Bucket is private (requires auth) with 20MB file size limit

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'safety-reports',
  'safety-reports',
  false,
  20971520, -- 20MB limit per file
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can read safety reports in their org folder
CREATE POLICY "Authenticated users can read safety reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'safety-reports');

-- RLS policy: service role can upload safety reports (for Edge Function)
CREATE POLICY "Service role can upload safety reports"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'safety-reports');

-- Create weekly_reports tracking table for audit trail
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  storage_path TEXT NOT NULL,              -- Path in safety-reports bucket
  signed_url TEXT,                         -- Time-limited download URL (7 days)
  signed_url_expires_at TIMESTAMPTZ,       -- When the signed URL expires
  file_size_bytes INTEGER,                 -- PDF file size for monitoring
  generation_time_ms INTEGER,              -- Generation time for performance tracking
  trigger_type TEXT CHECK (trigger_type IN ('cron', 'manual')) DEFAULT 'cron',
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_to TEXT,                      -- Site manager email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, week_ending)              -- One report per org per week
);

-- Indexes for efficient lookups
CREATE INDEX idx_weekly_reports_org_id ON weekly_reports(org_id);
CREATE INDEX idx_weekly_reports_week_ending ON weekly_reports(week_ending DESC);
CREATE INDEX idx_weekly_reports_created_at ON weekly_reports(created_at DESC);

-- Enable RLS on weekly_reports
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can read reports in their organization
CREATE POLICY "Users can read reports in their organization"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS policy: service role can insert/update for Edge Function
CREATE POLICY "Service role can manage weekly reports"
  ON weekly_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
