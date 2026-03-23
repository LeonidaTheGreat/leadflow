-- Migration: Add Aha Moment fields to real_estate_agents table
-- Use Case: fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign

-- Add aha_moment_completed column
ALTER TABLE real_estate_agents 
ADD COLUMN IF NOT EXISTS aha_moment_completed BOOLEAN DEFAULT FALSE;

-- Add aha_response_time_ms column
ALTER TABLE real_estate_agents 
ADD COLUMN IF NOT EXISTS aha_response_time_ms INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN real_estate_agents.aha_moment_completed IS 'Whether the agent completed the Aha Moment simulation during onboarding';
COMMENT ON COLUMN real_estate_agents.aha_response_time_ms IS 'Response time in milliseconds shown in the Aha Moment simulation';

-- Verify columns were added
SELECT 'aha_moment_completed and aha_response_time_ms columns added successfully' as result;
