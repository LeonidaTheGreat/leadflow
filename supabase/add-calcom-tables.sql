-- Add booking_activities table for Cal.com integration
-- Tracks all booking-related activities

CREATE TABLE IF NOT EXISTS booking_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email VARCHAR(255) NOT NULL,
  lead_name VARCHAR(255),
  booking_uid VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL, -- booking_created, booking_rescheduled, booking_cancelled, meeting_completed
  event_type_id INTEGER,
  event_type_slug VARCHAR(255),
  start_time TIMESTAMP,
  status VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_activities_lead_email ON booking_activities(lead_email);
CREATE INDEX IF NOT EXISTS idx_booking_activities_booking_uid ON booking_activities(booking_uid);
CREATE INDEX IF NOT EXISTS idx_booking_activities_action ON booking_activities(action);
CREATE INDEX IF NOT EXISTS idx_booking_activities_created_at ON booking_activities(created_at DESC);

-- Add booking fields to leads table if not exists
-- Note: Uses metadata JSONB to avoid schema changes

-- Add comment explaining the metadata fields used for bookings
COMMENT ON TABLE leads IS 'Lead information with booking metadata stored in metadata JSONB: booking_uid, booking_id, event_type_id, event_type_slug, booking_start_time, booking_end_time, booking_source, last_action';

-- Add Cal.com configuration to system_components
INSERT INTO system_components (project_id, component_name, category, status, status_emoji, details, verified_date)
VALUES 
  ('bo2026', 'Cal.com Integration', 'INTEGRATION', 'READY', '✅', 'Booking links, webhooks, and lead status updates', NOW())
ON CONFLICT (project_id, component_name) DO UPDATE SET
  status = 'READY',
  status_emoji = '✅',
  details = 'Booking links, webhooks, and lead status updates',
  verified_date = NOW();