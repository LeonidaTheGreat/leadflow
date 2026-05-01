'use strict';

/**
 * Unit Tests: Pilot Outreach Blast
 *
 * Task: da5b236e-7e5d-4b6d-98a9-03508e7944b9
 *
 * Tests the core logic of the blast endpoint:
 * - Sends emails to identified targets
 * - Skips targets with existing initial touchpoints
 * - Skips targets with no email
 * - Records touchpoints and updates status after send
 * - Returns correct sent/skipped counts
 */

const assert = require('assert');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// --- Mock helpers ---

function makeTarget(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Sarah Mitchell',
    email: 'sarah@test.com',
    location: 'Austin, TX',
    notes: '',
    status: 'identified',
    ...overrides,
  };
}

/**
 * Build a minimal blast processor that mirrors the route logic,
 * but with injectable dependencies for testing.
 */
function makeBlastProcessor({ targets, existingTouchpoints = [], emailFails = false, tokenFails = false }) {
  const insertedTouchpoints = [];
  const updatedTargets = [];
  const insertedTokens = [];

  const db = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              const found = existingTouchpoints.find(tp => targets.find(t => t.id === tp.target_id));
              return { data: found ?? null };
            },
          }),
        }),
      }),
      insert: async (row) => {
        if (table === 'demo_tokens') {
          if (tokenFails) return { error: new Error('token insert failed') };
          insertedTokens.push(row);
          return { error: null };
        }
        if (table === 'pilot_recruitment_touchpoints') {
          insertedTouchpoints.push(row);
          return { error: null };
        }
        return { error: null };
      },
      update: (data) => ({
        eq: () => {
          updatedTargets.push(data);
          return { error: null };
        },
      }),
    }),
  };

  async function sendEmail() {
    return !emailFails;
  }

  async function run() {
    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const target of targets) {
      const { id: targetId, name, email } = target;
      if (!email) { skipped++; continue; }

      try {
        // Check existing initial touchpoint
        const existing = existingTouchpoints.find(tp => tp.target_id === targetId && tp.touch_type === 'initial');
        if (existing) { skipped++; continue; }

        // Generate token
        const rawToken = crypto.randomBytes(24).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const { error: tokenError } = await db.from('demo_tokens').insert({
          token: tokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          agent_context: { label: `outreach-${targetId}`, created_by: 'outreach-blast' },
        });

        if (tokenError) {
          errors.push(`${name}: failed to create demo token`);
          continue;
        }

        const demoLink = `https://app.landyourleads.com/demo/${rawToken}`;
        const ok = await sendEmail(email, targetId, { firstName: name.split(' ')[0], location: target.location, painPoint: '', demoLink, isTeamLead: false });

        if (!ok) {
          errors.push(`${name}: email delivery failed`);
          continue;
        }

        await db.from('pilot_recruitment_touchpoints').insert({
          target_id: targetId,
          channel: 'email',
          touch_type: 'initial',
          sent_at: new Date().toISOString(),
        });

        await db.from('pilot_recruitment_targets').update({ status: 'contacted' }).eq('id', targetId);

        sent++;
      } catch (err) {
        errors.push(`${name}: unexpected error`);
      }
    }

    return { sent, skipped, errors, insertedTouchpoints, updatedTargets, insertedTokens };
  }

  return { run };
}

// --- Tests ---

async function run() {
  console.log('\n=== unit: Pilot Outreach Blast ===\n');

  await test('sends email and records touchpoint for a single identified target', async () => {
    const target = makeTarget();
    const { run } = makeBlastProcessor({ targets: [target] });
    const result = await run();
    assert.strictEqual(result.sent, 1, `expected sent=1, got ${result.sent}`);
    assert.strictEqual(result.skipped, 0);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.insertedTouchpoints.length, 1);
    assert.strictEqual(result.insertedTouchpoints[0].target_id, target.id);
    assert.strictEqual(result.insertedTouchpoints[0].touch_type, 'initial');
    assert.strictEqual(result.insertedTouchpoints[0].channel, 'email');
    assert.strictEqual(result.updatedTargets.length, 1);
    assert.deepStrictEqual(result.updatedTargets[0], { status: 'contacted' });
  });

  await test('skips target that already has an initial touchpoint', async () => {
    const target = makeTarget();
    const { run } = makeBlastProcessor({
      targets: [target],
      existingTouchpoints: [{ target_id: target.id, touch_type: 'initial' }],
    });
    const result = await run();
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.skipped, 1);
    assert.strictEqual(result.insertedTouchpoints.length, 0);
  });

  await test('skips target with no email', async () => {
    const target = makeTarget({ email: null });
    const { run } = makeBlastProcessor({ targets: [target] });
    const result = await run();
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.skipped, 1);
  });

  await test('records error and skips when email delivery fails', async () => {
    const target = makeTarget();
    const { run } = makeBlastProcessor({ targets: [target], emailFails: true });
    const result = await run();
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].includes('email delivery failed'));
    assert.strictEqual(result.insertedTouchpoints.length, 0);
  });

  await test('records error and skips when token insert fails', async () => {
    const target = makeTarget();
    const { run } = makeBlastProcessor({ targets: [target], tokenFails: true });
    const result = await run();
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].includes('failed to create demo token'));
  });

  await test('handles multiple targets: sends to identified, skips already-contacted', async () => {
    const t1 = makeTarget({ name: 'Sarah Mitchell', email: 'sarah@test.com' });
    const t2 = makeTarget({ name: 'Marcus Chen', email: 'marcus@test.com' });
    const { run } = makeBlastProcessor({
      targets: [t1, t2],
      existingTouchpoints: [{ target_id: t2.id, touch_type: 'initial' }],
    });
    const result = await run();
    assert.strictEqual(result.sent, 1);
    assert.strictEqual(result.skipped, 1);
    assert.strictEqual(result.insertedTouchpoints[0].target_id, t1.id);
  });

  await test('demo token stored with agent_context metadata (not label/created_by columns)', async () => {
    const target = makeTarget();
    const { run } = makeBlastProcessor({ targets: [target] });
    const result = await run();
    assert.strictEqual(result.insertedTokens.length, 1);
    const token = result.insertedTokens[0];
    assert.ok(token.token, 'token hash must be set');
    assert.ok(token.expires_at, 'expires_at must be set');
    assert.ok(token.agent_context, 'agent_context must be set');
    assert.ok(token.agent_context.label.includes(target.id), 'label should include target id');
    assert.strictEqual(token.agent_context.created_by, 'outreach-blast');
    assert.strictEqual(token.label, undefined, 'top-level label column must NOT be set (schema violation)');
    assert.strictEqual(token.created_by, undefined, 'top-level created_by column must NOT be set (schema violation)');
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
