-- Email Events Table for UC-11: Subscription Lifecycle Management
-- Tracks all email notifications sent for subscription lifecycle events

-- ============================================
-- EMAIL_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN (
        'welcome',
        'renewal_success',
        'payment_failed',
        'subscription_cancelled',
        'subscription_upgraded',
        'subscription_downgraded',
        'trial_ending',
        'trial_ended'
    )),
    recipient TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE email_events IS 'Audit log for all subscription lifecycle emails';
COMMENT ON COLUMN email_events.email_type IS 'Type of lifecycle email sent';
COMMENT ON COLUMN email_events.status IS 'Email delivery status (queued, sent, failed)';
COMMENT ON COLUMN email_events.metadata IS 'Additional email data (resend_id, template_vars, etc.)';

-- Indexes for email_events
CREATE INDEX idx_email_events_customer_id ON email_events(customer_id);
CREATE INDEX idx_email_events_email_type ON email_events(email_type);
CREATE INDEX idx_email_events_status ON email_events(status);
CREATE INDEX idx_email_events_created_at ON email_events(created_at DESC);

-- ============================================
-- UPDATE SUBSCRIPTION_EVENTS TABLE
-- ============================================
-- Add additional fields for upgrade/downgrade tracking
ALTER TABLE subscription_events
ADD COLUMN IF NOT EXISTS old_plan_tier TEXT,
ADD COLUMN IF NOT EXISTS mrr_change INTEGER,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER;

COMMENT ON COLUMN subscription_events.old_plan_tier IS 'Previous plan tier (for upgrades/downgrades)';
COMMENT ON COLUMN subscription_events.mrr_change IS 'Change in MRR (positive for upgrade, negative for downgrade)';
COMMENT ON COLUMN subscription_events.attempt_count IS 'Payment retry attempt number (for failed payments)';

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Allow customers to read their own email events
CREATE POLICY "Customers can read their own email events" ON email_events
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id::text FROM customers WHERE customers.id = email_events.customer_id
        )
    );

-- Service role can insert/update email events
-- (This is handled by backend with service role key)

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Email delivery success rate by type
CREATE OR REPLACE VIEW email_delivery_stats AS
SELECT 
    email_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'sent') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'sent') / NULLIF(COUNT(*), 0),
        2
    ) as success_rate_percent
FROM email_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY email_type
ORDER BY total_sent DESC;

COMMENT ON VIEW email_delivery_stats IS 'Email delivery success rate by type (last 30 days)';

-- Recent subscription lifecycle events with email status
CREATE OR REPLACE VIEW subscription_lifecycle_audit AS
SELECT 
    se.created_at,
    c.email as customer_email,
    c.name as customer_name,
    se.event_type,
    se.plan_tier,
    se.old_plan_tier,
    se.mrr,
    se.mrr_change,
    ee.email_type,
    ee.status as email_status,
    ee.sent_at as email_sent_at
FROM subscription_events se
JOIN customers c ON c.id = se.customer_id
LEFT JOIN email_events ee ON ee.customer_id = se.customer_id 
    AND ee.created_at BETWEEN se.created_at AND se.created_at + INTERVAL '5 minutes'
WHERE se.created_at > NOW() - INTERVAL '7 days'
ORDER BY se.created_at DESC;

COMMENT ON VIEW subscription_lifecycle_audit IS 'Recent subscription events with email delivery status';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get email statistics for a customer
CREATE OR REPLACE FUNCTION get_customer_email_stats(p_customer_id UUID)
RETURNS TABLE (
    email_type TEXT,
    total_count BIGINT,
    last_sent TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ee.email_type,
        COUNT(*) as total_count,
        MAX(ee.sent_at) as last_sent
    FROM email_events ee
    WHERE ee.customer_id = p_customer_id
    GROUP BY ee.email_type
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_customer_email_stats IS 'Get email statistics for a specific customer';
