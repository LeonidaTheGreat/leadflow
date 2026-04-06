-- Migration 017: Add aha moment tracking columns to real_estate_agents
-- Required for uc-revenue-aha-moment AC-8: aha moment metric queryable from DB

ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS aha_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS aha_response_time_ms INTEGER;
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS onboarding_final_step VARCHAR(50);
