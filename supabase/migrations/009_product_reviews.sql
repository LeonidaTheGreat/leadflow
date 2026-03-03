-- Migration 009: Product Reviews & Decisions
-- Adds structured PM review system: product_reviews tracks walkthrough results,
-- product_decisions tracks architectural choices needing human sign-off.

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('prd_completion', 'periodic', 'milestone', 'manual')),
  scope_prd_id TEXT,
  scope_uc_ids TEXT[],
  scope_product_ids TEXT[],
  walkthrough_spec JSONB NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]',
  decisions_needed JSONB DEFAULT '[]',
  verdict TEXT CHECK (verdict IN ('pass', 'pass_with_issues', 'fail', 'in_progress')),
  readiness_score INTEGER,
  summary TEXT,
  task_id UUID REFERENCES tasks(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  resulting_uc_ids TEXT[],
  resulting_task_ids UUID[],
  resulting_decision_ids UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_project ON product_reviews(project_id, status);

CREATE TABLE IF NOT EXISTS product_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('architecture', 'auth', 'pricing', 'deployment', 'integration', 'ux', 'compliance', 'other')),
  options JSONB NOT NULL,
  recommended_option TEXT,
  recommendation_reason TEXT,
  status TEXT CHECK (status IN ('proposed', 'approved', 'rejected', 'deferred', 'implemented', 'superseded')) DEFAULT 'proposed',
  decided_by TEXT,
  decided_option TEXT,
  decision_reason TEXT,
  decided_at TIMESTAMP,
  blocking BOOLEAN DEFAULT false,
  resulting_uc_ids TEXT[],
  resulting_task_ids UUID[],
  source_review_id UUID REFERENCES product_reviews(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_decisions_project ON product_decisions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_product_decisions_blocking ON product_decisions(project_id) WHERE blocking = true AND status = 'proposed';
