-- LeadFlow Dashboard Performance Optimizations
-- Run this SQL in Supabase SQL Editor to optimize dashboard queries

-- ============================================================================
-- 1. CREATE INDEXES FOR FREQUENTLY QUERIED COLUMNS
-- ============================================================================

-- Index for tasks table (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority ON tasks(project_id, priority) WHERE status IN ('ready', 'in_progress', 'blocked');
CREATE INDEX IF NOT EXISTS idx_tasks_project_agent ON tasks(project_id, agent_id) WHERE status = 'in_progress';

-- Index for agents table
CREATE INDEX IF NOT EXISTS idx_agents_project_status ON agents(project_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_project_name ON agents(project_id, agent_name);

-- Index for completed_work table
CREATE INDEX IF NOT EXISTS idx_completed_work_project_status_date ON completed_work(project_id, status, completed_date DESC);

-- Index for system_components table
CREATE INDEX IF NOT EXISTS idx_system_components_project_category ON system_components(project_id, category);

-- Index for action_items table
CREATE INDEX IF NOT EXISTS idx_action_items_project_status_priority ON action_items(project_id, status, priority) WHERE status != 'resolved';

-- Index for cost_tracking table
CREATE INDEX IF NOT EXISTS idx_cost_tracking_project_date ON cost_tracking(project_id, updated_date DESC);

-- ============================================================================
-- 2. CREATE OPTIMIZED VIEWS FOR DASHBOARD QUERIES
-- ============================================================================

-- View for dashboard KPIs (single query instead of multiple)
CREATE OR REPLACE VIEW dashboard_kpis AS
SELECT 
  p.project_id,
  p.overall_status,
  p.status_color,
  p.deadline_days,
  p.goal,
  COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END) as blocked_count,
  COUNT(DISTINCT CASE WHEN t.status = 'ready' THEN t.id END) as ready_count,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_count,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as done_count,
  COUNT(DISTINCT CASE WHEN a.status IN ('ACTIVE', 'Complete') THEN a.id END) as active_agents,
  COUNT(DISTINCT a.id) as total_agents
FROM project_metadata p
LEFT JOIN tasks t ON t.project_id = p.project_id
LEFT JOIN agents a ON a.project_id = p.project_id
GROUP BY p.project_id, p.overall_status, p.status_color, p.deadline_days, p.goal;

-- View for task queue summary
CREATE OR REPLACE VIEW task_queue_summary AS
SELECT 
  project_id,
  status,
  COUNT(*) as count,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', id,
      'title', title,
      'agent_id', agent_id,
      'model', model,
      'estimated_cost_usd', estimated_cost_usd,
      'priority', priority,
      'blocker_reason', blocker_reason
    ) ORDER BY priority
  ) FILTER (WHERE status IN ('ready', 'in_progress', 'blocked')) as tasks
FROM tasks
WHERE status IN ('ready', 'in_progress', 'blocked')
GROUP BY project_id, status;

-- View for agent activity summary
CREATE OR REPLACE VIEW agent_activity_summary AS
SELECT 
  project_id,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'agent_name', agent_name,
      'status', status,
      'agent_type', agent_type,
      'current_task', current_task,
      'progress_percent', progress_percent,
      'blocker', blocker
    ) ORDER BY agent_name
  ) as agents
FROM agents
GROUP BY project_id;

-- View for completed work summary
CREATE OR REPLACE VIEW completed_work_summary AS
SELECT 
  project_id,
  COUNT(*) as total_completed,
  COALESCE(SUM(hours_spent), 0) as total_hours,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'work_name', work_name,
      'use_case', use_case,
      'description', description,
      'hours_spent', hours_spent
    ) ORDER BY completed_date DESC
  ) FILTER (WHERE rn <= 10) as recent_work
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY completed_date DESC) as rn
  FROM completed_work
  WHERE status = 'COMPLETE'
) ranked
GROUP BY project_id;

-- ============================================================================
-- 3. CREATE FUNCTION FOR EFFICIENT DASHBOARD DATA FETCHING
-- ============================================================================

-- Single function to get all dashboard data in one call
CREATE OR REPLACE FUNCTION get_dashboard_data(p_project_id TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'project', (
      SELECT JSON_BUILD_OBJECT(
        'overall_status', overall_status,
        'status_color', status_color,
        'deadline_days', deadline_days,
        'goal', goal
      ) FROM project_metadata WHERE project_id = p_project_id
    ),
    'kpis', (
      SELECT JSON_BUILD_OBJECT(
        'blocked_count', COUNT(CASE WHEN status = 'blocked' THEN 1 END),
        'ready_count', COUNT(CASE WHEN status = 'ready' THEN 1 END),
        'in_progress_count', COUNT(CASE WHEN status = 'in_progress' THEN 1 END),
        'done_count', COUNT(CASE WHEN status = 'done' THEN 1 END)
      ) FROM tasks WHERE project_id = p_project_id
    ),
    'agents', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'agent_name', agent_name,
          'status', status,
          'agent_type', agent_type,
          'current_task', current_task,
          'progress_percent', progress_percent,
          'blocker', blocker
        ) ORDER BY agent_name
      ) FROM agents WHERE project_id = p_project_id
    ),
    'system_components', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'component_name', component_name,
          'status', status,
          'status_emoji', status_emoji,
          'details', details
        ) ORDER BY category
      ) FROM system_components WHERE project_id = p_project_id
    ),
    'recent_tasks', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'title', title,
          'status', status,
          'agent_id', agent_id,
          'model', model,
          'estimated_cost_usd', estimated_cost_usd
        ) ORDER BY priority
      ) FROM tasks 
      WHERE project_id = p_project_id 
      AND status IN ('ready', 'in_progress', 'blocked')
      LIMIT 20
    ),
    'completed_work', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'work_name', work_name,
          'use_case', use_case,
          'hours_spent', hours_spent
        ) ORDER BY completed_date DESC
      ) FROM completed_work 
      WHERE project_id = p_project_id 
      AND status = 'COMPLETE'
      LIMIT 10
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. ENABLE REAL-TIME FOR KEY TABLES (if not already enabled)
-- ============================================================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE completed_work;
ALTER PUBLICATION supabase_realtime ADD TABLE system_components;

-- ============================================================================
-- 5. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE tasks;
ANALYZE agents;
ANALYZE completed_work;
ANALYZE system_components;
ANALYZE project_metadata;
ANALYZE action_items;
ANALYZE cost_tracking;
