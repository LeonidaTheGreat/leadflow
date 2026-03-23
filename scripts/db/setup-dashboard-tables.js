#!/usr/bin/env node
/**
 * Execute dashboard schema updates
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const sql = `
-- Add tables for dashboard.html full Supabase integration

-- Model Performance
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL,
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

-- Extend agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_completed INT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tasks_total INT DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS avg_quality NUMERIC(3,1);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_tokens INT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS recommended_model VARCHAR(50);

-- Roadmap Phases
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  date_range VARCHAR(100),
  progress_percent INT DEFAULT 0,
  target VARCHAR(255),
  display_order INT DEFAULT 0,
  UNIQUE(project_id, phase_number)
);

-- Roadmap Tasks
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  hours DECIMAL(5,1),
  display_order INT DEFAULT 0
);

-- Model Selection Log
CREATE TABLE IF NOT EXISTS model_selection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  task_name VARCHAR(255),
  complexity INT,
  initial_model VARCHAR(50),
  final_model VARCHAR(50),
  escalations INT DEFAULT 0,
  result VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO model_performance (project_id, model_name, success_rate_percent, tasks_count, cost_per_task_usd, avg_quality_rating, avg_tokens, total_cost_usd)
VALUES 
  ('bo2026', 'Qwen3-Next', 85, 12, 0, 4.0, 35000, 0),
  ('bo2026', 'Haiku', 92, 5, 0.50, 4.2, 28000, 0.12),
  ('bo2026', 'Sonnet', 95, 3, 2.00, 4.5, 42000, 1.35),
  ('bo2026', 'Kimi', 88, 8, 0.30, 4.1, 38000, 0.45)
ON CONFLICT (project_id, model_name) DO UPDATE SET
  success_rate_percent = EXCLUDED.success_rate_percent,
  tasks_count = EXCLUDED.tasks_count;

INSERT INTO roadmap_phases (project_id, phase_number, title, status, date_range, progress_percent, target, display_order)
VALUES 
  ('bo2026', 1, 'Phase 1: MVP Launch', 'active', 'Days 7-14', 80, '5 pilots active by Feb 28', 1),
  ('bo2026', 2, 'Phase 2: First Revenue', 'pending', 'Days 15-21', 0, 'First paying customer', 2),
  ('bo2026', 3, 'Phase 3: Scale', 'pending', 'Days 22-35', 0, '15 customers = $10-12K MRR', 3),
  ('bo2026', 4, 'Phase 4: $20K MRR', 'pending', 'Days 36-60', 0, '25 customers = $20,000+ MRR', 4)
ON CONFLICT (project_id, phase_number) DO UPDATE SET
  status = EXCLUDED.status,
  progress_percent = EXCLUDED.progress_percent;

INSERT INTO model_selection_log (project_id, task_name, complexity, initial_model, final_model, escalations, result)
VALUES 
  ('bo2026', 'Spawn orchestrator', 5, 'Qwen3-Next', 'Qwen3-Next', 0, 'success'),
  ('bo2026', 'Fix outbound storage', 6, 'Qwen3-Next', 'Sonnet', 1, 'success'),
  ('bo2026', 'Dashboard update', 3, 'Qwen3-Next', 'Qwen3-Next', 0, 'success');
`;

async function run() {
  console.log('🔄 Creating dashboard tables...\n');
  
  // We need to use raw SQL, but Supabase JS doesn't support multi-statement
  // So we'll run each statement separately
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    const cleanStmt = stmt.trim();
    if (!cleanStmt || cleanStmt.startsWith('--')) continue;
    
    const { error } = await supabase.rpc('exec_sql', { sql: cleanStmt + ';' });
    if (error && !error.message.includes('already exists')) {
      console.log(`⚠️ ${error.message.substring(0, 80)}`);
    }
  }
  
  console.log('✅ Tables created/updated');
  console.log('\nInserting data...');
  
  // Insert model performance
  const models = [
    { model_name: 'Qwen3-Next', success_rate_percent: 85, tasks_count: 12, cost_per_task_usd: 0, avg_quality_rating: 4.0, avg_tokens: 35000, total_cost_usd: 0 },
    { model_name: 'Haiku', success_rate_percent: 92, tasks_count: 5, cost_per_task_usd: 0.50, avg_quality_rating: 4.2, avg_tokens: 28000, total_cost_usd: 0.12 },
    { model_name: 'Sonnet', success_rate_percent: 95, tasks_count: 3, cost_per_task_usd: 2.00, avg_quality_rating: 4.5, avg_tokens: 42000, total_cost_usd: 1.35 },
    { model_name: 'Kimi', success_rate_percent: 88, tasks_count: 8, cost_per_task_usd: 0.30, avg_quality_rating: 4.1, avg_tokens: 38000, total_cost_usd: 0.45 }
  ];
  
  for (const m of models) {
    const { error } = await supabase.from('model_performance').upsert({
      project_id: 'bo2026',
      ...m
    }, { onConflict: 'project_id,model_name' });
    if (error) console.log(`Model ${m.model_name}: ${error.message}`);
  }
  
  console.log('✅ Data inserted');
}

run().catch(console.error);
