-- Migration 008: pilot recruitment campaign tracking
-- Creates tables to track outreach campaigns for the 30 pilots in 30 days goal
-- Channels: Facebook, Reddit, LinkedIn

-- DOWN
DROP TABLE IF EXISTS pilot_recruitment_touchpoints CASCADE;
DROP TABLE IF EXISTS pilot_recruitment_targets CASCADE;
DROP TABLE IF EXISTS pilot_recruitment_campaigns CASCADE;

-- UP
-- Campaigns table - tracks each recruitment campaign
CREATE TABLE IF NOT EXISTS pilot_recruitment_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_count INTEGER NOT NULL DEFAULT 30,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    utm_campaign VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Targets table - individual agents being recruited
CREATE TABLE IF NOT EXISTS pilot_recruitment_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES pilot_recruitment_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    brokerage VARCHAR(255),
    social_profile_url TEXT,
    source_channel VARCHAR(50) NOT NULL CHECK (source_channel IN ('facebook', 'reddit', 'linkedin', 'instagram', 'twitter', 'email', 'referral', 'other')),
    status VARCHAR(50) NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'contacted', 'responded', 'scheduled', 'signed_up', 'declined', 'nurture')),
    notes TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Touchpoints table - each outreach interaction
CREATE TABLE IF NOT EXISTS pilot_recruitment_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES pilot_recruitment_targets(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('facebook', 'reddit', 'linkedin', 'instagram', 'twitter', 'email', 'phone', 'calcom', 'other')),
    touch_type VARCHAR(50) NOT NULL CHECK (touch_type IN ('initial', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'response', 'demo', 'reminder')),
    message_template TEXT,
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    response_notes TEXT,
    calcom_booking_id VARCHAR(255),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_content VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON pilot_recruitment_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_targets_campaign ON pilot_recruitment_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_targets_status ON pilot_recruitment_targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_channel ON pilot_recruitment_targets(source_channel);
CREATE INDEX IF NOT EXISTS idx_touchpoints_target ON pilot_recruitment_touchpoints(target_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_channel ON pilot_recruitment_touchpoints(channel);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON pilot_recruitment_campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON pilot_recruitment_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_targets_updated_at ON pilot_recruitment_targets;
CREATE TRIGGER update_targets_updated_at
    BEFORE UPDATE ON pilot_recruitment_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial campaign for 30 pilots in 30 days (if not exists)
INSERT INTO pilot_recruitment_campaigns (name, description, goal_count, start_date, end_date, status, utm_campaign)
SELECT 
    '30 Pilots in 30 Days',
    'Emergency recruitment campaign to onboard 30 real estate agent pilots in 30 days via Facebook, Reddit, and LinkedIn outreach',
    30,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'active',
    'pilot_recruitment_30_30'
WHERE NOT EXISTS (
    SELECT 1 FROM pilot_recruitment_campaigns WHERE name = '30 Pilots in 30 Days'
);

-- Insert seed targets based on existing research (if not exists)
INSERT INTO pilot_recruitment_targets (campaign_id, name, email, location, brokerage, source_channel, status, notes, priority)
SELECT 
    c.id,
    'Sarah Mitchell',
    'sarah@sarahmitchellrealestate.com',
    'Phoenix, AZ',
    'Independent',
    'facebook',
    'identified',
    'Uses FUB, active on Instagram @sarahsellsaz, posted about wanting to clone herself for lead response. ~18 transactions/year.',
    1
FROM pilot_recruitment_campaigns c
WHERE c.name = '30 Pilots in 30 Days'
AND NOT EXISTS (
    SELECT 1 FROM pilot_recruitment_targets WHERE name = 'Sarah Mitchell'
);

INSERT INTO pilot_recruitment_targets (campaign_id, name, email, location, brokerage, source_channel, status, notes, priority)
SELECT 
    c.id,
    'Marcus Chen',
    'marcus@marcuschsellsatx.com',
    'Austin, TX',
    'Independent',
    'linkedin',
    'identified',
    'Former Salesforce SDR, tech-savvy, uses FUB, ~15 transactions/year. Active in Austin Realtor Facebook groups.',
    1
FROM pilot_recruitment_campaigns c
WHERE c.name = '30 Pilots in 30 Days'
AND NOT EXISTS (
    SELECT 1 FROM pilot_recruitment_targets WHERE name = 'Marcus Chen'
);

INSERT INTO pilot_recruitment_targets (campaign_id, name, email, location, brokerage, source_channel, status, notes, priority)
SELECT 
    c.id,
    'Jennifer Rodriguez',
    'jen@jenrodriguezrealestate.com',
    'Miami, FL',
    'Independent',
    'facebook',
    'identified',
    'Bilingual English/Spanish, heavy Facebook ads user, ~22 transactions/year. Runs consistent ad campaigns.',
    1
FROM pilot_recruitment_campaigns c
WHERE c.name = '30 Pilots in 30 Days'
AND NOT EXISTS (
    SELECT 1 FROM pilot_recruitment_targets WHERE name = 'Jennifer Rodriguez'
);
