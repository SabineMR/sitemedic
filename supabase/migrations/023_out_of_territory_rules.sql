-- Migration 022: Out-of-Territory Cost Rules
-- Business rules and thresholds for out-of-territory bookings

-- Out-of-territory cost settings table
CREATE TABLE IF NOT EXISTS out_of_territory_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_value DECIMAL(10,2) NOT NULL,
  rule_description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rules
INSERT INTO out_of_territory_rules (rule_name, rule_value, rule_description) VALUES
  ('travel_bonus_rate', 2.00, 'Travel bonus rate per mile beyond free zone (GBP)'),
  ('free_travel_miles', 30.00, 'First N miles are included in base rate'),
  ('room_board_flat_rate', 150.00, 'Flat rate for overnight accommodation (GBP)'),
  ('travel_time_threshold_minutes', 120.00, 'Travel time threshold for room/board option (minutes)'),
  ('denial_threshold_percent', 50.00, 'Auto-deny if cost exceeds this % of shift value'),
  ('admin_override_limit_percent', 75.00, 'Maximum % admin can override (hard limit)');

CREATE INDEX idx_out_of_territory_rules_name ON out_of_territory_rules(rule_name);

-- Function to get rule value
CREATE OR REPLACE FUNCTION get_out_of_territory_rule(p_rule_name TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_value DECIMAL(10,2);
BEGIN
  SELECT rule_value INTO v_value
  FROM out_of_territory_rules
  WHERE rule_name = p_rule_name;

  RETURN COALESCE(v_value, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE out_of_territory_rules IS 'Configurable business rules for out-of-territory cost calculations';
COMMENT ON FUNCTION get_out_of_territory_rule IS 'Retrieve rule value by name (returns 0 if not found)';
