-- Migration: Emergency SOS Alert System
-- Adds emergency_contacts and emergency_alerts tables for the one-tap SOS feature.
-- Medics can send push notifications and voice/text alerts to pre-registered contacts.
-- SMS fallback fires automatically after 60 seconds if alert is unacknowledged.

-- Reusable emergency contacts (seeded from booking data, reused across orgs/bookings)
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  push_token TEXT,           -- Expo push token for in-app alerts
  role TEXT,                 -- e.g. 'site_manager', 'owner'
  source TEXT DEFAULT 'booking', -- how they were added: 'booking' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency alerts log (one row per SOS trigger)
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  sent_by UUID REFERENCES profiles(id),        -- medic who triggered SOS
  booking_id UUID REFERENCES bookings(id),     -- active booking at time of SOS
  contact_id UUID REFERENCES emergency_contacts(id),
  message_type TEXT CHECK (message_type IN ('voice', 'text')),
  text_message TEXT,                           -- typed or AI-transcribed text
  audio_url TEXT,                              -- Supabase Storage URL for .m4a recording
  push_sent_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,                     -- populated when SMS fallback fires
  acknowledged_at TIMESTAMPTZ,                 -- when recipient taps "Acknowledged"
  acknowledged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add push_token to profiles so recipients can receive push alerts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_org_id ON emergency_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_org_id ON emergency_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_sent_by ON emergency_alerts(sent_by);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_unack ON emergency_alerts(push_sent_at)
  WHERE acknowledged_at IS NULL AND sms_sent_at IS NULL;

-- RLS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Emergency contacts: org members can read and write their own org's contacts
CREATE POLICY "org_read_contacts" ON emergency_contacts
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_write_contacts" ON emergency_contacts
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Emergency alerts: org members can read alerts, medics can insert, anyone authenticated can acknowledge
CREATE POLICY "org_read_alerts" ON emergency_alerts
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "medic_insert_alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (sent_by = auth.uid());

CREATE POLICY "contact_ack_alerts" ON emergency_alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL);
