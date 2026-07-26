-- Migration: create admin_sms_outreach_log table
-- Used by Admin SMS Cold Outreach to track prospect contacts sent via Twilio
-- UC: uc-leadflow-admin-sms-outreach

CREATE TABLE IF NOT EXISTS admin_sms_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  phone text NOT NULL,
  market text NOT NULL,
  email text,
  login_url text,
  twilio_sid text,
  sms_status text DEFAULT 'sent',
  reply_status text DEFAULT 'pending',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_sms_outreach_log_sms_status_check CHECK (sms_status IN ('sent', 'failed', 'delivered', 'undelivered')),
  CONSTRAINT admin_sms_outreach_log_reply_status_check CHECK (reply_status IN ('pending', 'replied', 'interested', 'declined'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sms_outreach_sent_at ON admin_sms_outreach_log(sent_at DESC);
