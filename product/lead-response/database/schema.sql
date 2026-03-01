-- AI Lead Response System - Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    calcom_username TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    
    -- Lead info
    name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    
    -- Source tracking
    source TEXT NOT NULL, -- 'zillow', 'webform', 'manual'
    source_metadata JSONB, -- Original payload
    
    -- Status
    status TEXT DEFAULT 'new', -- 'new', 'qualified', 'contacted', 'booked', 'closed'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

-- AI Qualifications table
CREATE TABLE qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- AI analysis
    intent TEXT, -- 'buy', 'sell', 'rent', 'info'
    budget_min INTEGER,
    budget_max INTEGER,
    timeline TEXT, -- 'immediate', '1-3months', '3-6months', '6+months'
    location TEXT,
    property_type TEXT, -- 'house', 'condo', 'land', 'commercial'
    bedrooms INTEGER,
    
    -- AI metadata
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    raw_response JSONB, -- Full Claude response
    model_used TEXT DEFAULT 'claude-3-5-sonnet-20241022',
    
    -- Qualification result
    is_qualified BOOLEAN DEFAULT false,
    qualification_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table (SMS history)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Message details
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    message_body TEXT NOT NULL,
    
    -- Twilio metadata
    twilio_sid TEXT UNIQUE,
    twilio_status TEXT, -- 'queued', 'sent', 'delivered', 'failed'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Response templates
CREATE TABLE response_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    
    name TEXT NOT NULL,
    trigger_condition TEXT, -- 'qualified', 'not_qualified', 'follow_up'
    template_body TEXT NOT NULL,
    
    -- Variables supported: {name}, {agent_name}, {booking_link}, {location}
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics / Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- 'lead_received', 'ai_qualified', 'sms_sent', 'booking_created'
    event_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_leads_agent_id ON leads(agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_phone ON leads(phone);

CREATE INDEX idx_qualifications_lead_id ON qualifications(lead_id);
CREATE INDEX idx_qualifications_is_qualified ON qualifications(is_qualified);

CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

CREATE INDEX idx_events_lead_id ON events(lead_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (agents can only see their own data)
CREATE POLICY "Agents can view own data" ON leads
    FOR SELECT USING (auth.uid()::text = agent_id::text);

CREATE POLICY "Agents can view own qualifications" ON qualifications
    FOR SELECT USING (
        lead_id IN (SELECT id FROM leads WHERE agent_id::text = auth.uid()::text)
    );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON response_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data (example agent)
INSERT INTO agents (email, name, phone, calcom_username) VALUES
    ('agent@example.com', 'Demo Agent', '+15555551234', 'demo-agent');

-- Pilot signups table (for landing page leads)
CREATE TABLE pilot_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contact info
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Business info
    brokerage_name TEXT,
    team_name TEXT,
    
    -- Lead volume
    monthly_leads TEXT, -- '1-10', '11-50', '51-100', '100+'
    
    -- Current tools
    current_crm TEXT, -- 'follow_up_boss', 'liondesk', 'kvcore', 'other', 'none'
    
    -- Status tracking
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'approved', 'declined'
    
    -- Marketing attribution
    source TEXT DEFAULT 'landing_page', -- where they signed up from
    utm_campaign TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    contacted_at TIMESTAMPTZ
);

CREATE INDEX idx_pilot_signups_email ON pilot_signups(email);
CREATE INDEX idx_pilot_signups_status ON pilot_signups(status);
CREATE INDEX idx_pilot_signups_created_at ON pilot_signups(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_pilot_signups_updated_at BEFORE UPDATE ON pilot_signups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed response templates
INSERT INTO response_templates (agent_id, name, trigger_condition, template_body) VALUES
    (
        (SELECT id FROM agents LIMIT 1),
        'Qualified Lead Response',
        'qualified',
        'Hi {name}! Thanks for your interest in {location} real estate. I''d love to help you find the perfect property. Book a quick call with me: {booking_link}'
    ),
    (
        (SELECT id FROM agents LIMIT 1),
        'Not Qualified Response',
        'not_qualified',
        'Hi {name}! Thanks for reaching out. I''ll review your inquiry and get back to you within 24 hours.'
    );
