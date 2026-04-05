-- Create pilot_progress table for white-glove onboarding tracking
-- Tracks which stage each pilot is in (signed_up → setup → aha_moment → trial)

CREATE TABLE IF NOT EXISTS pilot_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  stage VARCHAR NOT NULL DEFAULT 'signed_up',
    -- stages: signed_up | email_verified | fub_connected | first_lead_responded | aha_moment | trial_started | paid
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  stuck_since TIMESTAMPTZ,
  support_notes TEXT,
  last_contact_at TIMESTAMPTZ,
  last_contact_type VARCHAR,  -- email | call | zoom | slack
  pilot_cohort VARCHAR NOT NULL DEFAULT 'cohort-1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id)
);

CREATE INDEX idx_pilot_progress_stage ON pilot_progress(stage);
CREATE INDEX idx_pilot_progress_stuck_since ON pilot_progress(stuck_since);
CREATE INDEX idx_pilot_progress_pilot_cohort ON pilot_progress(pilot_cohort);
CREATE INDEX idx_pilot_progress_stage_entered_at ON pilot_progress(stage_entered_at);

-- DOWN
-- DROP TABLE IF EXISTS pilot_progress;
