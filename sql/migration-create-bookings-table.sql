-- ============================================
-- Migration: Create bookings table
-- Fixes: bookings table does not exist — booking conversion always null
-- 
-- Column names unified across:
--   - TypeScript Booking interface (lib/types/index.ts)
--   - Dashboard webhook (product/lead-response/dashboard/app/api/webhook/calcom/route.ts)
--   - Root webhook handler (lib/calcom-webhook-handler.js)
-- ============================================

-- Table: bookings
-- Stores all booking data from Cal.com webhooks
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cal.com identifiers (VARCHAR to match webhook stringification)
    calcom_booking_id VARCHAR(255),
    cal_booking_uid VARCHAR(255) UNIQUE, -- used for upsert dedup in root webhook handler
    calcom_event_type_id VARCHAR(255),

    -- Booking details
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed', -- pending, confirmed, rescheduled, cancelled, completed, no_show

    -- Location/meeting details
    meeting_link VARCHAR(500),              -- Cal.com video call URL
    location VARCHAR(500),                 -- physical or virtual location

    -- Notes/description from booking
    notes TEXT,

    -- Attendee info (denormalized for quick access)
    attendee_email VARCHAR(255),
    attendee_name VARCHAR(255),
    title VARCHAR(500),

    -- Linked records (no FK constraints — matches leads table convention)
    lead_id UUID,                          -- references leads.id
    agent_id UUID,                         -- references real_estate_agents.id

    -- Cancellation/completion tracking
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    reschedule_count INTEGER DEFAULT 0,

    -- Metadata (raw Cal.com payload)
    metadata JSONB DEFAULT '{}',
    source VARCHAR(100) DEFAULT 'cal.com',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_calcom_id ON bookings(calcom_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cal_uid ON bookings(cal_booking_uid);
CREATE INDEX IF NOT EXISTS idx_bookings_attendee_email ON bookings(attendee_email);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_updated_at();

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Service role can manage all bookings (webhooks, analytics)
DROP POLICY IF EXISTS service_manage_bookings ON bookings;
CREATE POLICY service_manage_bookings ON bookings
    FOR ALL
    USING (auth.role() = 'service_role');

-- Note: agent-level RLS deferred until real_estate_agents gets a user_id column

COMMENT ON TABLE bookings IS 'Cal.com bookings stored via webhook. Column names match TypeScript Booking interface.';
COMMENT ON COLUMN bookings.calcom_booking_id IS 'Cal.com booking ID as string (from webhook payload bookingId)';
COMMENT ON COLUMN bookings.cal_booking_uid IS 'Cal.com booking UID — used for upsert deduplication in root webhook handler';
COMMENT ON COLUMN bookings.calcom_event_type_id IS 'Cal.com event type ID as string (from webhook payload eventTypeId)';
COMMENT ON COLUMN bookings.lead_id IS 'Linked lead — looked up by attendee email/phone at webhook time; may be null if lead not found';
COMMENT ON COLUMN bookings.agent_id IS 'Linked real_estate_agents.id — may be null if agent not determined from event type';
