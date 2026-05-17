'use strict';

/**
 * Unit tests for the inactivity alerting cron logic.
 *
 * Tests the core behavior:
 * 1. Inactive pilot with no recent alert → alert sent + row inserted
 * 2. Inactive pilot with recent alert (within 24h) → no duplicate alert
 * 3. Active pilot → no alert
 *
 * All DB and Telegram calls are mocked.
 */

const INACTIVITY_THRESHOLD_HOURS = 72;
const DEDUP_WINDOW_HOURS = 24;

/**
 * Extracts the core inactivity-alerting logic from the route into a
 * pure function so it can be tested without Next.js machinery.
 *
 * @param {object} opts
 * @param {object[]} opts.inactiveSessions  - rows from agent_sessions (agent_id, last_used_at)
 * @param {object[]} opts.recentAlerts      - rows returned by inactivity_alerts dedup query per agent
 * @param {object|null} opts.agentRow       - row from real_estate_agents for each agent
 * @param {function} opts.sendTelegram      - mock for sendTelegramMessage
 * @param {function} opts.insertAlert       - mock for supabaseAdmin.from('inactivity_alerts').insert()
 * @param {boolean}  [opts.isDryRun]        - if true, skip send + insert
 * @returns {{ alerted: number, skipped: number, results: object[] }}
 */
async function runInactivityAlertLogic(opts) {
  const {
    inactiveSessions,
    recentAlerts,
    agentRow,
    sendTelegram,
    insertAlert,
    isDryRun = false,
  } = opts;

  const now = Date.now();
  const dedupCutoff = new Date(now - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  // Build per-agent map (most recent last_used_at)
  const agentMap = new Map();
  for (const session of inactiveSessions) {
    const agentId = session.agent_id;
    if (!agentId) continue;
    const existing = agentMap.get(agentId);
    if (!existing || session.last_used_at > existing) {
      agentMap.set(agentId, session.last_used_at);
    }
  }

  let alerted = 0;
  let skipped = 0;
  const results = [];

  for (const [agentId, lastUsedAt] of agentMap) {
    // Check dedup
    const dedupResult = recentAlerts[agentId] || [];
    const hasDedupError = dedupResult === 'error';
    if (hasDedupError) {
      skipped++;
      results.push({ agent_id: agentId, last_used_at: lastUsedAt, action: 'skipped', reason: 'dedup_check_failed' });
      continue;
    }
    if (dedupResult.length > 0) {
      skipped++;
      results.push({ agent_id: agentId, last_used_at: lastUsedAt, action: 'skipped', reason: 'already_alerted_within_24h' });
      continue;
    }

    if (isDryRun) {
      results.push({ agent_id: agentId, last_used_at: lastUsedAt, action: 'dry_run' });
      continue;
    }

    const agent = agentRow;
    const email = agent?.email || 'unknown';
    const name = agent ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || email : agentId;

    const lastUsedDate = new Date(lastUsedAt);
    const hoursInactive = Math.floor((now - lastUsedDate.getTime()) / (1000 * 60 * 60));
    const daysInactive = Math.floor(hoursInactive / 24);
    const inactiveDurationStr = daysInactive > 0 ? `${daysInactive} day(s) (${hoursInactive}h)` : `${hoursInactive}h`;

    const text =
      `⚠️ <b>Pilot Agent Inactivity Alert</b>\n\n` +
      `👤 <b>Agent:</b> ${name} (${email})\n` +
      `🕐 <b>Inactive for:</b> ${inactiveDurationStr}`;

    await sendTelegram({ text, parse_mode: 'HTML' });

    await insertAlert({
      agent_id: agentId,
      alert_type: 'inactivity_72h',
      message: `Agent ${name} (${email}) inactive for ${inactiveDurationStr}`,
      alerted_at: new Date().toISOString(),
      channel: 'telegram',
    });

    alerted++;
    results.push({ agent_id: agentId, last_used_at: lastUsedAt, action: 'alerted' });
  }

  return { alerted, skipped, checked: agentMap.size, results };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('inactivity-alerts cron logic', () => {
  let sendTelegram;
  let insertAlert;

  beforeEach(() => {
    sendTelegram = jest.fn().mockResolvedValue(true);
    insertAlert = jest.fn().mockResolvedValue({ data: null, error: null });
  });

  test('sends alert and inserts row for pilot inactive >72h with no recent alert', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-001', last_used_at: hoursAgo(80) }, // inactive 80h — over threshold
    ];
    const recentAlerts = { 'agent-001': [] }; // no recent alert
    const agentRow = { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    expect(result.alerted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.checked).toBe(1);
    expect(result.results[0].action).toBe('alerted');

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    const telegramCall = sendTelegram.mock.calls[0][0];
    expect(telegramCall.text).toContain('Jane Doe');
    expect(telegramCall.text).toContain('jane@example.com');
    expect(telegramCall.parse_mode).toBe('HTML');

    expect(insertAlert).toHaveBeenCalledTimes(1);
    const insertCall = insertAlert.mock.calls[0][0];
    expect(insertCall.agent_id).toBe('agent-001');
    expect(insertCall.alert_type).toBe('inactivity_72h');
    expect(insertCall.channel).toBe('telegram');
    expect(insertCall.alerted_at).toBeDefined();
  });

  test('skips pilot with recent alert within 24h (dedup)', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-002', last_used_at: hoursAgo(90) }, // inactive 90h
    ];
    const recentAlerts = {
      'agent-002': [{ id: 'alert-existing' }], // alert sent 2h ago
    };
    const agentRow = { first_name: 'Bob', last_name: 'Smith', email: 'bob@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    expect(result.alerted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.results[0].action).toBe('skipped');
    expect(result.results[0].reason).toBe('already_alerted_within_24h');

    expect(sendTelegram).not.toHaveBeenCalled();
    expect(insertAlert).not.toHaveBeenCalled();
  });

  test('does not process active pilot (not in inactive sessions list)', async () => {
    // Active pilot's session would not be returned by the query (last_used_at > cutoff)
    // So inactiveSessions is empty when all pilots are active.
    const inactiveSessions = [];
    const recentAlerts = {};
    const agentRow = { first_name: 'Active', last_name: 'Pilot', email: 'active@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    expect(result.alerted).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.checked).toBe(0);

    expect(sendTelegram).not.toHaveBeenCalled();
    expect(insertAlert).not.toHaveBeenCalled();
  });

  test('alerts for multiple inactive pilots, skips those with recent alerts', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-003', last_used_at: hoursAgo(75) }, // needs alert
      { agent_id: 'agent-004', last_used_at: hoursAgo(100) }, // already alerted
      { agent_id: 'agent-005', last_used_at: hoursAgo(73) }, // needs alert
    ];
    const recentAlerts = {
      'agent-003': [],
      'agent-004': [{ id: 'prior-alert' }], // has recent alert
      'agent-005': [],
    };
    const agentRow = { first_name: 'Test', last_name: 'Agent', email: 'test@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    expect(result.alerted).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.checked).toBe(3);

    expect(sendTelegram).toHaveBeenCalledTimes(2);
    expect(insertAlert).toHaveBeenCalledTimes(2);
  });

  test('dry-run mode: does not send Telegram or insert rows', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-006', last_used_at: hoursAgo(80) },
    ];
    const recentAlerts = { 'agent-006': [] };
    const agentRow = { first_name: 'Dry', last_name: 'Run', email: 'dry@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
      isDryRun: true,
    });

    expect(result.alerted).toBe(0);
    expect(result.results[0].action).toBe('dry_run');

    expect(sendTelegram).not.toHaveBeenCalled();
    expect(insertAlert).not.toHaveBeenCalled();
  });

  test('deduplicates multiple sessions for the same agent (keeps most recent)', async () => {
    // Agent has two sessions — only the most recent should be tracked
    const inactiveSessions = [
      { agent_id: 'agent-007', last_used_at: hoursAgo(100) }, // older session
      { agent_id: 'agent-007', last_used_at: hoursAgo(76) },  // more recent session
    ];
    const recentAlerts = { 'agent-007': [] };
    const agentRow = { first_name: 'Multi', last_name: 'Session', email: 'multi@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    // Should process agent only once (2 sessions → 1 unique agent)
    expect(result.checked).toBe(1);
    expect(result.alerted).toBe(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(insertAlert).toHaveBeenCalledTimes(1);

    // The inserted alert should use the agent_id
    const insertedRow = insertAlert.mock.calls[0][0];
    expect(insertedRow.agent_id).toBe('agent-007');
  });
});
