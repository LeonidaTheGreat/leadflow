'use strict';

/**
 * Unit tests for the inactivity alerting cron logic.
 * Tests the core behavior without Next.js machinery.
 *
 * Verifies:
 * 1. Inactive pilot with no recent alert → alert sent + row inserted
 * 2. Inactive pilot with recent alert (within 24h) → no duplicate (dedup)
 * 3. Active pilot (not in inactive sessions) → no alert
 * 4. Multiple pilots: correctly alerts new, skips already-alerted
 * 5. Dry-run mode: no Telegram send, no insert
 * 6. Multiple sessions per agent: deduped to single processing
 */

const INACTIVITY_THRESHOLD_HOURS = 72;
const DEDUP_WINDOW_HOURS = 24;

/**
 * Pure-function extraction of the inactivity alert loop logic.
 * Mirrors the logic in /api/cron/inactivity-alerts/route.ts.
 */
async function runInactivityAlertLogic({
  inactiveSessions,
  recentAlerts,
  agentRow,
  sendTelegram,
  insertAlert,
  isDryRun = false,
}) {
  const now = Date.now();

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
    // Check dedup via alerted_at
    const dedupResult = recentAlerts[agentId];
    if (!Array.isArray(dedupResult)) {
      // Error case
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
    const hoursInactive = Math.floor((now - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60));
    const daysInactive = Math.floor(hoursInactive / 24);
    const durationStr = daysInactive > 0 ? `${daysInactive} day(s) (${hoursInactive}h)` : `${hoursInactive}h`;

    const text = `⚠️ <b>Pilot Agent Inactivity Alert</b>\n\n👤 <b>Agent:</b> ${name} (${email})\n🕐 <b>Inactive for:</b> ${durationStr}`;

    await sendTelegram({ text, parse_mode: 'HTML' });

    await insertAlert({
      agent_id: agentId,
      alert_type: 'inactivity_72h',
      message: `Agent ${name} (${email}) inactive for ${durationStr}`,
      resolved: false,
      alerted_at: new Date().toISOString(),
      channel: 'telegram',
    });

    alerted++;
    results.push({ agent_id: agentId, last_used_at: lastUsedAt, action: 'alerted' });
  }

  return { alerted, skipped, checked: agentMap.size, results };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('inactivity-alerts cron logic', () => {
  let sendTelegram;
  let insertAlert;

  beforeEach(() => {
    sendTelegram = jest.fn().mockResolvedValue(true);
    insertAlert = jest.fn().mockResolvedValue({ data: null, error: null });
  });

  test('sends alert and inserts row for pilot inactive >72h with no recent alert', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-001', last_used_at: hoursAgo(80) },
    ];
    const recentAlerts = { 'agent-001': [] };
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

    // Verify insert uses correct columns (alerted_at + channel added by migration 046)
    expect(insertAlert).toHaveBeenCalledTimes(1);
    const insertCall = insertAlert.mock.calls[0][0];
    expect(insertCall.agent_id).toBe('agent-001');
    expect(insertCall.alert_type).toBe('inactivity_72h');
    expect(insertCall.channel).toBe('telegram');
    expect(insertCall.alerted_at).toBeDefined();
    expect(insertCall.resolved).toBe(false);
  });

  test('skips pilot with recent alert within 24h (dedup via alerted_at)', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-002', last_used_at: hoursAgo(90) },
    ];
    const recentAlerts = {
      'agent-002': [{ id: 'alert-existing', alerted_at: hoursAgo(2) }],
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

  test('does not process active pilot (not returned by inactive sessions query)', async () => {
    // Active pilots are excluded at the DB query level (last_used_at > cutoff)
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

  test('alerts multiple inactive pilots, skips those with recent alerts', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-003', last_used_at: hoursAgo(75) },
      { agent_id: 'agent-004', last_used_at: hoursAgo(100) }, // already alerted
      { agent_id: 'agent-005', last_used_at: hoursAgo(73) },
    ];
    const recentAlerts = {
      'agent-003': [],
      'agent-004': [{ id: 'prior-alert', alerted_at: hoursAgo(3) }],
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

  test('deduplicates multiple sessions for the same agent (keeps most recent last_used_at)', async () => {
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

    // Should process agent only once
    expect(result.checked).toBe(1);
    expect(result.alerted).toBe(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(insertAlert).toHaveBeenCalledTimes(1);

    const insertedRow = insertAlert.mock.calls[0][0];
    expect(insertedRow.agent_id).toBe('agent-007');
    expect(insertedRow.channel).toBe('telegram');
    expect(insertedRow.alerted_at).toBeDefined();
  });

  test('dedup check error causes agent to be skipped (not alerted)', async () => {
    const inactiveSessions = [
      { agent_id: 'agent-008', last_used_at: hoursAgo(80) },
    ];
    // Not an array → triggers error path
    const recentAlerts = { 'agent-008': 'error' };
    const agentRow = { first_name: 'Error', last_name: 'Case', email: 'err@example.com' };

    const result = await runInactivityAlertLogic({
      inactiveSessions,
      recentAlerts,
      agentRow,
      sendTelegram,
      insertAlert,
    });

    expect(result.alerted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.results[0].reason).toBe('dedup_check_failed');

    expect(sendTelegram).not.toHaveBeenCalled();
    expect(insertAlert).not.toHaveBeenCalled();
  });
});
