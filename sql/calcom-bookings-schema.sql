-- ============================================
-- Cal.com Booking Integration Schema
-- LeadFlow Database Tables
-- ============================================

-- Table: bookings
-- Stores all booking data from Cal.com
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cal.com identifiers
    cal_booking_id BIGINT,
    cal_booking_uid VARCHAR(255) UNIQUE,
    cal_event_type_id BIGINT,
    cal_event_type_slug VARCHAR(255),
    
    -- Attendee information
    attendee_email VARCHAR(255) NOT NULL,
    attendee_name VARCHAR(255),
    attendee_phone VARCHAR(50),
    attendee_timezone VARCHAR(100),
    
    -- Booking details
    title VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'booked', -- booked, rescheduled, cancelled, completed, no_show
    
    -- Location/meeting details
    location VARCHAR(500),
    meeting_url VARCHAR(500),
    
    -- Linked records
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    source VARCHAR(100) DEFAULT 'cal.com',
    cancellation_reason TEXT,
    reschedule_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(attendee_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cal_uid ON bookings(cal_booking_uid);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Table: booking_activities
-- Audit log for all booking-related activities
CREATE TABLE IF NOT EXISTS booking_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    lead_email VARCHAR(255),
    lead_name VARCHAR(255),
    
    -- Activity details
    action VARCHAR(100) NOT NULL, -- booking_created, booking_rescheduled, booking_cancelled, meeting_completed, etc.
    action_by VARCHAR(255), -- 'system', 'attendee', 'agent', etc.
    
    -- Data snapshot
    previous_data JSONB,
    new_data JSONB,
    
    -- Additional metadata
    event_type_id BIGINT,
    event_type_slug VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for booking_activities
CREATE INDEX IF NOT EXISTS idx_booking_activities_booking_id ON booking_activities(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_activities_email ON booking_activities(lead_email);
CREATE INDEX IF NOT EXISTS idx_booking_activities_action ON booking_activities(action);
CREATE INDEX IF NOT EXISTS idx_booking_activities_created_at ON booking_activities(created_at);

-- Table: agent_booking_configs
-- Per-agent booking configuration and links
CREATE TABLE IF NOT EXISTS agent_booking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to agent
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Cal.com settings
    cal_username VARCHAR(255),
    cal_event_type_id BIGINT,
    cal_event_type_slug VARCHAR(255),
    
    -- Booking link
    booking_url VARCHAR(500),
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    auto_confirmation BOOLEAN DEFAULT false,
    buffer_time_minutes INTEGER DEFAULT 15,
    minimum_notice_hours INTEGER DEFAULT 24,
    
    -- Notifications
    send_sms_confirmation BOOLEAN DEFAULT true,
    send_email_confirmation BOOLEAN DEFAULT true,
    send_reminder_sms BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(agent_id, cal_event_type_id)
);

-- Indexes for agent_booking_configs
CREATE INDEX IF NOT EXISTS idx_agent_booking_configs_agent_id ON agent_booking_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_booking_configs_active ON agent_booking_configs(is_active);

-- Table: booking_reminders
-- Tracks sent reminders for bookings
CREATE TABLE IF NOT EXISTS booking_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'push'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
    
    -- Content
    message_content TEXT,
    
    -- Results
    delivery_status VARCHAR(100),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for booking_reminders
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id ON booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status ON booking_reminders(status);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled ON booking_reminders(scheduled_for);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for agent_booking_configs
DROP TRIGGER IF EXISTS update_agent_booking_configs_updated_at ON agent_booking_configs;
CREATE TRIGGER update_agent_booking_configs_updated_at
    BEFORE UPDATE ON agent_booking_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views
-- ============================================

-- View: upcoming_bookings
-- Shows all upcoming bookings with lead and agent info
CREATE OR REPLACE VIEW upcoming_bookings AS
SELECT 
    b.id,
    b.cal_booking_uid,
    b.attendee_email,
    b.attendee_name,
    b.attendee_phone,
    b.title,
    b.start_time,
    b.end_time,
    b.status,
    b.location,
    b.meeting_url,
    b.metadata,
    b.lead_id,
    b.agent_id,
    a.name as agent_name,
    a.email as agent_email,
    abc.booking_url as agent_booking_url
FROM bookings b
LEFT JOIN agents a ON b.agent_id = a.id
LEFT JOIN agent_booking_configs abc ON b.agent_id = abc.agent_id AND abc.is_active = true
WHERE b.start_time > CURRENT_TIMESTAMP
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
ORDER BY b.start_time ASC;

-- View: booking_stats_daily
-- Daily booking statistics
CREATE OR REPLACE VIEW booking_stats_daily AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'booked') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'rescheduled') as rescheduled_bookings,
    COUNT(DISTINCT attendee_email) as unique_attendees
FROM bookings
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_booking_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can view their own bookings
CREATE POLICY agent_view_bookings ON bookings
    FOR SELECT
    USING (agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
    ));

-- Policy: Service role can manage all bookings
CREATE POLICY service_manage_bookings ON bookings
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Agents can view their own booking activities
CREATE POLICY agent_view_booking_activities ON booking_activities
    FOR SELECT
    USING (booking_id IN (
        SELECT id FROM bookings WHERE agent_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    ));

-- Policy: Service role can manage booking activities
CREATE POLICY service_manage_booking_activities ON booking_activities
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Agents can manage their own booking configs
CREATE POLICY agent_manage_booking_configs ON agent_booking_configs
    FOR ALL
    USING (agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
    ));

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE bookings IS 'Stores all Cal.com booking data synced via webhooks';
COMMENT ON TABLE booking_activities IS 'Audit log of all booking-related activities';
COMMENT ON TABLE agent_booking_configs IS 'Per-agent booking configuration and Cal.com integration settings';
COMMENT ON TABLE booking_reminders IS 'Tracks scheduled and sent reminders for bookings';
