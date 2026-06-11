-- Verification: 3 pilot recruitment UCs marked blocked_human (task 15a4bdcf)
-- These UCs require Stojan to personally reach out to real estate agents.
-- No agent can perform direct human outreach. Human action required.
--
-- Run to verify state: psql openclaw -f scripts/db/verify-pilot-uc-blocked-human.sql

SELECT id, name, implementation_status, metadata->>'blocked_reason' AS blocked_reason
FROM use_cases
WHERE project_id = 'leadflow'
  AND id IN (
    'fix-zero-real-pilots-recruited',
    'fix-pilot-outreach-has-not-happened-11-days-left',
    'fix-30-pilot-campaign-stalled-at-day-8'
  )
ORDER BY id;

-- Expected: all 3 rows show implementation_status = 'blocked_human', blocked_reason = 'blocked_human'

-- Verify no active tasks consuming budget on these UCs
SELECT COUNT(*) AS active_tasks_count
FROM tasks
WHERE project_id = 'leadflow'
  AND use_case_id IN (
    'fix-zero-real-pilots-recruited',
    'fix-pilot-outreach-has-not-happened-11-days-left',
    'fix-30-pilot-campaign-stalled-at-day-8'
  )
  AND status NOT IN ('done', 'cancelled', 'failed', 'archived');

-- Expected: 0 active tasks
