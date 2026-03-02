-- Migration 007: Feature Flags
-- Simple feature flag system for gradual rollout and safe deployment.
-- Dev agents create flags; orchestrator enables after QC approval.

CREATE TABLE IF NOT EXISTS feature_flags (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  flag_key      TEXT NOT NULL,                       -- Unique key, e.g. "new-dashboard-v2"
  description   TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INTEGER NOT NULL DEFAULT 0,        -- 0-100, for gradual rollout
  conditions    JSONB DEFAULT '{}',                  -- e.g. {"plan": "pro"}, {"user_ids": [...]}
  created_by    TEXT,                                -- Agent or user who created the flag
  approved_by   TEXT,                                -- QC agent who approved enabling
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_project
  ON feature_flags(project_id, enabled);

-- ── Helper function to check if a flag is enabled ─────────────────────────

CREATE OR REPLACE FUNCTION check_feature_flag(
  p_project_id TEXT,
  p_flag_key TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_plan TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  flag RECORD;
BEGIN
  SELECT * INTO flag FROM feature_flags
  WHERE project_id = p_project_id AND flag_key = p_flag_key;

  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT flag.enabled THEN RETURN false; END IF;

  -- Check rollout percentage (hash-based for consistency)
  IF flag.rollout_percent < 100 AND p_user_id IS NOT NULL THEN
    IF abs(hashtext(p_user_id || p_flag_key)) % 100 >= flag.rollout_percent THEN
      RETURN false;
    END IF;
  END IF;

  -- Check plan condition
  IF flag.conditions ? 'plan' AND p_plan IS NOT NULL THEN
    IF flag.conditions->>'plan' != p_plan THEN
      RETURN false;
    END IF;
  END IF;

  -- Check user_ids condition
  IF flag.conditions ? 'user_ids' AND p_user_id IS NOT NULL THEN
    IF NOT (flag.conditions->'user_ids' ? p_user_id) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;
