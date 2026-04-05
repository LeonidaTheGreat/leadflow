-- Add trial_cta_sent column to pilot_progress table
-- This tracks whether the trial CTA email has been sent after 48h in aha_moment stage

ALTER TABLE pilot_progress
  ADD COLUMN IF NOT EXISTS trial_cta_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_cta_sent_at TIMESTAMPTZ;

-- Create index for efficient querying of pilots needing trial CTA
CREATE INDEX IF NOT EXISTS idx_pilot_progress_trial_cta 
  ON pilot_progress(stage, stage_entered_at, trial_cta_sent) 
  WHERE stage = 'aha_moment' AND trial_cta_sent = false;

-- DOWN
-- ALTER TABLE pilot_progress DROP COLUMN IF EXISTS trial_cta_sent;
-- ALTER TABLE pilot_progress DROP COLUMN IF EXISTS trial_cta_sent_at;
