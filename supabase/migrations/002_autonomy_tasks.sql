-- Phase 2: 8/10 Autonomy - Task Management Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table for autonomous agent swarm
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Task identification
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT DEFAULT 'bo2026',
  
  -- Agent assignment
  agent_id TEXT CHECK (agent_id IN ('orchestrator', 'dev', 'marketing', 'design', 'qc', 'analytics')),
  model TEXT DEFAULT 'kimi', -- qwen, kimi, haiku, sonnet, opus
  
  -- Task state
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'ready', 'in_progress', 'review', 'done', 'blocked', 'failed')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=P0, 5=P4
  
  -- Cost tracking
  estimated_cost_usd DECIMAL(10,2) DEFAULT 0.00,
  actual_cost_usd DECIMAL(10,2) DEFAULT 0.00,
  estimated_hours DECIMAL(5,2) DEFAULT 1.00,
  
  -- Hierarchy and decomposition
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  decomposition_level INTEGER DEFAULT 0, -- 0=original, 1=subtask, etc.
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  
  -- Acceptance criteria (JSON array)
  acceptance_criteria JSONB DEFAULT '[]'::jsonb,
  
  -- Test results
  test_results JSONB DEFAULT NULL,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ready_at TIMESTAMP WITH TIME ZONE, -- When dependencies met
  started_at TIMESTAMP WITH TIME ZONE, -- When agent started
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Spawn configuration
  spawn_config JSONB DEFAULT NULL, -- Full spawn configuration
  session_key TEXT, -- OpenClaw session key
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Dependencies table (task A depends on task B)
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'hard' CHECK (dependency_type IN ('hard', 'soft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_task_id)
);

-- Outcomes table (for learning)
CREATE TABLE IF NOT EXISTS task_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT,
  model TEXT,
  complexity TEXT, -- simple, medium, complex
  success BOOLEAN,
  duration_minutes INTEGER,
  cost_usd DECIMAL(10,2),
  retry_count INTEGER,
  error_type TEXT, -- build_error, test_failure, timeout, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ready ON tasks(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_outcomes_agent_model ON task_outcomes(agent_id, model);
CREATE INDEX IF NOT EXISTS idx_outcomes_error ON task_outcomes(error_type) WHERE NOT success;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get tasks that are ready (all dependencies done)
CREATE OR REPLACE FUNCTION get_ready_tasks(p_project_id TEXT DEFAULT 'bo2026')
RETURNS TABLE (
  id UUID,
  title TEXT,
  agent_id TEXT,
  model TEXT,
  priority INTEGER,
  estimated_cost_usd DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.agent_id,
    t.model,
    t.priority,
    t.estimated_cost_usd
  FROM tasks t
  WHERE t.status = 'ready'
    AND t.project_id = p_project_id
    AND NOT EXISTS (
      -- Check if any dependencies are not done
      SELECT 1 FROM task_dependencies td
      JOIN tasks dep ON td.depends_on_task_id = dep.id
      WHERE td.task_id = t.id
        AND dep.status != 'done'
    )
  ORDER BY t.priority ASC, t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check and unblock tasks when a dependency completes
CREATE OR REPLACE FUNCTION check_unblocked_tasks(p_completed_task_id UUID)
RETURNS TABLE (unblocked_task_id UUID, task_title TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title
  FROM tasks t
  JOIN task_dependencies td ON t.id = td.task_id
  WHERE td.depends_on_task_id = p_completed_task_id
    AND t.status = 'blocked'
    AND NOT EXISTS (
      -- All other dependencies must be done
      SELECT 1 FROM task_dependencies td2
      JOIN tasks dep ON td2.depends_on_task_id = dep.id
      WHERE td2.task_id = t.id
        AND dep.status != 'done'
        AND td2.depends_on_task_id != p_completed_task_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to record outcome and update analytics
CREATE OR REPLACE FUNCTION record_task_outcome(
  p_task_id UUID,
  p_success BOOLEAN,
  p_duration_minutes INTEGER,
  p_cost_usd DECIMAL,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_agent_id TEXT;
  v_model TEXT;
  v_retry_count INTEGER;
BEGIN
  -- Get task info
  SELECT agent_id, model, retry_count 
  INTO v_agent_id, v_model, v_retry_count
  FROM tasks WHERE id = p_task_id;
  
  -- Insert outcome
  INSERT INTO task_outcomes (
    task_id, agent_id, model, success, 
    duration_minutes, cost_usd, retry_count, error_type
  ) VALUES (
    p_task_id, v_agent_id, v_model, p_success,
    p_duration_minutes, p_cost_usd, v_retry_count, p_error_type
  );
  
  -- Update task status
  UPDATE tasks 
  SET 
    status = CASE WHEN p_success THEN 'done' ELSE 'failed' END,
    completed_at = NOW(),
    actual_cost_usd = p_cost_usd
  WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze model performance
CREATE OR REPLACE FUNCTION analyze_model_performance()
RETURNS TABLE (
  agent_id TEXT,
  model TEXT,
  total_tasks BIGINT,
  successful_tasks BIGINT,
  success_rate DECIMAL,
  avg_cost_usd DECIMAL,
  avg_duration_minutes DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.agent_id,
    o.model,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE o.success) as successful_tasks,
    ROUND(COUNT(*) FILTER (WHERE o.success) * 100.0 / COUNT(*), 2) as success_rate,
    ROUND(AVG(o.cost_usd), 2) as avg_cost_usd,
    ROUND(AVG(o.duration_minutes), 2) as avg_duration_minutes
  FROM task_outcomes o
  WHERE o.created_at > NOW() - INTERVAL '30 days'
  GROUP BY o.agent_id, o.model
  ORDER BY success_rate DESC, avg_cost_usd ASC;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- Uncomment to insert test data
/*
INSERT INTO tasks (title, description, agent_id, model, status, priority, estimated_hours, acceptance_criteria) VALUES
('Test Database Integration', 'Verify task system works', 'dev', 'kimi', 'ready', 1, 1.0, '["Database connects", "Tasks table accessible"]'::jsonb),
('Create Landing Page Copy', 'Write marketing copy', 'marketing', 'kimi', 'backlog', 2, 2.0, '["Copy approved", "SEO optimized"]'::jsonb);

INSERT INTO task_dependencies (task_id, depends_on_task_id)
SELECT 
  (SELECT id FROM tasks WHERE title = 'Create Landing Page Copy'),
  (SELECT id FROM tasks WHERE title = 'Test Database Integration');
*/

-- Success message
SELECT 'Phase 2: 8/10 Task Management Schema Created Successfully!' as status;
