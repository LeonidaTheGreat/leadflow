-- Create lead_summary view for dashboard
CREATE OR REPLACE VIEW lead_summary AS
SELECT 
    l.*,
    q.intent,
    q.budget_min,
    q.budget_max,
    q.timeline,
    q.location as qual_location,
    q.confidence_score,
    q.is_qualified,
    m_last.message_body as last_message,
    m_last.created_at as last_message_at,
    m_out.created_at as last_outbound_at,
    COUNT(m.id) as message_count
FROM leads l
LEFT JOIN qualifications q ON q.lead_id = l.id AND q.id = (
    SELECT id FROM qualifications WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN messages m ON m.lead_id = l.id
LEFT JOIN messages m_last ON m_last.id = (
    SELECT id FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN messages m_out ON m_out.id = (
    SELECT id FROM messages WHERE lead_id = l.id AND direction = 'outbound' ORDER BY created_at DESC LIMIT 1
)
GROUP BY l.id, q.intent, q.budget_min, q.budget_max, q.timeline, q.location, 
         q.confidence_score, q.is_qualified, m_last.message_body, m_last.created_at, m_out.created_at;

-- Allow anon to read lead_summary view
CREATE POLICY "Allow anon read lead_summary" ON lead_summary
    FOR SELECT USING (true);

-- Create dashboard_stats view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    agent_id,
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
    COUNT(*) FILTER (WHERE status = 'responded') as responded_leads,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as leads_today,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as leads_this_week,
    AVG(urgency_score) as avg_urgency,
    COUNT(*) as total_leads
FROM leads
GROUP BY agent_id;