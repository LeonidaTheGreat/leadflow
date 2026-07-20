-- Migration 026: task_locks — DB-level exclusion lock for pre-spawn dedup
-- Closes the race window between investigateDuplicateFix() and createTask()
-- that allows concurrent dispatches to both spawn duplicate hand-ship agents.
--
-- Acquire: INSERT ON CONFLICT DO NOTHING RETURNING locked_at
--   (RETURNING is only populated when the INSERT actually writes a row)
-- Release: DELETE WHERE task_title = $1 AND agent_id = $2
-- TTL (4h): expired rows cleaned before each acquire attempt so crashed
--   processes don't permanently block dispatch.

CREATE TABLE IF NOT EXISTS task_locks (
  task_title   TEXT        NOT NULL,
  agent_id     TEXT        NOT NULL,
  locked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (task_title, agent_id)
);

CREATE INDEX IF NOT EXISTS task_locks_expires_at_idx ON task_locks (expires_at);
