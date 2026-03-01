-- Migration: Add blocked_reason column to tasks table
-- This fixes the dashboard blocked_reason display bug

-- Add the blocked_reason column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN tasks.blocked_reason IS 'Human-readable reason why task is blocked (displayed on dashboard)';

-- Create index for faster queries on blocked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_reason ON tasks(blocked_reason) WHERE blocked_reason IS NOT NULL;

SELECT 'Migration complete: blocked_reason column added to tasks table' as status;
