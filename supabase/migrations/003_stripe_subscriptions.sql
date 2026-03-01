-- Stripe Subscriptions Schema for LeadFlow
-- Creates tables for subscription management and webhook handling

-- ==================== SUBSCRIPTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete', -- incomplete, active, past_due, canceled, paused, trialing
  tier VARCHAR(50) NOT NULL, -- starter, professional, enterprise
  price_id VARCHAR(255) NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'month', -- month, year
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_status CHECK (status IN ('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid')),
  CONSTRAINT valid_tier CHECK (tier IN ('starter', 'professional', 'enterprise')),
  CONSTRAINT valid_interval CHECK (interval IN ('month', 'year'))
);

-- ==================== SUBSCRIPTION EVENTS TABLE ====================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  stripe_event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100) NOT NULL, -- customer.subscription.created, invoice.payment_succeeded, etc.
  stripe_event_data JSONB NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== PAYMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL, -- succeeded, pending, failed
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  receipt_url TEXT,
  failure_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_payment_status CHECK (status IN ('succeeded', 'pending', 'failed'))
);

-- ==================== CHECKOUT SESSIONS TABLE ====================
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE,
  tier VARCHAR(50) NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'month',
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, expired, abandoned
  url TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  CONSTRAINT valid_session_status CHECK (status IN ('pending', 'completed', 'expired', 'abandoned'))
);

-- ==================== UPDATE AGENTS TABLE ====================
-- Add subscription-related columns to agents table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'subscription_status') THEN
    ALTER TABLE agents ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'subscription_tier') THEN
    ALTER TABLE agents ADD COLUMN subscription_tier VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE agents ADD COLUMN stripe_customer_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'current_period_end') THEN
    ALTER TABLE agents ADD COLUMN current_period_end TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE agents ADD COLUMN trial_ends_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'mrr') THEN
    ALTER TABLE agents ADD COLUMN mrr DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user_id ON checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe_session_id ON checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);

-- ==================== TRIGGERS ====================
-- Auto-update updated_at timestamp for subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for subscription_events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription events" ON subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for checkout_sessions
CREATE POLICY "Users can view own checkout sessions" ON checkout_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage checkout sessions" ON checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ==================== MRR SNAPSHOT TABLE ====================
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_mrr DECIMAL(12, 2) NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "starter": 0, "professional": 0, "enterprise": 0 }
  customer_count INT NOT NULL DEFAULT 0,
  arr DECIMAL(12, 2) NOT NULL DEFAULT 0,
  new_mrr DECIMAL(12, 2) DEFAULT 0,
  churned_mrr DECIMAL(12, 2) DEFAULT 0,
  expansion_mrr DECIMAL(12, 2) DEFAULT 0,
  contraction_mrr DECIMAL(12, 2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON mrr_snapshots(date);

-- Enable RLS on mrr_snapshots (admin only)
ALTER TABLE mrr_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage MRR snapshots" ON mrr_snapshots
  FOR ALL USING (auth.role() = 'service_role');
