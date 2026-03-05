-- Fix agents table schema collision
-- Rename product agents table to real_estate_agents to avoid conflict with orchestrator agents table

-- First, check if the agents table exists and has product data (not orchestrator data)
-- We'll determine this by checking if it has product-specific columns

-- Create new table with proper structure for real estate agents
CREATE TABLE IF NOT EXISTS real_estate_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  state TEXT,
  status TEXT DEFAULT 'onboarding',
  timezone TEXT DEFAULT 'America/New_York',
  email_verified BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  plan_tier TEXT,
  mrr INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_email ON real_estate_agents(email);
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_status ON real_estate_agents(status);

-- Enable RLS
ALTER TABLE real_estate_agents ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage real_estate_agents" ON real_estate_agents
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own agent data" ON real_estate_agents
  FOR SELECT USING (auth.uid() = id);

-- Migrate data from agents table if it exists and has the right structure
-- Only migrate if the agents table has password_hash (product data, not orchestrator)
DO $$
BEGIN
  -- Check if agents table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    -- Check if it has password_hash column (indicates product table, not orchestrator)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'password_hash') THEN
      -- Migrate data
      INSERT INTO real_estate_agents (
        id, email, password_hash, first_name, last_name, phone_number, 
        state, status, timezone, email_verified, stripe_customer_id,
        subscription_status, plan_tier, mrr, created_at, updated_at, last_login_at
      )
      SELECT 
        id, email, password_hash, first_name, last_name, phone_number,
        state, status, timezone, email_verified, stripe_customer_id,
        subscription_status, plan_tier, mrr, created_at, updated_at, last_login_at
      FROM agents
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Migrated data from agents to real_estate_agents';
    END IF;
  END IF;
END $$;

-- Update related tables to use new foreign key reference
-- Note: agent_integrations and agent_settings tables need to be updated
-- We'll create new versions of these tables with proper references

-- Create agent_integrations_v2 table
CREATE TABLE IF NOT EXISTS agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  cal_com_link TEXT,
  twilio_phone_number TEXT,
  follow_up_boss_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_integrations_agent_id ON agent_integrations(agent_id);

-- Create agent_settings table
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  auto_response_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_settings_agent_id ON agent_settings(agent_id);

-- Enable RLS on new tables
ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

-- Policies for agent_integrations
CREATE POLICY "Service role can manage agent_integrations" ON agent_integrations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage own integrations" ON agent_integrations
  FOR ALL USING (auth.uid() = agent_id);

-- Policies for agent_settings
CREATE POLICY "Service role can manage agent_settings" ON agent_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage own settings" ON agent_settings
  FOR ALL USING (auth.uid() = agent_id);

-- Migrate data from old tables if they exist
DO $$
BEGIN
  -- Migrate agent_integrations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_integrations') THEN
    INSERT INTO agent_integrations (agent_id, cal_com_link, twilio_phone_number, created_at)
    SELECT agent_id, cal_com_link, twilio_phone_number, created_at
    FROM agent_integrations
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Migrated agent_integrations data';
  END IF;
  
  -- Migrate agent_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_settings') THEN
    INSERT INTO agent_settings (agent_id, auto_response_enabled, sms_enabled, email_notifications, created_at)
    SELECT agent_id, auto_response_enabled, sms_enabled, email_notifications, created_at
    FROM agent_settings
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Migrated agent_settings data';
  END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE real_estate_agents IS 'Real estate agent accounts (customers) - renamed from agents to avoid collision with orchestrator agents table';
