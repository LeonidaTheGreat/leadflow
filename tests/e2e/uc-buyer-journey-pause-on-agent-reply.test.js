'use strict';

/**
 * E2E: UC-buyer-journey — AI pauses sequences when human agent replies
 *
 * Acceptance criteria:
 *   - paused_by_agent SequenceStatus exists in type + DB migration
 *   - send-manual route pauses sequences when human (not AI) sends
 *   - FUB webhook route handles textMessageSent / activityCreated
 *   - resumeSequence accepts both paused and paused_by_agent
 *   - next_send_at is set to null on agent pause
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 UC-buyer-journey: pause-on-agent-reply\n');

// ── SequenceStatus type includes paused_by_agent ───────────────────────────
const typesPath = path.join(ROOT, 'product/lead-response/dashboard/lib/types/sequences.ts');
const typesSrc = fs.readFileSync(typesPath, 'utf8');

check('SequenceStatus type declares paused_by_agent', () => {
  assert.ok(typesSrc.includes("'paused_by_agent'"), 'Must add paused_by_agent to SequenceStatus union');
});

// ── sequences.ts exports pauseSequencesByAgent ─────────────────────────────
const seqPath = path.join(ROOT, 'product/lead-response/dashboard/lib/sequences.ts');
const seqSrc = fs.readFileSync(seqPath, 'utf8');

check('sequences.ts exports pauseSequencesByAgent', () => {
  assert.ok(seqSrc.includes('export async function pauseSequencesByAgent'), 'Must export pauseSequencesByAgent');
});

check('pauseSequencesByAgent sets status to paused_by_agent', () => {
  const fnStart = seqSrc.indexOf('pauseSequencesByAgent');
  const snippet = seqSrc.slice(fnStart, fnStart + 600);
  assert.ok(snippet.includes("'paused_by_agent'"), 'pauseSequencesByAgent must set status to paused_by_agent');
});

check('pauseSequencesByAgent suppresses next_send_at (null)', () => {
  const fnStart = seqSrc.indexOf('pauseSequencesByAgent');
  const snippet = seqSrc.slice(fnStart, fnStart + 600);
  assert.ok(snippet.includes('next_send_at: null'), 'pauseSequencesByAgent must null out next_send_at');
});

check('resumeSequence accepts paused_by_agent status', () => {
  assert.ok(
    seqSrc.includes("'paused_by_agent'"),
    'resumeSequence must accept paused_by_agent via .in() filter'
  );
  const resumeIdx = seqSrc.indexOf('resumeSequence');
  const resumeSnippet = seqSrc.slice(resumeIdx, resumeIdx + 800);
  assert.ok(
    resumeSnippet.includes('paused_by_agent'),
    'resumeSequence must include paused_by_agent in status filter'
  );
});

// ── DB migration ───────────────────────────────────────────────────────────
const migPath = path.join(ROOT, 'product/lead-response/dashboard/supabase/migrations/014_pause_by_agent.sql');
const migSrc = fs.readFileSync(migPath, 'utf8');

check('Migration 014 adds paused_by_agent to CHECK constraint', () => {
  assert.ok(migSrc.includes('paused_by_agent'), 'Migration must add paused_by_agent to constraint');
});

check('Migration 014 creates pause_sequence_on_agent_reply function', () => {
  assert.ok(migSrc.includes('pause_sequence_on_agent_reply'), 'Migration must create trigger function');
});

check('Migration 014 creates pause_sequences_on_agent_outbound trigger', () => {
  assert.ok(migSrc.includes('pause_sequences_on_agent_outbound'), 'Migration must create the trigger');
});

check('Migration trigger fires on outbound non-AI messages', () => {
  assert.ok(
    migSrc.includes("direction = 'outbound'") && migSrc.includes('ai_generated = false'),
    'Trigger must check outbound + ai_generated = false'
  );
});

// ── send-manual route ──────────────────────────────────────────────────────
const manualPath = path.join(ROOT, 'product/lead-response/dashboard/app/api/sms/send-manual/route.ts');
const manualSrc = fs.readFileSync(manualPath, 'utf8');

check('send-manual route imports pauseSequencesByAgent', () => {
  assert.ok(manualSrc.includes('pauseSequencesByAgent'), 'send-manual must import pauseSequencesByAgent');
});

check('send-manual route only pauses on human sends (not AI)', () => {
  assert.ok(manualSrc.includes('!ai_assist'), 'Must guard pause behind !ai_assist check');
});

check('send-manual route returns sequences_paused count', () => {
  assert.ok(manualSrc.includes('sequences_paused'), 'Must return sequences_paused in response');
});

// ── FUB webhook route ──────────────────────────────────────────────────────
const fubRoutePath = path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/fub/route.ts');
const fubRouteSrc = fs.readFileSync(fubRoutePath, 'utf8');

check('FUB webhook route handles textMessageSent', () => {
  assert.ok(fubRouteSrc.includes('textMessageSent'), 'FUB route must handle textMessageSent');
});

check('FUB webhook route handles activityCreated', () => {
  assert.ok(fubRouteSrc.includes('activityCreated'), 'FUB route must handle activityCreated');
});

check('FUB webhook route calls handleAgentOutboundActivity', () => {
  assert.ok(fubRouteSrc.includes('handleAgentOutboundActivity'), 'Must call handleAgentOutboundActivity');
});

// ── FUB webhook service ────────────────────────────────────────────────────
const fubSvcPath = path.join(ROOT, 'product/lead-response/dashboard/lib/services/fub-webhook-service.ts');
const fubSvcSrc = fs.readFileSync(fubSvcPath, 'utf8');

check('fub-webhook-service exports handleAgentOutboundActivity', () => {
  assert.ok(fubSvcSrc.includes('export async function handleAgentOutboundActivity'), 'Must export the handler');
});

check('fub-webhook-service calls pauseSequencesByAgent', () => {
  assert.ok(fubSvcSrc.includes('pauseSequencesByAgent'), 'Service must call pauseSequencesByAgent');
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
