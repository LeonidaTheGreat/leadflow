-- Migration: 015 - Agent Referral Program
-- Purpose: Add referral system for viral growth
-- Created: 2026-04-05

-- Create referral_links table
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referral_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_referral_links_agent_id ON referral_links(agent_id);
CREATE INDEX idx_referral_links_code ON referral_links(referral_code);

-- Create referrals table to track conversions
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  referred_agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referral_source TEXT, -- 'email', 'social', 'link' etc
  referred_email TEXT,
  conversion_status TEXT DEFAULT 'pending', -- pending, converted, expired
  converted_at TIMESTAMP WITH TIME ZONE,
  credit_applied BOOLEAN DEFAULT false,
  free_months_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_referrals_referrer_agent_id ON referrals(referrer_agent_id);
CREATE INDEX idx_referrals_referred_agent_id ON referrals(referred_agent_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_conversion_status ON referrals(conversion_status);

-- Add referral tracking column to real_estate_agents
ALTER TABLE real_estate_agents
ADD COLUMN IF NOT EXISTS referred_by_agent_id UUID REFERENCES real_estate_agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_link_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_referral_credits INTEGER DEFAULT 0;

CREATE INDEX idx_real_estate_agents_referred_by ON real_estate_agents(referred_by_agent_id);

-- DOWN
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS referral_links CASCADE;
-- ALTER TABLE real_estate_agents
--   DROP COLUMN IF EXISTS referred_by_agent_id,
--   DROP COLUMN IF EXISTS referral_link_generated_at,
--   DROP COLUMN IF EXISTS total_referral_credits;
