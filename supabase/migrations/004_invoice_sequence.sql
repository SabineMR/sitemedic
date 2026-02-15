-- Migration 004: Invoice Number Auto-Generation
-- Phase 1.5: Sequential invoice numbers with INV-YYYY-NNN format
-- Created: 2026-02-15
-- Depends on: 002_business_operations.sql

-- =============================================================================
-- SEQUENCE: invoice_number_seq
-- Purpose: Auto-increment invoice numbers (resets yearly via function logic)
-- =============================================================================
CREATE SEQUENCE invoice_number_seq START 1;

COMMENT ON SEQUENCE invoice_number_seq IS 'Auto-incrementing invoice numbers for INV-YYYY-NNN format';

-- =============================================================================
-- FUNCTION: generate_invoice_number()
-- Purpose: Generate INV-YYYY-NNN format (e.g., INV-2026-001)
-- Logic: Uses current year + zero-padded sequence number
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
  current_year TEXT;
  formatted_number TEXT;
BEGIN
  -- Get next sequence value
  next_num := nextval('invoice_number_seq');

  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Format: INV-YYYY-NNN (zero-padded to 3 digits)
  formatted_number := 'INV-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');

  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invoice_number IS 'Generates sequential invoice numbers in format INV-YYYY-NNN';

-- =============================================================================
-- TRIGGER: Auto-generate invoice number on insert
-- =============================================================================
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if invoice_number is NULL
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

COMMENT ON TRIGGER trigger_set_invoice_number ON invoices IS 'Auto-generates invoice_number if NULL on insert';
