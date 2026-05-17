CREATE TABLE IF NOT EXISTS public.subscription_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID,
  tier TEXT,
  stripe_session_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
