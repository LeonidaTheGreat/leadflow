/*
Task Spec
What:
- Create /Users/clawdbot/projects/leadflow/migrations/022_create_subscription_attempts.sql to add the missing subscription_attempts table used by product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts (POST handler insert call).
- Include indexes needed for conversion-funnel queries and lookup by agent/session.

Verify:
- Confirm no existing subscription_attempts migration/table definition in repo via: rg -n "subscription_attempts" migrations SCHEMA.md.
- Validate migration file shape via: rg -n "CREATE TABLE IF NOT EXISTS subscription_attempts|CREATE INDEX IF NOT EXISTS idx_subscription_attempts" migrations/022_create_subscription_attempts.sql.
- Run project checks required by task policy: npm test and npm run build (report exact outcome).

Boundaries:
- Do not modify route/service/business logic files.
- Do not alter existing tables/migrations beyond adding this new migration file.
- Do not change deployment, dashboard, or Tailscale configuration.
*/

-- Migration: Create subscription_attempts
-- Purpose: Record upgrade checkout attempts for conversion funnel analytics.
-- Date: 2026-04-13

CREATE TABLE IF NOT EXISTS subscription_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  tier              TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'team')),
  stripe_session_id TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'session_created',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_attempts_agent_id ON subscription_attempts(agent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_attempts_status ON subscription_attempts(status);
CREATE INDEX IF NOT EXISTS idx_subscription_attempts_created_at ON subscription_attempts(created_at);

-- DOWN
-- DROP INDEX IF EXISTS idx_subscription_attempts_created_at;
-- DROP INDEX IF EXISTS idx_subscription_attempts_status;
-- DROP INDEX IF EXISTS idx_subscription_attempts_agent_id;
-- DROP TABLE IF EXISTS subscription_attempts;
