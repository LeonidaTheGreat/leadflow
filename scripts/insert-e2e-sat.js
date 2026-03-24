require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const e2eSpecs = [
  {
    use_case_id: 'feat-lead-satisfaction-feedback',
    test_name: 'E2E-SAT-001: Satisfaction Ping Sent After AI Exchange',
    test_file: 'tests/e2e/lead-satisfaction.test.ts',
    test_spec: 'Given a lead has exchanged 2+ messages with the AI, when 10+ minutes pass after the last AI message, then a satisfaction ping SMS is sent to the lead with the standard template. Verify: satisfaction_ping_enabled=true on agent, ping sent once per conversation, ping message contains YES/NO CTA and STOP opt-out.',
    assertions: JSON.stringify([
      'Satisfaction ping SMS delivered to lead phone number',
      'SMS text matches approved template (< 160 chars, includes STOP mention)',
      'lead_satisfaction_events row created with satisfaction_ping_sent_at set',
      'Ping not sent if satisfaction_ping_enabled=false on agent',
      'Ping not sent twice for same conversation thread',
      'Ping not sent if lead has opted out (STOP)'
    ]),
    last_result: 'not_run',
    project_id: 'leadflow'
  },
  {
    use_case_id: 'feat-lead-satisfaction-feedback',
    test_name: 'E2E-SAT-002: Reply Classification',
    test_file: 'tests/e2e/lead-satisfaction.test.ts',
    test_spec: 'Given a satisfaction ping was sent, when lead replies with various texts, verify classification is correct. Test: YES maps to positive, NO maps to negative, OK maps to neutral, STOP maps to negative plus opt-out triggered, unrecognized text maps to unclassified.',
    assertions: JSON.stringify([
      'YES/HELPFUL/GOOD/GREAT/THANKS -> rating=positive',
      'NO/BAD/ANNOYING/QUIT -> rating=negative',
      'NEUTRAL/OK/FINE/MEH -> rating=neutral',
      'STOP -> rating=negative AND opt-out triggered',
      'Unrecognized text -> rating=unclassified',
      'lead_satisfaction_events row updated with raw_reply and rating'
    ]),
    last_result: 'not_run',
    project_id: 'leadflow'
  },
  {
    use_case_id: 'feat-lead-satisfaction-feedback',
    test_name: 'E2E-SAT-003: Dashboard Satisfaction Widget',
    test_file: 'tests/e2e/lead-satisfaction.test.ts',
    test_spec: 'Given an agent has 5 or more lead satisfaction responses, when the agent views their dashboard, then the LeadSatisfactionCard is visible showing % positive, % negative, % neutral and a trend indicator. Card must NOT appear when fewer than 5 responses exist.',
    assertions: JSON.stringify([
      'LeadSatisfactionCard renders when agent has 5+ satisfaction events',
      'Shows correct % positive (within 1% of actual)',
      'Shows correct % negative',
      'Shows correct % neutral',
      'Trend indicator shown (improving/declining/stable)',
      'Card NOT visible when < 5 events exist',
      'Clicking card shows list of individual events',
      'Data is filtered to the authenticated agent only (no cross-agent leakage)'
    ]),
    last_result: 'not_run',
    project_id: 'leadflow'
  },
  {
    use_case_id: 'feat-lead-satisfaction-feedback',
    test_name: 'E2E-SAT-004: Agent Settings Toggle',
    test_file: 'tests/e2e/lead-satisfaction.test.ts',
    test_spec: 'Given an agent is on the Settings page, when they toggle the satisfaction check-in setting to OFF and save, then no satisfaction pings are sent for their leads. When toggled back ON, pings resume.',
    assertions: JSON.stringify([
      'Toggle visible in Settings page (default: ON)',
      'Toggle state persists after page reload',
      'agents.satisfaction_ping_enabled=false when toggle is OFF',
      'No satisfaction ping SMS sent when toggle is OFF',
      'Pings resume when toggle turned back ON'
    ]),
    last_result: 'not_run',
    project_id: 'leadflow'
  }
];

sb.from('e2e_test_specs').insert(e2eSpecs).then(r => {
  console.log('E2E insert status:', r.status);
  if (r.error) console.error('Error:', JSON.stringify(r.error, null, 2));
  else console.log('E2E specs inserted OK');
});
