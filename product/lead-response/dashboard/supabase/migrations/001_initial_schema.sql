-- AI Lead Response System - Initial Schema
-- Created: 2026-02-16

-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO '';

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    fub_id TEXT,
    calcom_username TEXT,
    timezone TEXT DEFAULT 'America/Toronto',
    market TEXT DEFAULT 'ca-ontario' CHECK (market IN ('ca-ontario', 'us-national')),
    settings JSONB DEFAULT '{
        "auto_respond": true,
        "response_delay_seconds": 0,
        "human_handoff_threshold": 0.6,
        "booking_enabled": true
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agents IS 'Real estate agents using the system';

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fub_id TEXT,
    agent_id UUID REFERENCES agents(id),
    name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    source TEXT NOT NULL,
    source_metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new', 'qualified', 'nurturing', 'appointment', 'responded', 'closed', 'dnc', 'spam'
    )),
    market TEXT DEFAULT 'ca-ontario' CHECK (market IN ('ca-ontario', 'us-national')),
    consent_sms BOOLEAN DEFAULT false,
    consent_email BOOLEAN DEFAULT false,
    dnc BOOLEAN DEFAULT false,
    budget_min INTEGER,
    budget_max INTEGER,
    timeline TEXT,
    location TEXT,
    property_type TEXT,
    urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 10),
    last_contact_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE leads IS 'Real estate leads from various sources';

-- Indexes for leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_agent_id ON leads(agent_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_fub_id ON leads(fub_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- QUALIFICATIONS TABLE
-- ============================================
CREATE TABLE qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    intent TEXT CHECK (intent IN ('buy', 'sell', 'rent', 'info', 'unknown')),
    budget_min INTEGER,
    budget_max INTEGER,
    timeline TEXT CHECK (timeline IN ('immediate', '1-3months', '3-6months', '6+months', 'unknown')),
    location TEXT,
    property_type TEXT CHECK (property_type IN ('house', 'condo', 'land', 'commercial', 'unknown')),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    notes TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    is_qualified BOOLEAN DEFAULT false,
    qualification_reason TEXT,
    model_used TEXT DEFAULT 'claude-3-5-sonnet-20241022',
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE qualifications IS 'AI-generated lead qualification data';

CREATE INDEX idx_qualifications_lead_id ON qualifications(lead_id);
CREATE INDEX idx_qualifications_is_qualified ON qualifications(is_qualified);

-- ============================================
-- MESSAGES TABLE (SMS/Conversation History)
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'voice', 'email', 'web', 'fub')),
    message_body TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2),
    ai_prompt_tokens INTEGER,
    ai_completion_tokens INTEGER,
    
    -- Twilio fields
    twilio_sid TEXT,
    twilio_status TEXT,
    twilio_error_code TEXT,
    twilio_error_message TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'All messages (SMS, voice transcripts, etc.)';

CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_twilio_sid ON messages(twilio_sid);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- EVENTS TABLE (Audit Trail)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    source TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE events IS 'Audit trail for all system events';

CREATE INDEX idx_events_lead_id ON events(lead_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    calcom_booking_id TEXT,
    calcom_event_type_id TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    meeting_link TEXT,
    location TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bookings IS 'Appointment bookings via Cal.com';

CREATE INDEX idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- TEMPLATES TABLE (SMS Templates)
-- ============================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('initial', 'followup', 'nurture', 'booking', 'handoff', 'reengagement')),
    market TEXT DEFAULT 'ca-ontario' CHECK (market IN ('ca-ontario', 'us-national')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE templates IS 'SMS message templates by category';

-- Insert default templates
INSERT INTO templates (name, category, market, content, variables) VALUES
('Initial Response - CA', 'initial', 'ca-ontario', 
 'Hi {{name}}, I''m {{agent_name}}, a real estate agent. I have properties matching your interests in {{location}}. Reply YES to see options or book a call: {{booking_link}} Reply STOP to opt out.',
 '["name", "agent_name", "location", "booking_link"]'),
('Initial Response - US', 'initial', 'us-national',
 'Hi {{name}}, I''m {{agent_name}}, your realtor. I found properties matching your search in {{location}}. Reply YES for options or book here: {{booking_link}} Reply STOP to opt out.',
 '["name", "agent_name", "location", "booking_link"]'),
('Follow-up', 'followup',
 'ca-ontario', 'Hi {{name}}, just following up on your home search. Still looking in {{location}}? I have new listings to share. Reply YES or book: {{booking_link}}',
 '["name", "location", "booking_link"]'),
('Booking Confirmation', 'booking',
 'ca-ontario', 'Confirmed! Your showing is scheduled for {{date}} at {{time}}. Address: {{address}}. Questions? Call {{agent_phone}}',
 '["date", "time", "address", "agent_phone"]'),
('Re-engagement', 'reengagement',
 'ca-ontario', 'Hi {{name}}, it''s been a while! Are you still interested in {{location}}? The market has shifted - let''s chat: {{booking_link}}',
 '["name", "location", "booking_link"]');

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Agents: Users can read their own agent record
CREATE POLICY "Agents can read own record" ON agents
    FOR SELECT USING (auth.uid()::text = id::text);

-- Leads: Agents can CRUD leads assigned to them
CREATE POLICY "Agents can manage their leads" ON leads
    FOR ALL USING (auth.uid()::text = agent_id::text);

-- Messages: Agents can read messages for their leads
CREATE POLICY "Agents can read their lead messages" ON messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM leads WHERE leads.id = messages.lead_id AND leads.agent_id::text = auth.uid()::text)
    );

-- Qualifications: Agents can read qualifications for their leads
CREATE POLICY "Agents can read their lead qualifications" ON qualifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM leads WHERE leads.id = qualifications.lead_id AND leads.agent_id::text = auth.uid()::text)
    );

-- Bookings: Agents can manage bookings for their leads
CREATE POLICY "Agents can manage their bookings" ON bookings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM leads WHERE leads.id = bookings.lead_id AND leads.agent_id::text = auth.uid()::text)
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update lead status on new message
CREATE OR REPLACE FUNCTION update_lead_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads SET
        last_contact_at = NOW(),
        updated_at = NOW(),
        status = CASE 
            WHEN NEW.direction = 'outbound' AND NEW.status = 'delivered' THEN 'responded'
            ELSE leads.status
        END
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_on_message_trigger AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_lead_on_message();

-- ============================================
-- VIEWS
-- ============================================

-- Lead summary view with latest qualification
CREATE VIEW lead_summary AS
SELECT 
    l.*,
    q.intent,
    q.budget_min,
    q.budget_max,
    q.timeline,
    q.location as qual_location,
    q.confidence_score,
    q.is_qualified,
    m_last.message_body as last_message,
    m_last.created_at as last_message_at,
    m_out.created_at as last_outbound_at,
    COUNT(m.id) as message_count
FROM leads l
LEFT JOIN qualifications q ON q.lead_id = l.id AND q.id = (
    SELECT id FROM qualifications WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN messages m ON m.lead_id = l.id
LEFT JOIN messages m_last ON m_last.id = (
    SELECT id FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN messages m_out ON m_out.id = (
    SELECT id FROM messages WHERE lead_id = l.id AND direction = 'outbound' ORDER BY created_at DESC LIMIT 1
)
GROUP BY l.id, q.intent, q.budget_min, q.budget_max, q.timeline, q.location, 
         q.confidence_score, q.is_qualified, m_last.message_body, m_last.created_at, m_out.created_at;

-- Dashboard stats view
CREATE VIEW dashboard_stats AS
SELECT
    agent_id,
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
    COUNT(*) FILTER (WHERE status = 'responded') as responded_leads,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as leads_today,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as leads_this_week,
    AVG(urgency_score) as avg_urgency,
    COUNT(*) as total_leads
FROM leads
WHERE agent_id IS NOT NULL
GROUP BY agent_id;
