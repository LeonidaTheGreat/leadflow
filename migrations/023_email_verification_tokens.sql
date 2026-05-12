-- TASK SPEC (0d454ef1-8243-4130-9f6e-a3ff5710a674)
-- What:
-- - Create migrations/023_email_verification_tokens.sql to add the missing public.email_verification_tokens table and required indexes.
-- - Keep schema aligned with PRD and existing verification-email usage (agent_id FK, unique token, expires_at, used_at, created_at).
-- Verify:
-- - Run: rg -n "email_verification_tokens|idx_evt_token|idx_evt_agent_id" migrations/023_email_verification_tokens.sql
-- - Run: npm run build
-- - Run: npm run lint
-- - Run: npm test
-- - Run: npm audit --audit-level=high
-- Boundaries:
-- - Do not modify verification service, routes, or unrelated migrations.
-- - Do not touch protected/generated files (DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, ORCHESTRATOR-HEARTBEAT-LOG.md, project.config.json).

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_evt_agent_id ON email_verification_tokens(agent_id);
