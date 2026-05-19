-- Idempotent schema for Stripe webhook event storage.
-- Creates subscriptions, subscription_events, payments, and checkout_sessions
-- tables if they do not already exist.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,
  customer_id           UUID,
  stripe_customer_id    VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status                VARCHAR(50)  NOT NULL DEFAULT 'incomplete',
  tier                  VARCHAR(50)  NOT NULL DEFAULT 'starter',
  price_id              VARCHAR(255) NOT NULL DEFAULT '',
  interval              VARCHAR(20)  NOT NULL DEFAULT 'month',
  current_period_start  TIMESTAMP,
  current_period_end    TIMESTAMP,
  trial_start           TIMESTAMP,
  trial_end             TIMESTAMP,
  cancel_at_period_end  BOOLEAN      DEFAULT FALSE,
  canceled_at           TIMESTAMP,
  ended_at              TIMESTAMP,
  pending_tier          VARCHAR(50),
  pending_interval      VARCHAR(20),
  pending_change_at     TIMESTAMP,
  cancellation_reason   TEXT,
  metadata              JSONB        DEFAULT '{}'::jsonb,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subscriptions_status_check CHECK (status IN
    ('incomplete','active','past_due','canceled','paused','trialing','unpaid')),
  CONSTRAINT subscriptions_tier_check CHECK (tier IN
    ('starter','pro','professional','team','brokerage','enterprise')),
  CONSTRAINT subscriptions_interval_check CHECK (interval IN ('month','year'))
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id           UUID,
  stripe_event_id   VARCHAR(255) UNIQUE,
  event_type        VARCHAR(100) NOT NULL,
  stripe_event_data JSONB        NOT NULL DEFAULT '{}'::jsonb,
  processed_at      TIMESTAMP,
  error_at          TIMESTAMP,
  processing_error  TEXT,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id           UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id                   UUID,
  stripe_invoice_id         VARCHAR(255) UNIQUE,
  stripe_payment_intent_id  VARCHAR(255),
  amount                    DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency                  VARCHAR(3)    DEFAULT 'usd',
  status                    VARCHAR(50),
  period_start              TIMESTAMP,
  period_end                TIMESTAMP,
  receipt_url               TEXT,
  failure_message           TEXT,
  created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,
  stripe_session_id VARCHAR(255) UNIQUE,
  status           VARCHAR(50)  DEFAULT 'pending',
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (ignored if already present via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id               ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id    ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status                ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end    ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id            ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id          ON payments(stripe_invoice_id);
