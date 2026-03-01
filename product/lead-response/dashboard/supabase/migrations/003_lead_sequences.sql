-- UC-8: Follow-up Sequences Schema
-- Created: 2026-02-25

-- ============================================
-- LEAD_SEQUENCES TABLE
-- ============================================
CREATE TABLE lead_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_type TEXT NOT NULL CHECK (sequence_type IN (
        'no_response',      -- 24h no response after initial contact
        'post_viewing',     -- 4h after booking/showing
        'no_show',          -- 30m after missed appointment
        'nurture'           -- 7d general nurture sequence
    )),
    step INTEGER NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 3),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',           -- Currently running
        'paused',           -- Lead responded, sequence paused
        'completed'         -- Max messages sent (step >= 3)
    )),
    last_sent_at TIMESTAMPTZ,
    next_send_at TIMESTAMPTZ,
    total_messages_sent INTEGER DEFAULT 0,
    max_messages INTEGER DEFAULT 3,
    
    -- Metadata
    trigger_reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lead_sequences IS 'Follow-up sequence state for automated SMS nurture';

-- Indexes for performance
CREATE INDEX idx_lead_sequences_lead_id ON lead_sequences(lead_id);
CREATE INDEX idx_lead_sequences_status ON lead_sequences(status);
CREATE INDEX idx_lead_sequences_next_send_at ON lead_sequences(next_send_at);
CREATE INDEX idx_lead_sequences_type_status ON lead_sequences(sequence_type, status);

-- Composite index for cron queries
CREATE INDEX idx_lead_sequences_cron_lookup ON lead_sequences(status, next_send_at)
    WHERE status = 'active';

-- Enable RLS
ALTER TABLE lead_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Agents can read sequences for their leads
CREATE POLICY "Agents can read their lead sequences" ON lead_sequences
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sequences.lead_id AND leads.agent_id::text = auth.uid()::text)
    );

-- RLS Policy: Agents can update sequences for their leads
CREATE POLICY "Agents can update their lead sequences" ON lead_sequences
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sequences.lead_id AND leads.agent_id::text = auth.uid()::text)
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_lead_sequences_updated_at BEFORE UPDATE ON lead_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to pause sequence when lead responds
CREATE OR REPLACE FUNCTION pause_sequence_on_response()
RETURNS TRIGGER AS $$
BEGIN
    -- If inbound message, pause all active sequences for this lead
    IF NEW.direction = 'inbound' THEN
        UPDATE lead_sequences
        SET 
            status = 'paused',
            updated_at = NOW()
        WHERE 
            lead_id = NEW.lead_id 
            AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to pause sequences on inbound message
CREATE TRIGGER pause_sequences_on_inbound_message
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.direction = 'inbound')
    EXECUTE FUNCTION pause_sequence_on_response();

-- Function to mark sequence as completed after 3 messages
CREATE OR REPLACE FUNCTION check_sequence_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_messages_sent >= NEW.max_messages THEN
        NEW.status := 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete sequence after max messages
CREATE TRIGGER check_sequence_completion_trigger
    BEFORE UPDATE ON lead_sequences
    FOR EACH ROW
    WHEN (NEW.total_messages_sent >= NEW.max_messages)
    EXECUTE FUNCTION check_sequence_completion();

-- ============================================
-- VIEWS
-- ============================================

-- View for active sequences needing attention
CREATE VIEW active_sequences_due AS
SELECT 
    ls.*,
    l.name as lead_name,
    l.phone as lead_phone,
    l.agent_id,
    l.status as lead_status,
    l.dnc,
    l.consent_sms
FROM lead_sequences ls
JOIN leads l ON l.id = ls.lead_id
WHERE 
    ls.status = 'active'
    AND ls.next_send_at <= NOW()
    AND l.dnc = false
    AND l.consent_sms = true
ORDER BY ls.next_send_at ASC;

COMMENT ON VIEW active_sequences_due IS 'Active sequences ready to send (used by cron)';

-- View for sequence analytics
CREATE VIEW sequence_analytics AS
SELECT 
    sequence_type,
    status,
    COUNT(*) as total,
    AVG(total_messages_sent) as avg_messages_sent,
    COUNT(*) FILTER (WHERE status = 'completed' AND total_messages_sent >= max_messages) as completed_sequences,
    COUNT(*) FILTER (WHERE status = 'paused') as paused_by_response
FROM lead_sequences
GROUP BY sequence_type, status;

COMMENT ON VIEW sequence_analytics IS 'Sequence performance metrics';
