-- Migration: Email Verification Tokens Table
-- Creates table for storing email verification tokens
-- Part of: feat-email-verification-before-login

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_agent_id ON email_verification_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_created_at ON email_verification_tokens(created_at);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can manage all tokens
CREATE POLICY "Service role can manage email_verification_tokens" ON email_verification_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Users can only read their own tokens
CREATE POLICY "Users can read own verification tokens" ON email_verification_tokens
  FOR SELECT USING (auth.uid() = agent_id);

-- Add comment for documentation
COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens for real estate agent accounts';
COMMENT ON COLUMN email_verification_tokens.token IS 'Unique verification token (UUID)';
COMMENT ON COLUMN email_verification_tokens.expires_at IS 'Token expiration time (24 hours from creation)';
COMMENT ON COLUMN email_verification_tokens.used_at IS 'Timestamp when token was used (NULL if unused)';
