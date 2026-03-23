-- Migration: Add Aha Moment columns to real_estate_agents table
-- Use Case: fix-ahacompleted-not-included-in-onboarding-submit-pay
-- FR-8: Store aha moment completion status and response time

-- Add aha_moment_completed column
ALTER TABLE real_estate_agents
ADD COLUMN IF NOT EXISTS aha_moment_completed BOOLEAN DEFAULT false;

-- Add aha_response_time_ms column  
ALTER TABLE real_estate_agents
ADD COLUMN IF NOT EXISTS aha_response_time_ms INTEGER;

-- Create index for querying agents who completed the aha moment
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_aha_completed
  ON real_estate_agents(aha_moment_completed)
  WHERE aha_moment_completed = true;

-- Comments for documentation
COMMENT ON COLUMN real_estate_agents.aha_moment_completed IS 'Whether the agent completed the Aha Moment simulator during onboarding (FR-8)';
COMMENT ON COLUMN real_estate_agents.aha_response_time_ms IS 'Response time in milliseconds shown in the Aha Moment simulator (if completed)';

-- Verify columns were added
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'real_estate_agents'
  AND column_name IN ('aha_moment_completed', 'aha_response_time_ms')
ORDER BY column_name;
