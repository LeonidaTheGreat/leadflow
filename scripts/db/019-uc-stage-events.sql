-- Migration 019: uc_stage_events table for per-stage pipeline timing
-- Tracks the timestamp of each named pipeline transition per use case.
-- Enables Feedback-to-Deploy-Time breakdown into actionable segments.

CREATE TABLE IF NOT EXISTS uc_stage_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id        TEXT        NOT NULL,
  project_id   TEXT        NOT NULL,
  stage        TEXT        NOT NULL CHECK (stage IN (
    'feedback_ingested', 'dev_spawned', 'dev_completed',
    'qc_spawned', 'qc_completed', 'merged'
  )),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_uc_stage UNIQUE (uc_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_uc_stage_events_uc_id
  ON uc_stage_events (uc_id);

CREATE INDEX IF NOT EXISTS idx_uc_stage_events_project_stage
  ON uc_stage_events (project_id, stage, occurred_at DESC);

COMMENT ON TABLE uc_stage_events IS
  'Per-UC pipeline stage timestamps. Drives per-segment Feedback-to-Deploy-Time analysis.';
