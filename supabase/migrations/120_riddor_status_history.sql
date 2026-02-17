-- Phase 13: RIDDOR status change audit trail
-- Tracks every status transition on riddor_incidents for compliance

CREATE TABLE riddor_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES riddor_incidents(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by   UUID REFERENCES auth.users(id),
  actor_name   TEXT
);

CREATE INDEX idx_riddor_status_history_incident
  ON riddor_status_history(incident_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_riddor_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO v_actor_name
    FROM profiles WHERE id = auth.uid();

    INSERT INTO riddor_status_history (incident_id, from_status, to_status, changed_by, actor_name)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_actor_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_riddor_status_history
  AFTER UPDATE ON riddor_incidents
  FOR EACH ROW EXECUTE FUNCTION log_riddor_status_change();

ALTER TABLE riddor_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view their incidents status history"
  ON riddor_status_history FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM riddor_incidents WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
