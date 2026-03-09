-- Migration 011: Ensure trial signup fields exist on real_estate_agents
-- These fields support the frictionless Start Free Trial CTA feature.
-- The columns may already exist; IF NOT EXISTS guards are idempotent.

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- Allow 'trial' as a valid plan_tier value
-- (plan_tier is TEXT — no enum constraint to update)

COMMENT ON COLUMN real_estate_agents.trial_ends_at IS '30-day trial expiry for agents who signed up via the free trial CTA';
COMMENT ON COLUMN real_estate_agents.source IS 'Signup source: trial_cta | paid_signup | pilot_application | direct';
