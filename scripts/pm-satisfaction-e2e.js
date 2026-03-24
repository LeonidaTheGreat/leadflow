require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const specs = [
    {
      id: 'e2e-satisfaction-ping-sent',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      test_name: 'E2E-SATISFACTION-001: Satisfaction ping SMS sent after AI exchange',
      test_file: 'test/lead-satisfaction.test.ts',
      test_spec: 'After at least 2 AI messages in a conversation: 1) Simulate lead receiving 2+ AI SMS responses 2) Mock 10-minute cooldown 3) Verify Twilio sent satisfaction ping SMS 4) Verify lead_satisfaction_events row created with rating=null',
      assertions: 'Satisfaction ping SMS sent via Twilio; event row created in Supabase with rating=null',
      last_result: 'not_run'
    },
    {
      id: 'e2e-satisfaction-reply-classified',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      test_name: 'E2E-SATISFACTION-002: Lead reply classified and stored',
      test_file: 'test/lead-satisfaction.test.ts',
      test_spec: '1) Simulate lead replying YES → check rating=positive 2) Simulate NO → check rating=negative 3) Simulate STOP → check opt-out triggered (UC-5) AND rating=negative stored',
      assertions: 'Replies classified correctly (positive/negative/neutral/unclassified); STOP triggers opt-out flow',
      last_result: 'not_run'
    },
    {
      id: 'e2e-satisfaction-dashboard-widget',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      test_name: 'E2E-SATISFACTION-003: Lead Satisfaction card visible in agent dashboard',
      test_file: 'test/lead-satisfaction.test.ts',
      test_spec: '1) Log in as agent 2) With <5 events: confirm LeadSatisfactionCard absent 3) Insert 5+ test events 4) Reload dashboard 5) Confirm card renders with % breakdown 6) Confirm trend indicator shown',
      assertions: 'Card hidden below 5 events; visible with % positive/negative/neutral above 5 events; trend indicator present',
      last_result: 'not_run'
    },
    {
      id: 'e2e-satisfaction-agent-toggle',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      test_name: 'E2E-SATISFACTION-004: Agent can disable satisfaction pings via settings toggle',
      test_file: 'test/lead-satisfaction.test.ts',
      test_spec: '1) Navigate Settings → toggle OFF satisfaction pings 2) Verify agents.satisfaction_ping_enabled=false in Supabase 3) Simulate AI exchange → confirm NO ping sent 4) Toggle ON → confirm ping sent on next exchange',
      assertions: 'Toggle persists in DB; no pings when disabled; pings resume when re-enabled',
      last_result: 'not_run'
    },
    {
      id: 'e2e-satisfaction-no-double-ping',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      test_name: 'E2E-SATISFACTION-005: Satisfaction ping sent only once per conversation',
      test_file: 'test/lead-satisfaction.test.ts',
      test_spec: '1) Simulate lead having 5+ AI exchanges in same conversation thread 2) Count Twilio calls to lead number for satisfaction ping 3) Check lead_satisfaction_events rows for this conversation_id',
      assertions: 'Exactly 1 satisfaction ping SMS sent per conversation; exactly 1 DB row per conversation_id',
      last_result: 'not_run'
    }
  ];

  for (const spec of specs) {
    const { error } = await sb.from('e2e_test_specs').upsert(spec, { onConflict: 'id' });
    if (error) { console.error('E2E spec error:', spec.id, JSON.stringify(error)); }
    else { console.log('E2E spec inserted:', spec.id); }
  }

  console.log('E2E specs done.');
})();
