-- Add agent_profiles table for extended profile information
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  bio TEXT,
  company_name VARCHAR(255),
  website VARCHAR(500),
  profile_image VARCHAR(500),
  license_number VARCHAR(100),
  brokerage VARCHAR(255),
  years_experience INT,
  specialties TEXT[],
  languages TEXT[],
  social_links JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(agent_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_profiles_agent_id ON agent_profiles(agent_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agent_profiles_updated_at ON agent_profiles;
CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add columns to agent_integrations table if they don't exist
DO $$
BEGIN
  -- Add FUB API key column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_integrations' AND column_name = 'fub_api_key') THEN
    ALTER TABLE agent_integrations ADD COLUMN fub_api_key TEXT;
  END IF;

  -- Add Twilio Account SID column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_integrations' AND column_name = 'twilio_account_sid') THEN
    ALTER TABLE agent_integrations ADD COLUMN twilio_account_sid TEXT;
  END IF;

  -- Add Twilio Auth Token column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_integrations' AND column_name = 'twilio_auth_token') THEN
    ALTER TABLE agent_integrations ADD COLUMN twilio_auth_token TEXT;
  END IF;
END $$;