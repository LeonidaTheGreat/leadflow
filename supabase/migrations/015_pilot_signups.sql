-- Migration 015: Create pilot_signups table
-- Stores landing page pilot signup form submissions

CREATE TABLE IF NOT EXISTS pilot_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Business info
  brokerage_name TEXT,
  team_name TEXT,

  -- Lead volume
  monthly_leads TEXT, -- '1-10', '11-50', '51-100', '100+'

  -- Current tools
  current_crm TEXT, -- 'follow_up_boss', 'liondesk', 'kvcore', 'other', 'none'

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'approved', 'declined', 'nurture')),

  -- Marketing attribution
  source TEXT DEFAULT 'landing_page',
  utm_campaign TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ
);

-- Add missing columns in case table already exists from a prior partial migration
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;

-- Ensure status default is 'new' (not 'nurture' from prior partial migrations)
ALTER TABLE pilot_signups ALTER COLUMN status SET DEFAULT 'new';

-- Unique constraint on email to prevent duplicate signups
ALTER TABLE pilot_signups
  DROP CONSTRAINT IF EXISTS pilot_signups_email_unique;
ALTER TABLE pilot_signups
  ADD CONSTRAINT pilot_signups_email_unique UNIQUE (email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pilot_signups_email ON pilot_signups(email);
CREATE INDEX IF NOT EXISTS idx_pilot_signups_status ON pilot_signups(status);
CREATE INDEX IF NOT EXISTS idx_pilot_signups_created_at ON pilot_signups(created_at DESC);

-- updated_at trigger (reuse existing function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_pilot_signups_updated_at'
      AND tgrelid = 'pilot_signups'::regclass
  ) THEN
    CREATE TRIGGER update_pilot_signups_updated_at
      BEFORE UPDATE ON pilot_signups
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
