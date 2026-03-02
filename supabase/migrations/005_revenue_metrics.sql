-- Migration 005: Revenue Intelligence Loop (Loop 5)
-- Adds tables for revenue tracking, customer events, and project goals.
-- These power the autonomous revenue awareness system.

-- ── Revenue Metrics (daily snapshots) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS revenue_metrics (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  mrr_cents     INTEGER NOT NULL DEFAULT 0,        -- Monthly recurring revenue in cents
  active_subscribers INTEGER NOT NULL DEFAULT 0,
  trial_users   INTEGER NOT NULL DEFAULT 0,
  churned_count INTEGER NOT NULL DEFAULT 0,         -- Churned in this period
  new_subscribers INTEGER NOT NULL DEFAULT 0,       -- New in this period
  conversion_rate NUMERIC(5,4) DEFAULT 0,           -- Trial → paid rate
  arpu_cents    INTEGER DEFAULT 0,                  -- Average revenue per user (cents)
  data          JSONB DEFAULT '{}',                 -- Extra data (plan breakdown, etc.)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, date)
);

CREATE INDEX IF NOT EXISTS idx_revenue_metrics_project_date
  ON revenue_metrics(project_id, date DESC);

-- ── Customer Events (individual lifecycle events) ─────────────────────────

CREATE TABLE IF NOT EXISTS customer_events (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  customer_id   TEXT,                               -- Stripe customer ID or internal ID
  event_type    TEXT NOT NULL,                       -- signup, subscribe, upgrade, downgrade, cancel, churn, support_ticket
  plan          TEXT,                                -- Plan name at time of event
  mrr_delta_cents INTEGER DEFAULT 0,                -- Change in MRR (positive for upgrade, negative for cancel)
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_events_project_type
  ON customer_events(project_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_events_customer
  ON customer_events(customer_id, created_at DESC);

-- ── Project Goals ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_goals (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  goal_type     TEXT NOT NULL,                       -- mrr, subscribers, conversion, traffic
  target_value  NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_date   DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',      -- active, achieved, missed, paused
  gap_percent   NUMERIC(6,2) DEFAULT 0,             -- How far behind (negative = ahead)
  trajectory    TEXT DEFAULT 'unknown',              -- on_track, behind, ahead, critical
  last_checked  TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_goals_project_status
  ON project_goals(project_id, status);

-- ── Add revenue_impact column to use_cases ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'use_cases' AND column_name = 'revenue_impact'
  ) THEN
    ALTER TABLE use_cases ADD COLUMN revenue_impact TEXT DEFAULT 'none';
    COMMENT ON COLUMN use_cases.revenue_impact IS 'Revenue impact level: high, medium, low, none. Used for priority boosting when revenue goals are off-track.';
  END IF;
END $$;
