-- ============================================
-- ANALYTICS KPI DASHBOARD - SQL QUERIES
-- ============================================
-- This file contains optimized SQL queries for the analytics dashboard.
-- Can be used to create materialized views or as reference for the application queries.

-- ============================================
-- VIEW 1: MESSAGES PER DAY
-- ============================================
CREATE OR REPLACE VIEW analytics_messages_per_day AS
SELECT 
  DATE(created_at) as message_date,
  COUNT(*) as message_count,
  COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_count,
  COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_count
FROM messages
GROUP BY DATE(created_at)
ORDER BY message_date DESC;

-- ============================================
-- VIEW 2: DELIVERY STATUS SUMMARY
-- ============================================
CREATE OR REPLACE VIEW analytics_delivery_status AS
SELECT 
  status,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_messages,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM messages
WHERE direction = 'outbound'
GROUP BY status;

-- ============================================
-- VIEW 3: RESPONSE RATE (LEADS THAT RESPONDED)
-- ============================================
CREATE OR REPLACE VIEW analytics_response_rate AS
WITH leads_messaged AS (
  SELECT DISTINCT lead_id
  FROM messages
  WHERE direction = 'outbound'
),
leads_responded AS (
  SELECT DISTINCT lead_id
  FROM messages
  WHERE direction = 'inbound'
)
SELECT 
  COUNT(DISTINCT lm.lead_id) as total_leads_messaged,
  COUNT(DISTINCT lr.lead_id) as leads_that_responded,
  ROUND(100.0 * COUNT(DISTINCT lr.lead_id) / COUNT(DISTINCT lm.lead_id), 2) as response_rate_percent
FROM leads_messaged lm
LEFT JOIN leads_responded lr ON lm.lead_id = lr.lead_id;

-- ============================================
-- VIEW 4: RESPONSE TIME ANALYTICS
-- ============================================
CREATE OR REPLACE VIEW analytics_response_times AS
WITH msg_pairs AS (
  SELECT 
    m1.lead_id,
    m1.created_at as outbound_time,
    MIN(m2.created_at) as first_inbound_time,
    EXTRACT(EPOCH FROM (MIN(m2.created_at) - m1.created_at)) / 60 as response_time_minutes
  FROM messages m1
  LEFT JOIN messages m2 ON m1.lead_id = m2.lead_id 
    AND m2.direction = 'inbound'
    AND m2.created_at > m1.created_at
  WHERE m1.direction = 'outbound'
  GROUP BY m1.lead_id, m1.created_at
)
SELECT 
  COUNT(*) as total_lead_responses,
  ROUND(AVG(response_time_minutes), 2) as avg_response_time_minutes,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_minutes), 2) as median_response_time_minutes,
  ROUND(MIN(response_time_minutes), 2) as min_response_time_minutes,
  ROUND(MAX(response_time_minutes), 2) as max_response_time_minutes
FROM msg_pairs
WHERE first_inbound_time IS NOT NULL;

-- ============================================
-- VIEW 5: SEQUENCE COMPLETION RATE
-- ============================================
CREATE OR REPLACE VIEW analytics_sequence_completion AS
WITH sequence_stats AS (
  SELECT 
    lead_id,
    COUNT(*) as message_count,
    MAX(created_at) as last_message_date
  FROM messages
  WHERE direction = 'outbound'
  GROUP BY lead_id
)
SELECT 
  COUNT(*) as total_sequences,
  COUNT(CASE WHEN message_count >= 3 THEN 1 END) as completed_sequences,
  ROUND(100.0 * COUNT(CASE WHEN message_count >= 3 THEN 1 END) / COUNT(*), 2) as completion_rate_percent
FROM sequence_stats;

-- ============================================
-- VIEW 6: LEAD CONVERSION FUNNEL
-- ============================================
CREATE OR REPLACE VIEW analytics_conversion_funnel AS
SELECT 
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT b.lead_id) as leads_with_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.lead_id END) as confirmed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.lead_id END) as completed_calls,
  ROUND(100.0 * COUNT(DISTINCT b.lead_id) / COUNT(DISTINCT l.id), 2) as conversion_rate_percent
FROM leads l
LEFT JOIN bookings b ON l.id = b.lead_id;

-- ============================================
-- VIEW 7: DAILY METRICS SUMMARY
-- ============================================
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
  DATE(l.created_at) as summary_date,
  COUNT(DISTINCT l.id) as leads_created,
  COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as leads_qualified,
  COUNT(DISTINCT CASE WHEN l.responded_at IS NOT NULL THEN l.id END) as leads_responded,
  COUNT(DISTINCT m.id) as messages_sent,
  COUNT(DISTINCT CASE WHEN m.status = 'delivered' THEN m.id END) as messages_delivered,
  COUNT(DISTINCT b.id) as bookings_created
FROM leads l
LEFT JOIN messages m ON l.id = m.lead_id AND m.direction = 'outbound'
LEFT JOIN bookings b ON l.id = b.lead_id
GROUP BY DATE(l.created_at)
ORDER BY summary_date DESC;

-- ============================================
-- VIEW 8: AGENT PERFORMANCE METRICS
-- ============================================
CREATE OR REPLACE VIEW analytics_agent_performance AS
SELECT 
  a.id as agent_id,
  a.name,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
  COUNT(DISTINCT CASE WHEN l.responded_at IS NOT NULL THEN l.id END) as responded_leads,
  COUNT(DISTINCT b.id) as bookings,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) / 
    NULLIF(COUNT(DISTINCT l.id), 0), 2) as qualification_rate
FROM agents a
LEFT JOIN leads l ON a.id = l.agent_id
LEFT JOIN bookings b ON l.id = b.lead_id AND b.status IN ('confirmed', 'completed')
GROUP BY a.id, a.name;

-- ============================================
-- VIEW 9: MESSAGE CHANNEL BREAKDOWN
-- ============================================
CREATE OR REPLACE VIEW analytics_by_channel AS
SELECT 
  channel,
  direction,
  status,
  COUNT(*) as message_count
FROM messages
GROUP BY channel, direction, status
ORDER BY message_count DESC;

-- ============================================
-- VIEW 10: LEAD STATUS DISTRIBUTION
-- ============================================
CREATE OR REPLACE VIEW analytics_lead_status_distribution AS
SELECT 
  status,
  COUNT(*) as lead_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM leads
GROUP BY status
ORDER BY lead_count DESC;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- These indexes optimize the analytics queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_lead_direction ON messages(lead_id, direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- ============================================
-- HELPER: REFRESH VIEWS
-- ============================================
-- To refresh materialized views (if converted to MATERIALIZED):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_agent_performance;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Get messages sent in last 30 days
-- SELECT * FROM analytics_messages_per_day 
-- WHERE message_date >= CURRENT_DATE - INTERVAL '30 days';

-- Get delivery success rate
-- SELECT * FROM analytics_delivery_status;

-- Get response rate
-- SELECT * FROM analytics_response_rate;

-- Get response time analytics
-- SELECT * FROM analytics_response_times;

-- Get daily summary for dashboard
-- SELECT * FROM analytics_daily_summary 
-- WHERE summary_date >= CURRENT_DATE - INTERVAL '30 days';

-- Get agent performance
-- SELECT * FROM analytics_agent_performance 
-- ORDER BY bookings DESC;
