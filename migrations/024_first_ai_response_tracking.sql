-- Migration 024: Track AI response content and first-response milestone
--
-- Adds message_body to conversations so we can store the AI-generated SMS text,
-- and adds first_ai_response_notified_at to real_estate_agents to track the
-- one-time milestone notification that fires when an agent's AI sends its first reply.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_body TEXT;

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS first_ai_response_notified_at TIMESTAMPTZ;
