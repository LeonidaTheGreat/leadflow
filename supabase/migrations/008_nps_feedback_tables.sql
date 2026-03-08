-- ============================================
-- NPS & Feedback Survey Tables
-- feat-nps-agent-feedback
-- ============================================

-- ==================== AGENT NPS RESPONSES ====================
CREATE TABLE IF NOT EXISTS agent_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  open_text TEXT,
  survey_trigger TEXT NOT NULL, -- 'auto_14d' | 'auto_90d' | 'manual'
  responded_via TEXT NOT NULL,  -- 'email' | 'in_app'
  token_hash TEXT UNIQUE,       -- hash of JWT used (prevents replay)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_nps_responses_agent_id ON agent_nps_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_nps_responses_created_at ON agent_nps_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_nps_responses_score ON agent_nps_responses(score);

-- ==================== AGENT SURVEY SCHEDULE ====================
CREATE TABLE IF NOT EXISTS agent_survey_schedule (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  next_survey_at TIMESTAMPTZ NOT NULL,
  last_survey_at TIMESTAMPTZ,
  survey_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_survey_schedule_next_survey ON agent_survey_schedule(next_survey_at);

-- ==================== PRODUCT FEEDBACK ====================
CREATE TABLE IF NOT EXISTS product_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  source TEXT NOT NULL,         -- 'agent_self_report' | 'churn_risk' | 'nps_followup'
  feedback_type TEXT NOT NULL,  -- 'praise' | 'bug' | 'idea' | 'frustration' | 'churn_risk'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_agent_id ON product_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_product_feedback_source ON product_feedback(source);
CREATE INDEX IF NOT EXISTS idx_product_feedback_feedback_type ON product_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_product_feedback_is_processed ON product_feedback(is_processed);
CREATE INDEX IF NOT EXISTS idx_product_feedback_created_at ON product_feedback(created_at DESC);

-- ==================== NPS SURVEY TOKENS ====================
-- Track used tokens to prevent replay attacks
CREATE TABLE IF NOT EXISTS nps_survey_tokens (
  token_hash TEXT PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_survey_tokens_expires ON nps_survey_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_nps_survey_tokens_agent ON nps_survey_tokens(agent_id);

-- ==================== IN-APP PROMPT DISMISSALS ====================
CREATE TABLE IF NOT EXISTS nps_prompt_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_until TIMESTAMPTZ NOT NULL,
  trigger_type TEXT NOT NULL,   -- 'auto_14d' | 'auto_90d'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_prompt_dismissals_agent ON nps_prompt_dismissals(agent_id);
CREATE INDEX IF NOT EXISTS idx_nps_prompt_dismissals_until ON nps_prompt_dismissals(dismissed_until);

-- ==================== ROW LEVEL SECURITY POLICIES ====================
-- Enable RLS on new tables
ALTER TABLE agent_nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_survey_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_prompt_dismissals ENABLE ROW LEVEL SECURITY;

-- Policies for agent_nps_responses
CREATE POLICY "Agents can view own NPS responses"
  ON agent_nps_responses FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Service role can manage NPS responses"
  ON agent_nps_responses FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for agent_survey_schedule
CREATE POLICY "Agents can view own survey schedule"
  ON agent_survey_schedule FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Service role can manage survey schedule"
  ON agent_survey_schedule FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for product_feedback
CREATE POLICY "Agents can view own feedback"
  ON product_feedback FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Service role can manage feedback"
  ON product_feedback FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for nps_survey_tokens
CREATE POLICY "Service role can manage tokens"
  ON nps_survey_tokens FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for nps_prompt_dismissals
CREATE POLICY "Agents can view own dismissals"
  ON nps_prompt_dismissals FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Service role can manage dismissals"
  ON nps_prompt_dismissals FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== COMMENTS ====================
COMMENT ON TABLE agent_nps_responses IS 'Stores NPS survey responses from real estate agents';
COMMENT ON TABLE agent_survey_schedule IS 'Tracks when agents are due for NPS surveys';
COMMENT ON TABLE product_feedback IS 'General product feedback and churn risk alerts';
COMMENT ON TABLE nps_survey_tokens IS 'JWT tokens for NPS survey links (prevents replay)';
COMMENT ON TABLE nps_prompt_dismissals IS 'Tracks when agents dismiss in-app NPS prompts';
