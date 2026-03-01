-- Migration 004: Project Hierarchy for 4-Loop Architecture
-- PRDs, Use Cases, E2E Test Specs, Metrics, Code Reviews, Product Feedback

-- PRDs
CREATE TABLE IF NOT EXISTS prds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'deprecated')) DEFAULT 'draft',
  version TEXT,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Use Cases (with workflow chains)
CREATE TABLE IF NOT EXISTS use_cases (
  id TEXT PRIMARY KEY,
  prd_id TEXT REFERENCES prds(id),
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT,
  priority INTEGER DEFAULT 2,
  implementation_status TEXT CHECK (implementation_status IN
    ('not_started', 'partial', 'ready', 'complete')) DEFAULT 'not_started',
  e2e_tests_defined BOOLEAN DEFAULT false,
  e2e_tests_passing BOOLEAN DEFAULT false,
  acceptance_criteria JSONB,
  depends_on TEXT[],
  workflow TEXT[] DEFAULT ARRAY['product', 'dev', 'qc'],
  shippable_after_step INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E2E Test Specs
CREATE TABLE IF NOT EXISTS e2e_test_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id TEXT REFERENCES use_cases(id),
  test_name TEXT NOT NULL,
  test_file TEXT,
  test_spec JSONB,
  assertions JSONB,
  last_run TIMESTAMP,
  last_result TEXT CHECK (last_result IN ('pass', 'fail', 'not_run')) DEFAULT 'not_run',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics (orchestrator, product, and QC domains)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_metrics_lookup ON metrics(project_id, domain, metric_type, timestamp DESC);

-- Code Reviews (for QC loop)
CREATE TABLE IF NOT EXISTS code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  pr_number INTEGER,
  branch_name TEXT,
  reviewer_agent TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'changes_requested', 'merged')) DEFAULT 'pending',
  review_notes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Feedback (for product iteration loop)
CREATE TABLE IF NOT EXISTS product_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  source TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  resulting_task_id UUID REFERENCES tasks(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to existing tasks table for project hierarchy linkage
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS use_case_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS prd_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pr_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_tasks_use_case_id ON tasks(use_case_id) WHERE use_case_id IS NOT NULL;
