/**
 * E2E Test: Twilio Dual Handler Fix
 * Task: e987e4e7-dd8c-4b78-b6b6-912014cf4090
 *
 * Acceptance criteria:
 * 1. integration/twilio-inbound-sms.js is marked @deprecated
 * 2. server.js does NOT register the legacy twilio handler
 * 3. Next.js handler handles STOP/opt-out and sends TCPA confirmation TwiML
 * 4. Next.js handler handles opt-in keywords
 * 5. server.js health check does not advertise the legacy twilio endpoint
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/clawdbot/projects/leadflow';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

// 1. Legacy file has @deprecated notice
test('integrations/twilio-inbound-sms.js is marked @deprecated', () => {
  const content = fs.readFileSync(path.join(ROOT, 'integrations/twilio-inbound-sms.js'), 'utf8');
  assert.ok(content.includes('@deprecated'), 'File must include @deprecated annotation');
  assert.ok(content.includes('DO NOT USE IN PRODUCTION') || content.includes('LEGACY'), 'Must have LEGACY/DO NOT USE warning');
});

// 2. Legacy file points to Next.js handler as the replacement
test('integrations/twilio-inbound-sms.js names the Next.js handler as replacement', () => {
  const content = fs.readFileSync(path.join(ROOT, 'integrations/twilio-inbound-sms.js'), 'utf8');
  assert.ok(
    content.includes('product/lead-response/dashboard/app/api/webhook/twilio/route.ts') ||
    content.includes('leadflow-ai-five.vercel.app'),
    'Must reference production Next.js handler'
  );
});

// 3. server.js does NOT require the legacy handler
test('server.js does not require integration/twilio-inbound-sms', () => {
  const content = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.ok(!content.includes("require('./integration/twilio-inbound-sms')"), 'Must not require legacy handler (integration/)');
  assert.ok(!content.includes("require('./integrations/twilio-inbound-sms')"), 'Must not require legacy handler (integrations/)');
});

// 4. server.js does NOT register the legacy twilio route
test('server.js does not use twilioInboundRouter', () => {
  const content = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.ok(!content.includes('twilioInboundRouter'), 'Must not reference twilioInboundRouter');
});

// 5. server.js health check does not advertise the legacy twilio_inbound webhook
test('server.js health check does not advertise legacy twilio_inbound endpoint', () => {
  const content = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.ok(!content.includes('twilio_inbound'), 'Health check must not advertise legacy twilio_inbound route');
});

// 6. Next.js handler handles STOP opt-out (logic check)
test('Next.js route.ts contains opt-out keyword handling for STOP', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/twilio/route.ts'), 'utf8'
  );
  assert.ok(content.includes("'stop'"), 'Must contain stop opt-out keyword');
  assert.ok(content.includes('isOptingOut'), 'Must have isOptingOut detection');
});

// 7. Next.js handler sends TCPA confirmation TwiML on opt-out
test('Next.js route.ts sends TwiML confirmation on opt-out', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/twilio/route.ts'), 'utf8'
  );
  assert.ok(content.includes('unsubscribed') || content.includes('You have been unsubscribed'), 'Must send unsubscribe confirmation');
  assert.ok(content.includes('<Message>'), 'Must send TwiML <Message> on opt-out');
});

// 8. Next.js handler sets dnc=true and consent_sms=false on opt-out
test('Next.js route.ts sets dnc=true and consent_sms=false on opt-out', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/twilio/route.ts'), 'utf8'
  );
  assert.ok(content.includes('dnc: true'), 'Must set dnc=true on opt-out');
  assert.ok(content.includes('consent_sms: false'), 'Must set consent_sms=false on opt-out');
});

// 9. Next.js handler handles opt-in keywords
test('Next.js route.ts handles opt-in keyword START', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/twilio/route.ts'), 'utf8'
  );
  assert.ok(content.includes("'start'"), 'Must handle START opt-in keyword');
  assert.ok(content.includes('isOptingIn'), 'Must have isOptingIn detection');
});

// 10. Next.js handler checks DNC before responding
test('Next.js route.ts checks DNC / consent before responding', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/webhook/twilio/route.ts'), 'utf8'
  );
  assert.ok(content.includes('lead.dnc'), 'Must check lead.dnc');
  assert.ok(content.includes('consent_sms'), 'Must check consent_sms');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
