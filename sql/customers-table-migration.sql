-- ==================== CUSTOMERS TABLE MIGRATION ====================
-- Creates dedicated customers table for PAYING CUSTOMERS (real estate agents)
-- Separates billing from worker agent tracking
-- Date: 2026-02-27
-- Priority: P0 - PILOT BLOCKER

-- ==================== CREATE CUSTOMERS TABLE ====================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer identity
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  
  -- Plan details
  plan_tier TEXT CHECK (plan_tier IN ('starter', 'pro', 'team', 'brokerage')),
  plan_price INTEGER, -- in cents
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Subscription state
  status TEXT DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  
  -- Usage metrics
  mrr INTEGER DEFAULT 0, -- Monthly Recurring Revenue in cents
  lead_count INTEGER DEFAULT 0,
  sms_sent_count INTEGER DEFAULT 0,
  sms_quota INTEGER DEFAULT 100, -- per month
  lead_quota INTEGER DEFAULT 50, -- per month
  
  -- Features & limits
  features JSONB DEFAULT '{
    "ai_qualification": true,
    "automated_followup": true,
    "calcom_integration": true,
    "analytics_dashboard": true,
    "custom_branding": false,
    "api_access": false
  }'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_subscription ON customers(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan_tier);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Users can only view their own customer record
CREATE POLICY "Users can view own customer record" ON customers
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile info (not billing fields)
CREATE POLICY "Users can update own profile" ON customers
  FOR UPDATE USING (auth.uid()::text = id::text)
  WITH CHECK (
    -- Allow updating these fields only:
    OLD.id = NEW.id AND
    OLD.stripe_customer_id = NEW.stripe_customer_id AND
    OLD.stripe_subscription_id = NEW.stripe_subscription_id AND
    OLD.plan_tier = NEW.plan_tier AND
    OLD.status = NEW.status AND
    OLD.mrr = NEW.mrr
  );

-- Service role (API) can manage all customers
CREATE POLICY "Service role can manage customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

-- ==================== AUTO-UPDATE TIMESTAMP TRIGGER ====================
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at_trigger ON customers;
CREATE TRIGGER update_customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- ==================== UPDATE SUBSCRIPTIONS TABLE ====================
-- Drop the old user_id foreign key to agents (worker agents)
-- Add new customer_id foreign key to customers (paying customers)

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Add customer_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' AND column_name = 'customer_id') THEN
    ALTER TABLE subscriptions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on customer_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);

-- Update subscription policies to use customer_id instead of user_id
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Customers can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = customer_id::text);

-- ==================== UPDATE PAYMENTS TABLE ====================
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payments' AND column_name = 'customer_id') THEN
    ALTER TABLE payments ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Customers can view own payments" ON payments
  FOR SELECT USING (auth.uid()::text = customer_id::text);

-- ==================== UPDATE CHECKOUT SESSIONS TABLE ====================
ALTER TABLE checkout_sessions DROP CONSTRAINT IF EXISTS checkout_sessions_user_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'checkout_sessions' AND column_name = 'customer_id') THEN
    ALTER TABLE checkout_sessions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_customer_id ON checkout_sessions(customer_id);

DROP POLICY IF EXISTS "Users can view own checkout sessions" ON checkout_sessions;
CREATE POLICY "Customers can view own checkout sessions" ON checkout_sessions
  FOR SELECT USING (auth.uid()::text = customer_id::text);

-- ==================== UPDATE SUBSCRIPTION EVENTS TABLE ====================
ALTER TABLE subscription_events DROP CONSTRAINT IF EXISTS subscription_events_user_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscription_events' AND column_name = 'customer_id') THEN
    ALTER TABLE subscription_events ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_events_customer_id ON subscription_events(customer_id);

DROP POLICY IF EXISTS "Users can view own subscription events" ON subscription_events;
CREATE POLICY "Customers can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid()::text = customer_id::text);

-- ==================== VERIFICATION QUERY ====================
-- Run this to verify the table was created correctly:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'customers'
-- ORDER BY ordinal_position;

-- ==================== SUCCESS MESSAGE ====================
DO $$
BEGIN
  RAISE NOTICE '✅ Customers table created successfully';
  RAISE NOTICE '✅ Subscriptions table updated to reference customers';
  RAISE NOTICE '✅ Payments table updated to reference customers';
  RAISE NOTICE '✅ Checkout sessions table updated to reference customers';
  RAISE NOTICE '✅ Row Level Security policies configured';
  RAISE NOTICE '🎯 Next: Update API routes to use customers table';
END $$;
