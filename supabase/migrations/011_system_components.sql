-- Create system_components table for tracking deployed pages and services
-- This table is used by the auto-sync feature during heartbeat

CREATE TABLE IF NOT EXISTS system_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('web', 'api', 'service', 'health_check', 'database')),
  url TEXT,
  status TEXT NOT NULL DEFAULT 'built' CHECK (status IN ('built', 'live', 'stale', 'deprecated')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by type
CREATE INDEX IF NOT EXISTS idx_system_components_type ON system_components(type);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_system_components_status ON system_components(status);

-- Index for recently updated
CREATE INDEX IF NOT EXISTS idx_system_components_updated ON system_components(updated_at DESC);

-- Enable RLS
ALTER TABLE system_components ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage system_components" ON system_components
  FOR ALL USING (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE system_components IS 'Tracks deployed pages, APIs, and services with their URLs for health monitoring';
