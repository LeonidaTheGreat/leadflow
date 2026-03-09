-- Migration: Add Twilio SMS columns to conversations table
-- Adds fields needed for real Twilio integration

-- Add columns to conversations table if they don't exist
DO $$
BEGIN
    -- Add from_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'from_number') THEN
        ALTER TABLE conversations ADD COLUMN from_number TEXT;
    END IF;

    -- Add to_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'to_number') THEN
        ALTER TABLE conversations ADD COLUMN to_number TEXT;
    END IF;

    -- Add trigger_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'trigger_type') THEN
        ALTER TABLE conversations ADD COLUMN trigger_type TEXT;
    END IF;

    -- Add error_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'error_code') THEN
        ALTER TABLE conversations ADD COLUMN error_code TEXT;
    END IF;

    -- Add error_message column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'error_message') THEN
        ALTER TABLE conversations ADD COLUMN error_message TEXT;
    END IF;

    -- Add has_media column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'has_media') THEN
        ALTER TABLE conversations ADD COLUMN has_media BOOLEAN DEFAULT false;
    END IF;

    -- Add media_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'media_url') THEN
        ALTER TABLE conversations ADD COLUMN media_url TEXT;
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create index on twilio_sid for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_twilio_sid ON conversations(twilio_sid);

-- Create index on from_number for inbound message lookups
CREATE INDEX IF NOT EXISTS idx_conversations_from_number ON conversations(from_number);

-- Create index on to_number for outbound message lookups
CREATE INDEX IF NOT EXISTS idx_conversations_to_number ON conversations(to_number);

-- Create index on trigger_type for analytics
CREATE INDEX IF NOT EXISTS idx_conversations_trigger_type ON conversations(trigger_type);

-- Add comment explaining the table
COMMENT ON TABLE conversations IS 'SMS conversation history with leads via Twilio';

-- Add DNC list table for opt-out management
CREATE TABLE IF NOT EXISTS dnc_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'lead_opt_out', -- 'lead_opt_out', 'manual', 'import'
    opted_out_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on phone number for fast lookups
CREATE INDEX IF NOT EXISTS idx_dnc_phone ON dnc_list(phone_number);

-- Add sms_opt_out column to leads table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'sms_opt_out') THEN
        ALTER TABLE leads ADD COLUMN sms_opt_out BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index on sms_opt_out
CREATE INDEX IF NOT EXISTS idx_leads_sms_opt_out ON leads(sms_opt_out) WHERE sms_opt_out = true;

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_conversations_updated_at();