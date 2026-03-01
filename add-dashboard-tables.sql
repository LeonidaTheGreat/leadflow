-- Add tables for dashboard.html full Supabase integration
-- Run this in Supabase SQL Editor

-- ==================== MODEL PERFORMANCE ====================
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  model_name VARCHAR(50) NOT NULL,
  success_rate_percent INT,
  tasks_count INT DEFAULT 0,
  cost_per_task_usd NUMERIC(10,2),
  avg_quality_rating NUMERIC(3,1),
  avg_tokens INT,
  total_cost_usd NUMERIC(10,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(project_id, model_name)
);

-- ==================== AGENT PERFORMANCE DETAIL ====================
-- Extend agents table with performance metrics
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_completed INT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_total INT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS avg_quality NUMERIC(3,1);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_tokens INT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS recommended_model VARCHAR(50);

-- ==================== ROADMAP PHASES ====================
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'active', 'done', 'pending'
  date_range VARCHAR(100),
  progress_percent INT DEFAULT 0,
  target VARCHAR(255),
  display_order INT DEFAULT 0,
  
  UNIQUE(project_id, phase_number)
);

-- ==================== ROADMAP TASKS ====================
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL, -- 'done', 'ready', 'blocked', 'todo'
  hours DECIMAL(5,1),
  display_order INT DEFAULT 0
);

-- ==================== EXECUTION PLAN ====================
CREATE TABLE IF NOT EXISTS execution_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  day_name VARCHAR(100) NOT NULL, -- e.g., "Mon Feb 21 — TODAY"
  date_range VARCHAR(100),
  display_order INT DEFAULT 0,
  is_today BOOLEAN DEFAULT FALSE
);

-- ==================== EXECUTION TASKS ====================
CREATE TABLE IF NOT EXISTS execution_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  execution_day_id UUID REFERENCES execution_plan(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  is_highlighted BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0
);

-- ==================== MODEL SELECTION LOG ====================
CREATE TABLE IF NOT EXISTS model_selection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES project_metadata(project_id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  task_name VARCHAR(255),
  complexity INT,
  initial_model VARCHAR(50),
  final_model VARCHAR(50),
  escalations INT DEFAULT 0,
  result VARCHAR(50), -- 'success', 'failed'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_model_performance_project ON model_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_project ON roadmap_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_project ON roadmap_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_execution_plan_project ON execution_plan(project_id);
CREATE INDEX IF NOT EXISTS idx_model_selection_log_project ON model_selection_log(project_id);

-- ==================== INSERT SAMPLE DATA ====================

-- Model Performance (from hardcoded dashboard values)
INSERT INTO model_performance (project_id, model_name, success_rate_percent, tasks_count, cost_per_task_usd, avg_quality_rating, avg_tokens, total_cost_usd)
VALUES 
  ('bo2026', 'Qwen3-Next', 85, 12, 0, 4.0, 35000, 0),
  ('bo2026', 'Haiku', 92, 5, 0.50, 4.2, 28000, 0.12),
  ('bo2026', 'Sonnet', 95, 3, 2.00, 4.5, 42000, 1.35),
  ('bo2026', 'Kimi', 88, 8, 0.30, 4.1, 38000, 0.45)
ON CONFLICT (project_id, model_name) DO UPDATE SET
  success_rate_percent = EXCLUDED.success_rate_percent,
  tasks_count = EXCLUDED.tasks_count,
  updated_at = CURRENT_TIMESTAMP;

-- Update agents with performance data
UPDATE agents SET 
  tasks_completed = 8, tasks_total = 8, avg_quality = 4.2, total_tokens = 42000, cost_usd = 1.89, recommended_model = 'Qwen3-Next'
WHERE project_id = 'bo2026' AND agent_name = 'Dev';

UPDATE agents SET 
  tasks_completed = 5, tasks_total = 5, avg_quality = 4.0, total_tokens = 28000, cost_usd = 0.45, recommended_model = 'Qwen3-Next'
WHERE project_id = 'bo2026' AND agent_name = 'Marketing';

UPDATE agents SET 
  tasks_completed = 4, tasks_total = 5, avg_quality = 4.5, total_tokens = 35000, cost_usd = 0.92, recommended_model = 'Haiku'
WHERE project_id = 'bo2026' AND agent_name = 'QC';

UPDATE agents SET 
  tasks_completed = 3, tasks_total = 3, avg_quality = 4.8, total_tokens = 18000, cost_usd = 0.00, recommended_model = 'Qwen3-Next'
WHERE project_id = 'bo2026' AND agent_name = 'Orchestrator';

-- Roadmap Phases
INSERT INTO roadmap_phases (project_id, phase_number, title, status, date_range, progress_percent, target, display_order)
VALUES 
  ('bo2026', 1, 'Phase 1: MVP Launch', 'active', 'Days 7-14', 80, '5 pilots active by Feb 28', 1),
  ('bo2026', 2, 'Phase 2: First Revenue', 'pending', 'Days 15-21', 0, 'First paying customer', 2),
  ('bo2026', 3, 'Phase 3: Scale', 'pending', 'Days 22-35', 0, '15 customers = $10-12K MRR', 3),
  ('bo2026', 4, 'Phase 4: $20K MRR', 'pending', 'Days 36-60', 0, '25 customers = $20,000+ MRR', 4)
ON CONFLICT (project_id, phase_number) DO UPDATE SET
  status = EXCLUDED.status,
  progress_percent = EXCLUDED.progress_percent;

-- Roadmap Tasks for Phase 1
INSERT INTO roadmap_tasks (project_id, phase_number, title, description, status, hours, display_order)
VALUES 
  ('bo2026', 1, 'Inbound SMS Handler', 'TCPA compliant, auto-respond', 'done', 2, 1),
  ('bo2026', 1, 'Autonomous System', 'Validate + sync + dispatch', 'done', 4, 2),
  ('bo2026', 1, 'Agent Onboarding UI', 'Self-service signup', 'ready', 4, 3),
  ('bo2026', 1, 'Cal.com Booking Links', 'Appointment scheduling', 'ready', 3, 4),
  ('bo2026', 1, 'Recruit 5 Pilots', 'BLOCKED: Needs Onboarding + Cal.com first', 'blocked', 5, 5),
  ('bo2026', 2, 'Stripe Billing', 'Subscription management', 'done', 4, 1),
  ('bo2026', 2, 'First Pilot Validation', 'Needs: 5 pilots active', 'blocked', 3, 2),
  ('bo2026', 2, 'Convert Pilots to Paid', 'Target: $2,400-4,000 MRR', 'blocked', 2, 3),
  ('bo2026', 3, 'Recruit 10 More Agents', 'Target: +$8,000 MRR', 'blocked', 8, 1),
  ('bo2026', 3, 'Voice AI (VAPI)', 'Optional: Inbound voice calls', 'blocked', 6, 2),
  ('bo2026', 4, 'Recruit 10 More Agents', 'Final push', 'blocked', 8, 1),
  ('bo2026', 4, 'Referral Program', 'Growth channel', 'blocked', 4, 2)
ON CONFLICT DO NOTHING;

-- Model Selection Log (sample entries)
INSERT INTO model_selection_log (project_id, timestamp, task_name, complexity, initial_model, final_model, escalations, result)
VALUES 
  ('bo2026', NOW() - INTERVAL '1 hour', 'Spawn orchestrator', 5, 'Qwen3-Next', 'Qwen3-Next', 0, 'success'),
  ('bo2026', NOW() - INTERVAL '2 hours', 'Fix outbound storage', 6, 'Qwen3-Next', 'Sonnet', 1, 'success'),
  ('bo2026', NOW() - INTERVAL '3 hours', 'Dashboard update', 3, 'Qwen3-Next', 'Qwen3-Next', 0, 'success')
ON CONFLICT DO NOTHING;

