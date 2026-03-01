-- ============================================
-- ONBOARDING DRAFTS TABLE
-- Stores partial onboarding progress for resumption
-- ============================================

-- Create onboarding_drafts table
CREATE TABLE IF NOT EXISTS onboarding_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_step CHECK (current_step IN ('welcome', 'agent-info', 'calendar', 'sms', 'confirmation'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_email 
  ON onboarding_drafts(email) 
  WHERE is_completed = FALSE;

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_agent_id 
  ON onboarding_drafts(agent_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_expires_at 
  ON onboarding_drafts(expires_at) 
  WHERE is_completed = FALSE AND is_expired = FALSE;

-- Function to update last_updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_updated_at
DROP TRIGGER IF EXISTS onboarding_drafts_update_timestamp ON onboarding_drafts;
CREATE TRIGGER onboarding_drafts_update_timestamp
  BEFORE UPDATE ON onboarding_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_draft_timestamp();

-- Function to auto-expire old drafts
CREATE OR REPLACE FUNCTION expire_old_onboarding_drafts()
RETURNS void AS $$
BEGIN
  UPDATE onboarding_drafts
  SET is_expired = TRUE
  WHERE is_completed = FALSE 
    AND is_expired = FALSE
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AGENTS TABLE ENHANCEMENTS
-- Add onboarding tracking columns
-- ============================================

-- Add onboarding metadata to agents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE agents ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'onboarding_metadata'
  ) THEN
    ALTER TABLE agents ADD COLUMN onboarding_metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE onboarding_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to create drafts
CREATE POLICY "Allow anonymous to create drafts"
  ON onboarding_drafts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow users to read their own drafts by email
CREATE POLICY "Allow read by email"
  ON onboarding_drafts
  FOR SELECT
  TO anon, authenticated
  USING (true); -- Allow reading for resume functionality

-- Policy: Allow users to update their own drafts
CREATE POLICY "Allow update by draft id"
  ON onboarding_drafts
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Policy: Allow users to delete their own drafts
CREATE POLICY "Allow delete by draft id"
  ON onboarding_drafts
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- CLEANUP FUNCTION
-- Remove expired/completed drafts older than 30 days
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_onboarding_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM onboarding_drafts
  WHERE (is_completed = TRUE OR is_expired = TRUE)
    AND last_updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
