-- DNC (Do Not Call) List Migration
-- Tracks phone numbers that have opted out of SMS communications
-- Required for TCPA compliance

-- ==================== DNC LIST TABLE ====================
CREATE TABLE IF NOT EXISTS dnc_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phone number (unique)
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  
  -- Opt-out details
  source VARCHAR(50) NOT NULL, -- lead_opt_out, admin_added, api_import, etc.
  reason TEXT, -- Optional reason for opt-out
  
  -- Lead reference (if applicable)
  lead_id VARCHAR(100),
  
  -- Timestamps
  opted_out_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_dnc_list_phone_number ON dnc_list(phone_number);
CREATE INDEX IF NOT EXISTS idx_dnc_list_opted_out_at ON dnc_list(opted_out_at);

-- ==================== FUNCTION: Check DNC Status ====================
CREATE OR REPLACE FUNCTION is_dnc(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dnc_list WHERE dnc_list.phone_number = is_dnc.phone_number
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== COMMENTS ====================
COMMENT ON TABLE dnc_list IS 'Do Not Call list for TCPA compliance - numbers that have opted out of SMS';
COMMENT ON FUNCTION is_dnc IS 'Check if a phone number is on the DNC list';
