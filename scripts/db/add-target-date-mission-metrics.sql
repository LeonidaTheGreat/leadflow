-- Add target_date column to mission_metrics for deadline-bound metrics.
-- Enables heartbeat to surface days-remaining for time-critical milestones.

ALTER TABLE mission_metrics ADD COLUMN IF NOT EXISTS target_date date;

-- Set deadline for First Paying Customer (primary 2026-07-01 milestone).
UPDATE mission_metrics
SET target_date = '2026-07-01'
WHERE project_id = 'leadflow' AND name = 'First Paying Customer';
