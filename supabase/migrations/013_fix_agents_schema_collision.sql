-- Migration: Fix agents table schema collision
-- Creates real_estate_agents table and migrates data from agents table
-- Also creates supporting tables for integrations and settings

-- Create real_estate_agents table (renamed from agents to avoid collision with orchestrator's agents table)
CREATE TABLE IF NOT EXISTS real_estate_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  market TEXT DEFAULT 'us-national',
  email_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  plan_tier TEXT DEFAULT 'free',
  mrr DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_integrations table for Twilio, Cal.com, FUB settings
CREATE TABLE IF NOT EXISTS agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'twilio', 'calcom', 'fub'
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, integration_type)
);

-- Create agent_settings table for SMS/email preferences
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, setting_key)
);

-- Migrate data from agents table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    INSERT INTO real_estate_agents (
      id, email, password_hash, first_name, last_name, phone, market,
      email_verified, stripe_customer_id, plan_tier, mrr, created_at, updated_at
    )
    SELECT 
      id, email, password_hash, first_name, last_name, phone, COALESCE(market, 'us-national'),
      email_verified, stripe_customer_id, plan_tier, COALESCE(mrr, 0), created_at, updated_at
    FROM agents
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_email ON real_estate_agents(email);
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_stripe_customer ON real_estate_agents(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_integrations_agent ON agent_integrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_settings_agent ON agent_settings(agent_id);

-- Enable Row Level Security
ALTER TABLE real_estate_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for real_estate_agents
CREATE POLICY "Service role can manage real_estate_agents"
  ON real_estate_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agents can view own record"
  ON real_estate_agents
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create RLS policies for agent_integrations
CREATE POLICY "Service role can manage agent_integrations"
  ON agent_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agents can manage own integrations"
  ON agent_integrations
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid());

-- Create RLS policies for agent_settings
CREATE POLICY "Service role can manage agent_settings"
  ON agent_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agents can manage own settings"
  ON agent_settings
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid());

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_real_estate_agents_updated_at
  BEFORE UPDATE ON real_estate_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_integrations_updated_at
  BEFORE UPDATE ON agent_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
