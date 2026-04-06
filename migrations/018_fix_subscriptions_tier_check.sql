-- Fix subscriptions tier CHECK constraint to match actual product tiers.
-- Old constraint only allowed: starter, professional, enterprise
-- Product uses: starter, pro, team, brokerage
-- Keep professional/enterprise as aliases for backward compatibility.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('starter', 'pro', 'professional', 'team', 'brokerage', 'enterprise'));
