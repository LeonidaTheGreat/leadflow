-- Migration: Add onboarding_simulations table for Aha Moment feature
-- This table tracks the lead simulator experience during onboarding

-- Create onboarding_simulations table
CREATE TABLE IF NOT EXISTS onboarding_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  
  -- Timing tracking
  simulation_started_at TIMESTAMP WITH TIME ZONE,
  inbound_received_at TIMESTAMP WITH TIME ZONE,
  ai_response_received_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'inbound_received', 'ai_responded', 'success', 'skipped', 'timeout', 'failed')),
  error_code VARCHAR(100),
  error_message TEXT,
  
  -- Simulation data
  session_id VARCHAR(255) NOT NULL,
  lead_name VARCHAR(255),
  property_interest TEXT,
  conversation JSONB DEFAULT '[]'::jsonb,
  
  -- Analytics
  was_skipped BOOLEAN DEFAULT FALSE,
  skip_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_session_per_agent UNIQUE (agent_id, session_id)
);

-- Create indexes for performance
CREATE INDEX idx_onboarding_simulations_agent_id ON onboarding_simulations(agent_id);
CREATE INDEX idx_onboarding_simulations_status ON onboarding_simulations(status);
CREATE INDEX idx_onboarding_simulations_session ON onboarding_simulations(session_id);
CREATE INDEX idx_onboarding_simulations_created_at ON onboarding_simulations(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_onboarding_simulations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_simulations_updated_at ON onboarding_simulations;
CREATE TRIGGER trigger_onboarding_simulations_updated_at
  BEFORE UPDATE ON onboarding_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_simulations_updated_at();

-- Add column to real_estate_agents for aha_pending flag
ALTER TABLE real_estate_agents 
ADD COLUMN IF NOT EXISTS aha_pending BOOLEAN DEFAULT FALSE;

-- Add column to track onboarding completion with simulator
ALTER TABLE real_estate_agents 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create view for active simulations (for monitoring)
CREATE OR REPLACE VIEW active_onboarding_simulations AS
SELECT 
  s.*,
  a.email as agent_email,
  a.name as agent_name,
  EXTRACT(EPOCH FROM (NOW() - s.simulation_started_at))::INTEGER as elapsed_seconds
FROM onboarding_simulations s
JOIN real_estate_agents a ON s.agent_id = a.id
WHERE s.status IN ('running', 'inbound_received')
  AND s.simulation_started_at > NOW() - INTERVAL '5 minutes';

-- Create analytics view
CREATE OR REPLACE VIEW onboarding_simulation_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_simulations,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
  COUNT(*) FILTER (WHERE status = 'timeout') as timed_out,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(response_time_ms) FILTER (WHERE status = 'success') as avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) 
    FILTER (WHERE status = 'success') as median_response_time_ms,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time_ms) 
    FILTER (WHERE status = 'success') as p90_response_time_ms
FROM onboarding_simulations
GROUP BY DATE(created_at)
ORDER BY date DESC;
