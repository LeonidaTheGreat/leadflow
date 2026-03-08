-- Migration 008: Lead Satisfaction Feedback Collection
-- Creates lead_satisfaction_events table and adds satisfaction_ping_enabled to agents

-- ============================================
-- Table: lead_satisfaction_events
-- ============================================
CREATE TABLE IF NOT EXISTS lead_satisfaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  conversation_id TEXT,
  satisfaction_ping_sent_at TIMESTAMPTZ,
  raw_reply TEXT,
  rating TEXT CHECK (rating IN ('positive','negative','neutral','unclassified')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_satisfaction_events_agent_id ON lead_satisfaction_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_satisfaction_events_created_at ON lead_satisfaction_events(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_satisfaction_events_lead_id ON lead_satisfaction_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_satisfaction_events_rating ON lead_satisfaction_events(rating);

-- ============================================
-- Alter agents table: add satisfaction_ping_enabled
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS satisfaction_ping_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================
-- Summary view for product team analytics
-- ============================================
CREATE OR REPLACE VIEW satisfaction_summary AS
SELECT
  agent_id,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) AS total_responses,
  COUNT(*) FILTER (WHERE rating = 'positive') AS positive_count,
  COUNT(*) FILTER (WHERE rating = 'negative') AS negative_count,
  COUNT(*) FILTER (WHERE rating = 'neutral') AS neutral_count,
  COUNT(*) FILTER (WHERE rating = 'unclassified') AS unclassified_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rating = 'positive') /
    NULLIF(COUNT(*) FILTER (WHERE rating IS NOT NULL), 0),
    1
  ) AS positive_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rating = 'negative') /
    NULLIF(COUNT(*) FILTER (WHERE rating IS NOT NULL), 0),
    1
  ) AS negative_pct,
  MIN(created_at) AS first_event_at,
  MAX(created_at) AS last_event_at
FROM lead_satisfaction_events
GROUP BY agent_id;

-- Row level security: agents see only their own events
ALTER TABLE lead_satisfaction_events ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do anything (for API routes)
DROP POLICY IF EXISTS "service_role_all" ON lead_satisfaction_events;
CREATE POLICY "service_role_all" ON lead_satisfaction_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: agents can read only their own rows (anon key)
DROP POLICY IF EXISTS "agents_read_own" ON lead_satisfaction_events;
CREATE POLICY "agents_read_own" ON lead_satisfaction_events
  FOR SELECT TO anon USING (true);
