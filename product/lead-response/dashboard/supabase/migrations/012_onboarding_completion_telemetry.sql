-- Migration 012: Onboarding Completion Telemetry
-- Adds step-level telemetry to track where agents drop off during onboarding.
-- Idempotent: safe to run multiple times.

-- ==================== ADD COLUMNS TO real_estate_agents ====================
DO $$
BEGIN
  -- Add onboarding_step (0-5) for canonical step tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
      AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE real_estate_agents
      ADD COLUMN onboarding_step INT DEFAULT 0;
    COMMENT ON COLUMN real_estate_agents.onboarding_step IS
      'Canonical onboarding step: 0=signup, 1=email_verified, 2=fub_connected, 3=phone_configured, 4=sms_verified, 5=aha_completed';
  END IF;

  -- Add last_onboarding_step_update for time-at-step tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
      AND column_name = 'last_onboarding_step_update'
  ) THEN
    ALTER TABLE real_estate_agents
      ADD COLUMN last_onboarding_step_update TIMESTAMPTZ DEFAULT NOW();
    COMMENT ON COLUMN real_estate_agents.last_onboarding_step_update IS
      'Timestamp of last onboarding_step update, used to compute time-at-step';
  END IF;
END $$;

-- ==================== CREATE onboarding_events TABLE ====================
CREATE TABLE IF NOT EXISTS onboarding_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL,
  step_name       TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_agent_id FOREIGN KEY (agent_id) 
    REFERENCES real_estate_agents (id) ON DELETE CASCADE,
  
  CONSTRAINT valid_step_name CHECK (step_name IN (
    'email_verified',
    'fub_connected',
    'phone_configured',
    'sms_verified',
    'aha_completed'
  ))
);

-- Indexes for fast event queries and step tracking
CREATE INDEX IF NOT EXISTS idx_onboarding_events_agent_id
  ON onboarding_events (agent_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_step_name
  ON onboarding_events (step_name);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_timestamp
  ON onboarding_events (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_agent_step
  ON onboarding_events (agent_id, step_name, timestamp DESC);

COMMENT ON TABLE onboarding_events IS
  'Append-only log of onboarding step transitions. Each event includes agent_id, step name, status (started/completed/failed/skipped), and metadata (error reason, latency, source route, attempt count, etc).';

-- ==================== CREATE UTILITY FUNCTION: get_time_at_step ====================
CREATE OR REPLACE FUNCTION get_time_at_step(agent_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  last_update TIMESTAMPTZ;
BEGIN
  SELECT last_onboarding_step_update INTO last_update
  FROM real_estate_agents
  WHERE id = agent_id;
  
  IF last_update IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN NOW() - last_update;
END;
$$ LANGUAGE plpgsql;

-- ==================== CREATE UTILITY FUNCTION: is_smoke_test_account ====================
CREATE OR REPLACE FUNCTION is_smoke_test_account(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Exclude smoke-test@* and *@leadflow-test.com
  RETURN 
    email ILIKE 'smoke-test@%' OR 
    email ILIKE '%@leadflow-test.com';
END;
$$ LANGUAGE plpgsql;

-- ==================== CREATE VIEW: funnel_real_agents ====================
CREATE OR REPLACE VIEW funnel_real_agents AS
SELECT 
  id,
  email,
  onboarding_step,
  onboarding_completed,
  last_onboarding_step_update,
  created_at
FROM real_estate_agents
WHERE NOT is_smoke_test_account(email)
  AND email IS NOT NULL;

COMMENT ON VIEW funnel_real_agents IS
  'Real agents only (excludes smoke-test@* and *@leadflow-test.com)';

-- ==================== CREATE VIEW: funnel_step_counts ====================
CREATE OR REPLACE VIEW funnel_step_counts AS
WITH agent_latest_steps AS (
  SELECT 
    agent_id,
    onboarding_step,
    last_onboarding_step_update
  FROM funnel_real_agents
  CROSS JOIN LATERAL (
    SELECT onboarding_step, last_onboarding_step_update 
    FROM real_estate_agents ra WHERE ra.id = funnel_real_agents.id
  ) AS ra
)
SELECT 
  onboarding_step,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_onboarding_step_update))) as avg_time_at_step_seconds
FROM agent_latest_steps
GROUP BY onboarding_step;

COMMENT ON VIEW funnel_step_counts IS
  'Agent distribution across onboarding steps (real agents only)';

-- ==================== CREATE VIEW: funnel_conversion_rates ====================
CREATE OR REPLACE VIEW funnel_conversion_rates AS
WITH step_counts AS (
  SELECT 
    onboarding_step,
    COUNT(*) as count
  FROM funnel_real_agents
  GROUP BY onboarding_step
)
SELECT 
  'step_1_to_2' as transition,
  'email_verified → fub_connected' as description,
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 2), 0)::NUMERIC / 
  NULLIF(COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 1), 0), 0) as conversion_rate,
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 1), 0) as denominator,
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 2), 0) as numerator
UNION ALL
SELECT 
  'step_2_to_3',
  'fub_connected → phone_configured',
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 3), 0)::NUMERIC / 
  NULLIF(COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 2), 0), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 2), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 3), 0)
UNION ALL
SELECT 
  'step_3_to_4',
  'phone_configured → sms_verified',
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 4), 0)::NUMERIC / 
  NULLIF(COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 3), 0), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 3), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 4), 0)
UNION ALL
SELECT 
  'step_4_to_5',
  'sms_verified → aha_completed',
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 5), 0)::NUMERIC / 
  NULLIF(COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 4), 0), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 4), 0),
  COALESCE((SELECT count FROM step_counts WHERE onboarding_step >= 5), 0);

COMMENT ON VIEW funnel_conversion_rates IS
  'Daily step-to-step conversion rates (real agents only)';

-- ==================== CREATE TABLE: onboarding_stuck_alerts ====================
CREATE TABLE IF NOT EXISTS onboarding_stuck_alerts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL,
  step_name       TEXT NOT NULL,
  stuck_since     TIMESTAMPTZ NOT NULL,
  alert_created_at TIMESTAMPTZ DEFAULT NOW(),
  last_alert_at   TIMESTAMPTZ DEFAULT NOW(),
  alert_count     INT DEFAULT 1,
  metadata        JSONB DEFAULT '{}',
  
  CONSTRAINT fk_stuck_alert_agent FOREIGN KEY (agent_id) 
    REFERENCES real_estate_agents (id) ON DELETE CASCADE,
  
  -- Deduplicate: one alert per agent+step per 24h window
  UNIQUE(agent_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_stuck_alerts_agent_id
  ON onboarding_stuck_alerts (agent_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_stuck_alerts_created_at
  ON onboarding_stuck_alerts (alert_created_at DESC);

COMMENT ON TABLE onboarding_stuck_alerts IS
  'Tracks agents stuck on same step >24h. One alert per agent+step deduplicates within a 24h window.';
