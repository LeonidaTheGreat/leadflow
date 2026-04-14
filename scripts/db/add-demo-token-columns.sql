-- Migration: Add view_count and agent_context to demo_tokens
-- For shareable demo link feature (feat-shareable-demo-link-acquisition)

ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS agent_context jsonb DEFAULT '{}'::jsonb;
