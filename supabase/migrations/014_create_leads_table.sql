-- Create leads table for storing FUB webhook leads
-- This table stores all leads received from Follow Up Boss

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fub_id TEXT UNIQUE,
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'fub_webhook',
  source_metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'new',
  market TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  timeline TEXT,
  location TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  urgency_score INTEGER,
  consent_sms BOOLEAN DEFAULT false,
  consent_email BOOLEAN DEFAULT false,
  dnc BOOLEAN DEFAULT false,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_fub_id ON leads(fub_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');

-- Allow agents to read their own leads
CREATE POLICY "Agents can read own leads" ON leads
  FOR SELECT USING (auth.uid() = agent_id);

-- Allow agents to update their own leads
CREATE POLICY "Agents can update own leads" ON leads
  FOR UPDATE USING (auth.uid() = agent_id);

-- Comment for documentation
COMMENT ON TABLE leads IS 'Real estate leads received from FUB webhook and other sources';
