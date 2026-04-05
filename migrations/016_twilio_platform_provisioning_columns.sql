-- Migration 016: Add Twilio phone columns for platform provisioning
-- Adds columns needed for platform-owned Twilio number management
-- Date: 2026-04-05

-- Add columns to agent_integrations for platform-provisioned numbers
ALTER TABLE agent_integrations
  ADD COLUMN IF NOT EXISTS twilio_phone_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_phone_e164 TEXT;

-- Add comment for documentation
COMMENT ON COLUMN agent_integrations.twilio_phone_sid IS 'Twilio SID for the provisioned phone number (platform-owned model)';
COMMENT ON COLUMN agent_integrations.twilio_phone_e164 IS 'Phone number in E.164 format (+1XXXXXXXXXX) for platform-owned numbers';

-- Create index for phone number lookups (useful for webhook routing)
CREATE INDEX IF NOT EXISTS idx_agent_integrations_phone_e164 
  ON agent_integrations (twilio_phone_e164);

-- DOWN
-- ALTER TABLE agent_integrations DROP COLUMN IF EXISTS twilio_phone_sid;
-- ALTER TABLE agent_integrations DROP COLUMN IF EXISTS twilio_phone_e164;
