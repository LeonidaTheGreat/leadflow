'use strict';

const assert = require('assert');

const {
  PilotConversionService,
  createDefaultPilotConversionService
} = require('../../lib/services/PilotConversionService');

async function run() {
  await testRenderTemplateUsesFirstNameFields();
  await testSendConversionEmailLogsSkipWhenAgentUpgraded();
  await testSendConversionEmailSendsPersonalizedSubject();
  await testRunDailyConversionSequenceDelegatesToMainSequence();
  await testCompatibilityWrapperExposesBoundMethods();
  console.log('pilot-conversion-service-class.test.js: all tests passed');
}

async function testRenderTemplateUsesFirstNameFields() {
  const service = new PilotConversionService(null, mockEmailService());
  const content = service.renderTemplate(
    'day30_midpoint',
    { id: 'agent-1', first_name: 'Ava', last_name: 'Stone' },
    { leadsResponded: 3, avgResponseTime: '45 seconds', appointmentsBooked: 1 },
    'https://example.com/upgrade'
  );

  assert(content.html.includes('Hi Ava,'), 'HTML template should use first_name');
  assert(content.text.includes('Hi Ava,'), 'Text template should use first_name');
}

async function testSendConversionEmailLogsSkipWhenAgentUpgraded() {
  const service = new PilotConversionService({}, mockEmailService());
  const logEntries = [];

  service.hasAgentUpgraded = async () => true;
  service.logEmailSend = async (entry) => {
    logEntries.push(entry);
  };

  const result = await service.sendConversionEmail(
    { id: 'agent-2', email: 'upgraded@example.com', first_name: 'Mia' },
    'day_45'
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(result.reason, 'already_upgraded');
  assert.strictEqual(logEntries.length, 1);
  assert.strictEqual(logEntries[0].status, 'skipped');
  assert.strictEqual(logEntries[0].subject.includes('Mia'), true, 'Skip log should personalize subject');
}

async function testSendConversionEmailSendsPersonalizedSubject() {
  const sentMessages = [];
  const loggedEntries = [];
  const service = new PilotConversionService({}, mockEmailService(sentMessages));

  service.hasAgentUpgraded = async () => false;
  service.getAgentStats = async () => ({
    leadsResponded: 8,
    avgResponseTime: '42 seconds',
    appointmentsBooked: 2
  });
  service.logEmailSend = async (entry) => {
    loggedEntries.push(entry);
  };
  service.generateCheckoutUrl = () => 'https://example.com/checkout';

  const result = await service.sendConversionEmail(
    { id: 'agent-3', email: 'pilot@example.com', first_name: 'Lena', last_name: 'West' },
    'day_30'
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(sentMessages.length, 1);
  assert.strictEqual(sentMessages[0].subject.includes('Lena'), true, 'Email subject should use first_name');
  assert.strictEqual(loggedEntries.length, 1);
  assert.strictEqual(loggedEntries[0].status, 'sent');
  assert.strictEqual(loggedEntries[0].personalizedData.checkoutUrl, 'https://example.com/checkout');
}

async function testRunDailyConversionSequenceDelegatesToMainSequence() {
  const service = new PilotConversionService(null, mockEmailService());
  let delegated = false;

  service.runConversionSequence = async () => {
    delegated = true;
    return { ok: true };
  };

  const result = await service.runDailyConversionSequence();
  assert.strictEqual(delegated, true);
  assert.deepStrictEqual(result, { ok: true });
}

async function testCompatibilityWrapperExposesBoundMethods() {
  const wrapper = require('../../lib/pilot-conversion-service');
  const defaultService = createDefaultPilotConversionService();

  assert.strictEqual(typeof wrapper.runDailyConversionSequence, 'function');
  assert.strictEqual(typeof wrapper.sendConversionEmail, 'function');
  assert.strictEqual(typeof wrapper.PilotConversionService, 'function');
  assert.strictEqual(typeof defaultService.processMilestone, 'function');
}

function mockEmailService(sentMessages = []) {
  return {
    isConfigured() {
      return true;
    },
    async sendPilotConversion(payload) {
      sentMessages.push(payload);
      return { success: true, id: 'email-123' };
    }
  };
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
