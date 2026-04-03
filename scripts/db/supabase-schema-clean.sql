-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS dashboard_snapshots CASCADE;
DROP TABLE IF EXISTS cost_tracking CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS completed_work CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS system_components CASCADE;
DROP TABLE IF EXISTS project_metadata CASCADE;

-- Now create fresh tables with correct schema

-- ==================== PROJECT METADATA ====================
CREATE TABLE project_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL UNIQUE,
  project_name VARCHAR(255) NOT NULL,
  goal VARCHAR(255),
  goal_value_usd NUMERIC(12,2),
  deadline_days INT,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  overall_status VARCHAR(50),
  status_color VARCHAR(20),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- ==================== SYSTEM COMPONENTS ====================
CREATE TABLE system_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  component_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  status VARCHAR(50),
  status_emoji VARCHAR(10),
  details VARCHAR(500),
  verified_date TIMESTAMP,
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  
  UNIQUE(project_id, component_name)
);

-- ==================== AGENTS ====================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50),
  status VARCHAR(50),
  status_emoji VARCHAR(10),
  progress_percent INT DEFAULT 0,
  current_task VARCHAR(255),
  blocker VARCHAR(255),
  last_activity TIMESTAMP,
  metadata JSONB,
  
  UNIQUE(project_id, agent_name)
);

-- ==================== COMPLETED WORK ====================
CREATE TABLE completed_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  work_name VARCHAR(255) NOT NULL,
  use_case VARCHAR(50),
  description TEXT,
  category VARCHAR(100),
  hours_spent NUMERIC(8,2),
  completed_date TIMESTAMP,
  status VARCHAR(50),
  dependencies JSONB,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ACTION ITEMS & BLOCKERS ====================
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  status VARCHAR(50),
  priority INT DEFAULT 2,
  description TEXT,
  assigned_to VARCHAR(100),
  awaiting_input VARCHAR(100),
  impact VARCHAR(255),
  action_needed TEXT,
  due_date TIMESTAMP,
  resolved_date TIMESTAMP,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== COST TRACKING ====================
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  budget_period VARCHAR(50),
  estimated_cost_usd NUMERIC(12,2),
  actual_cost_usd NUMERIC(12,2),
  budget_limit_usd NUMERIC(12,2),
  spend_percent NUMERIC(5,2),
  breakdown JSONB,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- ==================== DASHBOARD SNAPSHOTS ====================
CREATE TABLE dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  tasks_ready INT,
  tasks_in_progress INT,
  tasks_blocked INT,
  tasks_done INT,
  
  components_healthy INT,
  components_warning INT,
  components_down INT,
  
  agents_active INT,
  agents_ready INT,
  agents_blocked INT,
  
  cost_spent NUMERIC(12,2),
  cost_remaining NUMERIC(12,2),
  burn_rate_daily NUMERIC(10,2),
  
  full_snapshot JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================
CREATE INDEX idx_project_metadata_project_id ON project_metadata(project_id);
CREATE INDEX idx_system_components_project_id ON system_components(project_id);
CREATE INDEX idx_agents_project_id ON agents(project_id);
CREATE INDEX idx_completed_work_project_id ON completed_work(project_id);
CREATE INDEX idx_action_items_project_id ON action_items(project_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_cost_tracking_project_id ON cost_tracking(project_id);
CREATE INDEX idx_dashboard_snapshots_project_id ON dashboard_snapshots(project_id);
CREATE INDEX idx_dashboard_snapshots_time ON dashboard_snapshots(snapshot_time DESC);

-- ==================== INITIAL DATA FOR BO2026 ====================
INSERT INTO project_metadata (project_id, project_name, goal, goal_value_usd, deadline_days, overall_status, status_color)
VALUES ('bo2026', 'LeadFlow AI', '$20K MRR within 60 days', 20000, 60, 'ACTIVE', '🟢');

-- System Components
INSERT INTO system_components (project_id, component_name, category, status, status_emoji, details, verified_date)
VALUES
  ('bo2026', 'Vercel Deployment', 'DEPLOYMENT', 'LIVE', '✅', 'https://leadflow-ai-five.vercel.app (verified 2026-02-25)', NOW()),
  ('bo2026', 'FUB Integration', 'INTEGRATION', 'READY', '✅', 'Webhook endpoint live, UC-6 working', NOW()),
  ('bo2026', 'Twilio SMS', 'INTEGRATION', 'TESTED', '✅', 'SMS sent successfully via API', NOW()),
  ('bo2026', 'AI Qualification', 'INTEGRATION', 'READY', '✅', 'Claude integration ready', NOW()),
  ('bo2026', 'Dashboard', 'DEPLOYMENT', 'LIVE', '✅', 'Lead feed, stats, detail view, analytics', NOW()),
  ('bo2026', 'Database', 'DATABASE', 'LIVE', '✅', 'Supabase connected, 30+ test leads verified', NOW()),
  ('bo2026', 'Compliance', 'COMPLIANCE', 'READY', '✅', 'TCPA audit complete, system approved', NOW()),
  ('bo2026', 'Pilot Accounts', 'TESTING', 'READY', '✅', '3 agents created and active', NOW()),
  ('bo2026', 'SMS Testing', 'TESTING', 'VERIFIED', '✅', 'Test SMS confirmed working', NOW());

-- Agents
INSERT INTO agents (project_id, agent_name, agent_type, status, status_emoji, progress_percent, current_task, blocker)
VALUES
  ('bo2026', 'Dev', 'dev', 'ACTIVE', '✅', 100, 'UC-6/7/8 complete + dashboard polish', NULL),
  ('bo2026', 'Marketing', 'marketing', 'READY', '🟡', 40, 'Copy done, recruitment pending', 'User go-ahead'),
  ('bo2026', 'QC', 'qc', 'ACTIVE', '✅', 100, 'TCPA compliance audit done', NULL),
  ('bo2026', 'Analytics', 'analytics', 'COMPLETE', '✅', 100, 'KPI dashboard live', NULL),
  ('bo2026', 'Deployment', 'deployment', 'COMPLETE', '✅', 100, 'Pilot deployment complete', NULL);

-- Completed Work
INSERT INTO completed_work (project_id, work_name, use_case, description, category, hours_spent, completed_date, status)
VALUES
  ('bo2026', 'Outbound SMS', NULL, 'Message storage & sending', 'FEATURE', 2, NOW() - INTERVAL '5 days', 'COMPLETE'),
  ('bo2026', 'Cal.com Integration', 'UC-6', 'Booking confirmation SMS', 'FEATURE', 8, NOW() - INTERVAL '3 days', 'COMPLETE'),
  ('bo2026', 'Dashboard SMS', 'UC-7', 'Manual message sending', 'FEATURE', 6, NOW() - INTERVAL '2 days', 'COMPLETE'),
  ('bo2026', 'Follow-up Sequences', 'UC-8', 'Automated follow-ups', 'FEATURE', 12, NOW() - INTERVAL '1 day', 'COMPLETE'),
  ('bo2026', 'Pilot Deployment', NULL, 'Vercel + DB + integrations', 'DEPLOYMENT', 6, NOW(), 'COMPLETE');

-- Action Items
INSERT INTO action_items (project_id, title, type, status, priority, description, awaiting_input, impact, action_needed)
VALUES
  ('bo2026', 'Marketing Recruitment Timing', 'DECISION', 'WAITING', 1, 'When to launch pilot with 3 agents', 'Stojan', 'Determines first revenue timeline', 'Say "go ahead with recruitment" to spawn marketing task'),
  ('bo2026', 'Pilot Launch Decision', 'APPROVAL', 'WAITING', 1, 'Ready to go immediately', 'Stojan', 'Blocks all further work', 'Approve pilot launch or request changes');

-- Cost Tracking
INSERT INTO cost_tracking (project_id, budget_period, estimated_cost_usd, budget_limit_usd, spend_percent, breakdown)
VALUES
  ('bo2026', 'TOTAL', 95.80, 500.00, 19.16, '{"sonnet": 45.50, "haiku": 12.30, "kimi": 38.00}');
