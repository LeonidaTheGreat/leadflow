-- Migration 005: Demo Mode
-- Adds demo_runs_used counter to real_estate_agents
-- Creates demo_runs table for tracking demo history

-- Up
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS demo_runs_used INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS demo_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  lead_name TEXT,
  lead_phone TEXT,
  lead_source TEXT,
  ai_response TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_runs_agent_id ON demo_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_demo_runs_created_at ON demo_runs(created_at);
