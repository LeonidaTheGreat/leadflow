-- Migration 010: FUB Onboarding Wizard columns
-- Adds fub_onboarding_completed and fub_onboarding_step to real_estate_agents.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
      AND column_name = 'fub_onboarding_completed'
  ) THEN
    ALTER TABLE real_estate_agents
      ADD COLUMN fub_onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
      AND column_name = 'fub_onboarding_step'
  ) THEN
    ALTER TABLE real_estate_agents
      ADD COLUMN fub_onboarding_step INT DEFAULT 0;
  END IF;
END $$;
