-- Migration: Extend pilot_conversion_email_logs to support 6-milestone sequence
-- Adds day_75, day_79, day_85 milestones to support the full 90-day pilot conversion sequence.
-- Run this once against the live database after deploying the updated PilotConversionService.

-- 1. Expand the CHECK constraint on milestone column
ALTER TABLE pilot_conversion_email_logs
  DROP CONSTRAINT IF EXISTS pilot_conversion_email_logs_milestone_check;

ALTER TABLE pilot_conversion_email_logs
  ADD CONSTRAINT pilot_conversion_email_logs_milestone_check
  CHECK (milestone IN ('day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85'));

-- 2. Update the DB function to handle new milestones (used by TS dashboard via RPC)
CREATE OR REPLACE FUNCTION get_pilot_agents_for_milestone(p_milestone VARCHAR(20))
RETURNS TABLE (
    agent_id UUID,
    agent_email TEXT,
    agent_name TEXT,
    pilot_started_at TIMESTAMPTZ,
    days_since_start INTEGER
) AS $$
DECLARE
    v_target_days INTEGER;
BEGIN
    v_target_days := CASE p_milestone
        WHEN 'day_30' THEN 30
        WHEN 'day_45' THEN 45
        WHEN 'day_55' THEN 55
        WHEN 'day_75' THEN 75
        WHEN 'day_79' THEN 79
        WHEN 'day_85' THEN 85
        ELSE NULL
    END;

    IF v_target_days IS NULL THEN
        RAISE EXCEPTION 'Invalid milestone: %', p_milestone;
    END IF;

    RETURN QUERY
    SELECT
        a.id AS agent_id,
        a.email AS agent_email,
        a.first_name AS agent_name,
        a.pilot_started_at,
        EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER AS days_since_start
    FROM real_estate_agents a
    WHERE a.plan_tier = 'pilot'
      AND a.pilot_started_at IS NOT NULL
      AND EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER >= v_target_days
      AND NOT EXISTS (
          SELECT 1 FROM pilot_conversion_email_logs pcl
          WHERE pcl.agent_id = a.id
            AND pcl.milestone = p_milestone
            AND pcl.status IN ('sent', 'skipped')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pilot_agents_for_milestone IS
  'Get pilot agents eligible for a specific conversion milestone (day_30, day_45, day_55, day_75, day_79, day_85)';

-- 3. Update the view to include new milestone columns
CREATE OR REPLACE VIEW pilot_conversion_sequence_status AS
SELECT
    a.id AS agent_id,
    a.email AS agent_email,
    a.first_name,
    a.last_name,
    a.plan_tier,
    a.pilot_started_at,
    CASE
        WHEN a.pilot_started_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER
    END AS days_since_pilot_start,
    COALESCE(d30.status,  'pending') AS day_30_status,  d30.sent_at  AS day_30_sent_at,
    COALESCE(d45.status,  'pending') AS day_45_status,  d45.sent_at  AS day_45_sent_at,
    COALESCE(d55.status,  'pending') AS day_55_status,  d55.sent_at  AS day_55_sent_at,
    COALESCE(d75.status,  'pending') AS day_75_status,  d75.sent_at  AS day_75_sent_at,
    COALESCE(d79.status,  'pending') AS day_79_status,  d79.sent_at  AS day_79_sent_at,
    COALESCE(d85.status,  'pending') AS day_85_status,  d85.sent_at  AS day_85_sent_at,
    COUNT(CASE WHEN pcl.status = 'sent' THEN 1 END) AS emails_sent_count,
    MAX(pcl.sent_at) AS last_email_sent_at
FROM real_estate_agents a
LEFT JOIN pilot_conversion_email_logs d30 ON d30.agent_id = a.id AND d30.milestone = 'day_30'
LEFT JOIN pilot_conversion_email_logs d45 ON d45.agent_id = a.id AND d45.milestone = 'day_45'
LEFT JOIN pilot_conversion_email_logs d55 ON d55.agent_id = a.id AND d55.milestone = 'day_55'
LEFT JOIN pilot_conversion_email_logs d75 ON d75.agent_id = a.id AND d75.milestone = 'day_75'
LEFT JOIN pilot_conversion_email_logs d79 ON d79.agent_id = a.id AND d79.milestone = 'day_79'
LEFT JOIN pilot_conversion_email_logs d85 ON d85.agent_id = a.id AND d85.milestone = 'day_85'
LEFT JOIN pilot_conversion_email_logs pcl ON pcl.agent_id = a.id
WHERE a.plan_tier = 'pilot' OR pcl.agent_id IS NOT NULL
GROUP BY a.id, a.email, a.first_name, a.last_name, a.plan_tier, a.pilot_started_at,
         d30.status, d30.sent_at, d45.status, d45.sent_at, d55.status, d55.sent_at,
         d75.status, d75.sent_at, d79.status, d79.sent_at, d85.status, d85.sent_at;

COMMENT ON VIEW pilot_conversion_sequence_status IS
  'Current status of 6-milestone (day_30/45/55/75/79/85) conversion sequence for all pilot agents';
