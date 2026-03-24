-- Add missing fields for self-serve Stripe checkout

-- Add stripe_subscription_id column if it doesn't exist
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add plan_activated_at column if it doesn't exist
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_stripe_customer_id ON real_estate_agents(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_stripe_subscription_id ON real_estate_agents(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_plan_tier ON real_estate_agents(plan_tier);

-- Add comment for documentation
COMMENT ON COLUMN real_estate_agents.stripe_subscription_id IS 'Stripe subscription ID for active paid subscriptions';
COMMENT ON COLUMN real_estate_agents.plan_activated_at IS 'Timestamp when the current plan was activated (for upgrade tracking)';
