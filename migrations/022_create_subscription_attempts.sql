CREATE TABLE IF NOT EXISTS public.subscription_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'team')),
  stripe_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'session_created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_attempts_agent_id ON subscription_attempts(agent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_attempts_status ON subscription_attempts(status);
CREATE INDEX IF NOT EXISTS idx_subscription_attempts_created_at ON subscription_attempts(created_at);
