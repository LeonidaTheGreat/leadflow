-- Fix NPS tables foreign key references
-- Update all NPS-related tables to reference real_estate_agents instead of agents
-- fix-no-cron-job-or-api-endpoint-to-trigger-automated-n

-- ============================================
-- Fix agent_nps_responses table
-- ============================================

-- Drop existing foreign key constraint if exists
ALTER TABLE agent_nps_responses 
  DROP CONSTRAINT IF EXISTS agent_nps_responses_agent_id_fkey;

-- Add new foreign key constraint referencing real_estate_agents
ALTER TABLE agent_nps_responses
  ADD CONSTRAINT agent_nps_responses_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE CASCADE;

-- ============================================
-- Fix agent_survey_schedule table
-- ============================================

-- Drop existing foreign key constraint if exists
ALTER TABLE agent_survey_schedule 
  DROP CONSTRAINT IF EXISTS agent_survey_schedule_agent_id_fkey;

-- Add new foreign key constraint referencing real_estate_agents
ALTER TABLE agent_survey_schedule
  ADD CONSTRAINT agent_survey_schedule_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE CASCADE;

-- ============================================
-- Fix product_feedback table
-- ============================================

-- Drop existing foreign key constraint if exists
ALTER TABLE product_feedback 
  DROP CONSTRAINT IF EXISTS product_feedback_agent_id_fkey;

-- Add new foreign key constraint referencing real_estate_agents
ALTER TABLE product_feedback
  ADD CONSTRAINT product_feedback_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE SET NULL;

-- ============================================
-- Fix nps_survey_tokens table
-- ============================================

-- Drop existing foreign key constraint if exists
ALTER TABLE nps_survey_tokens 
  DROP CONSTRAINT IF EXISTS nps_survey_tokens_agent_id_fkey;

-- Add new foreign key constraint referencing real_estate_agents
ALTER TABLE nps_survey_tokens
  ADD CONSTRAINT nps_survey_tokens_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE CASCADE;

-- ============================================
-- Fix nps_prompt_dismissals table
-- ============================================

-- Drop existing foreign key constraint if exists
ALTER TABLE nps_prompt_dismissals 
  DROP CONSTRAINT IF EXISTS nps_prompt_dismissals_agent_id_fkey;

-- Add new foreign key constraint referencing real_estate_agents
ALTER TABLE nps_prompt_dismissals
  ADD CONSTRAINT nps_prompt_dismissals_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE CASCADE;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE agent_nps_responses IS 'Stores NPS survey responses from real estate agents (FK updated to real_estate_agents)';
COMMENT ON TABLE agent_survey_schedule IS 'Tracks when agents are due for NPS surveys (FK updated to real_estate_agents)';
COMMENT ON TABLE product_feedback IS 'General product feedback and churn risk alerts (FK updated to real_estate_agents)';
COMMENT ON TABLE nps_survey_tokens IS 'JWT tokens for NPS survey links (FK updated to real_estate_agents)';
COMMENT ON TABLE nps_prompt_dismissals IS 'Tracks when agents dismiss in-app NPS prompts (FK updated to real_estate_agents)';
