-- Migration: Onboarding Simulator (Aha Moment)
-- Creates table to track lead simulations during onboarding
-- Use Case: feat-aha-moment-lead-simulator

-- Table for tracking onboarding simulations
CREATE TABLE IF NOT EXISTS onboarding_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'inbound_received', 'ai_responded', 'success', 'skipped', 'timeout', 'failed')),
  simulation_started_at TIMESTAMPTZ,
  inbound_received_at TIMESTAMPTZ,
  ai_response_received_at TIMESTAMPTZ,
  response_time_ms INTEGER,
  lead_name TEXT NOT NULL DEFAULT 'Unknown Lead',
  property_interest TEXT,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome TEXT CHECK (outcome IN ('completed', 'error', null)),
  skip_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_simulations_session_id ON onboarding_simulations(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_simulations_agent_id ON onboarding_simulations(agent_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_simulations_status ON onboarding_simulations(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_simulations_created_at ON onboarding_simulations(created_at DESC);

-- Comment for documentation
COMMENT ON TABLE onboarding_simulations IS 'Tracks lead simulator sessions during onboarding (Aha Moment feature). Stores conversation history, timing metrics, and completion status.';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_onboarding_simulations_updated_at ON onboarding_simulations;
CREATE TRIGGER update_onboarding_simulations_updated_at
  BEFORE UPDATE ON onboarding_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table was created
SELECT 'onboarding_simulations table created successfully' as result;
