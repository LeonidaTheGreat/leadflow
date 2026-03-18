-- Migration 013: Fix satisfaction schema column mismatch
-- Problem: Migration 008 added satisfaction_ping_enabled to agents (AI orchestrator table)
--          instead of real_estate_agents (customer table). Code correctly queries
--          real_estate_agents, so runtime failures occur.
-- Also: lead_satisfaction_events.agent_id FK references agents(id) — should be real_estate_agents(id)
--
-- Fix:
--   1. Add satisfaction_ping_enabled to real_estate_agents
--   2. Drop the incorrect FK constraint on lead_satisfaction_events.agent_id (refs agents)
--   3. Add correct FK constraint referencing real_estate_agents(id)

-- ============================================
-- Step 1: Add column to real_estate_agents
-- ============================================
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS satisfaction_ping_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================
-- Step 2: Fix FK on lead_satisfaction_events
-- Drop the wrong constraint (references agents), add correct one (references real_estate_agents)
-- ============================================

-- Drop old constraint (name may vary; try the default and generated names)
DO $$
BEGIN
  -- Try to drop each known name variant; ignore if not found
  BEGIN
    ALTER TABLE lead_satisfaction_events
      DROP CONSTRAINT lead_satisfaction_events_agent_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL; -- already gone or never existed
  END;
END;
$$;

-- Add correct FK referencing real_estate_agents
ALTER TABLE lead_satisfaction_events
  ADD CONSTRAINT lead_satisfaction_events_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE SET NULL
  NOT VALID; -- NOT VALID skips full table scan; safe for existing data

-- Validate in background (no table lock)
ALTER TABLE lead_satisfaction_events
  VALIDATE CONSTRAINT lead_satisfaction_events_agent_id_fkey;

-- ============================================
-- Step 3: Rebuild satisfaction_summary view to use real_estate_agents agent_id
-- Must drop+recreate because column list changed (added agent_email)
-- ============================================
DROP VIEW IF EXISTS satisfaction_summary;
CREATE VIEW satisfaction_summary AS
SELECT
  lse.agent_id,
  rea.email                                               AS agent_email,
  COUNT(*) FILTER (WHERE lse.rating IS NOT NULL)          AS total_responses,
  COUNT(*) FILTER (WHERE lse.rating = 'positive')         AS positive_count,
  COUNT(*) FILTER (WHERE lse.rating = 'negative')         AS negative_count,
  COUNT(*) FILTER (WHERE lse.rating = 'neutral')          AS neutral_count,
  COUNT(*) FILTER (WHERE lse.rating = 'unclassified')     AS unclassified_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE lse.rating = 'positive') /
    NULLIF(COUNT(*) FILTER (WHERE lse.rating IS NOT NULL), 0),
    1
  )                                                       AS positive_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE lse.rating = 'negative') /
    NULLIF(COUNT(*) FILTER (WHERE lse.rating IS NOT NULL), 0),
    1
  )                                                       AS negative_pct,
  MIN(lse.created_at)                                     AS first_event_at,
  MAX(lse.created_at)                                     AS last_event_at
FROM lead_satisfaction_events lse
LEFT JOIN real_estate_agents rea ON rea.id = lse.agent_id
GROUP BY lse.agent_id, rea.email;
