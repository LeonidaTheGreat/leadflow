'use strict';

const assert = require('assert');
const FUBService = require('../../lib/services/FUBService');
const AiSmsService = require('../../lib/services/AiSmsService');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 UC: FUBService real AI SMS response\n');

  const silentLogger = { log() {}, warn() {}, error() {} };

  await test('generateAiSmsResponse no longer contains hardcoded "matching your interests"', async () => {
    const service = new FUBService({
      registerEventHandlers: false,
      logger: silentLogger
    });

    const lead = {
      id: 'lead-1',
      firstName: 'Sarah',
      phoneNumber: '+14165550001',
      assignedTo: { id: 'agent-1', name: 'Marcus Johnson' }
    };

    const result = await service.generateAiSmsResponse(lead);
    assert.ok(!result.message.includes('matching your interests'),
      `Message should not contain hardcoded template text. Got: "${result.message}"`);
  });

  await test('fallback response includes lead first name and agent first name (not env var)', async () => {
    const origAgentName = process.env.AGENT_NAME;
    process.env.AGENT_NAME = 'ENV_VAR_AGENT';
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const aiService = new AiSmsService({ logger: silentLogger });
      const service = new FUBService({
        registerEventHandlers: false,
        logger: silentLogger,
        aiSmsService: aiService
      });

      const lead = {
        id: 'lead-2',
        firstName: 'Jordan',
        phoneNumber: '+14165550002',
        assignedTo: { id: 'agent-2', name: 'Emily Chen' }
      };

      const result = await service.generateAiSmsResponse(lead);
      assert.ok(result.message.includes('Jordan'),
        `Message should include lead first name "Jordan". Got: "${result.message}"`);
      assert.ok(result.message.includes('Emily'),
        `Message should include agent first name "Emily". Got: "${result.message}"`);
      assert.ok(!result.message.includes('ENV_VAR_AGENT'),
        `Message should NOT use process.env.AGENT_NAME. Got: "${result.message}"`);
    } finally {
      if (origAgentName !== undefined) {
        process.env.AGENT_NAME = origAgentName;
      } else {
        delete process.env.AGENT_NAME;
      }
    }
  });

  await test('AI service used when ANTHROPIC_API_KEY is set (mock API)', async () => {
    const mockAiService = new AiSmsService({
      logger: silentLogger,
      apiKey: 'test-key',
      axios: {
        post: async () => ({
          data: {
            content: [{ text: 'Hey Jordan, Emily here! Would love to help you find a place in Toronto.' }]
          }
        })
      }
    });

    const service = new FUBService({
      registerEventHandlers: false,
      logger: silentLogger,
      aiSmsService: mockAiService
    });

    const lead = {
      id: 'lead-3',
      firstName: 'Jordan',
      phoneNumber: '+14165550003',
      assignedTo: { id: 'agent-3', name: 'Emily Chen' }
    };

    const result = await service.generateAiSmsResponse(lead);
    assert.ok(result.message.includes('Jordan'),
      `AI response should include lead name. Got: "${result.message}"`);
    assert.ok(result.message.includes('Emily'),
      `AI response should include agent name. Got: "${result.message}"`);
    assert.strictEqual(result.confidence, 0.9);
  });

  await test('falls back gracefully on API error', async () => {
    const mockAiService = new AiSmsService({
      logger: silentLogger,
      apiKey: 'test-key',
      axios: {
        post: async () => { throw new Error('API timeout'); }
      }
    });

    const service = new FUBService({
      registerEventHandlers: false,
      logger: silentLogger,
      aiSmsService: mockAiService
    });

    const lead = {
      id: 'lead-4',
      firstName: 'Alex',
      phoneNumber: '+14165550004',
      assignedTo: { id: 'agent-4', name: 'Maria Garcia' }
    };

    const result = await service.generateAiSmsResponse(lead);
    assert.ok(result.message.includes('Alex'),
      `Fallback should include lead name. Got: "${result.message}"`);
    assert.ok(result.message.includes('Maria'),
      `Fallback should include agent name. Got: "${result.message}"`);
    assert.strictEqual(result.confidence, 0.7);
  });

  await test('agent_intro trigger uses agentName from options', async () => {
    const aiService = new AiSmsService({ logger: silentLogger });
    const service = new FUBService({
      registerEventHandlers: false,
      logger: silentLogger,
      aiSmsService: aiService
    });

    const lead = {
      id: 'lead-5',
      firstName: 'Taylor',
      phoneNumber: '+14165550005',
      assignedTo: null
    };

    const result = await service.generateAiSmsResponse(lead, {
      trigger: 'agent_intro',
      agentName: 'David Park'
    });

    assert.ok(result.message.includes('David'),
      `Agent intro should use provided agent name. Got: "${result.message}"`);
    assert.ok(result.message.includes('Taylor'),
      `Agent intro should include lead name. Got: "${result.message}"`);
    assert.strictEqual(result.trigger, 'agent_intro');
  });

  await test('buildSmsPrompt includes agent and lead context', async () => {
    const aiService = new AiSmsService({ logger: silentLogger });

    const lead = {
      firstName: 'Sam',
      location: 'Toronto',
      assignedTo: { name: 'Lisa Wong' }
    };
    const agent = { name: 'Lisa Wong' };

    const prompt = aiService.buildSmsPrompt(lead, agent, { trigger: 'initial_response' });
    assert.ok(prompt.includes('Lisa Wong'), 'Prompt should include agent name');
    assert.ok(prompt.includes('Sam'), 'Prompt should include lead name');
    assert.ok(prompt.includes('Toronto'), 'Prompt should include location');
    assert.ok(prompt.includes('initial_response'), 'Prompt should include trigger');
  });

  await test('handleLeadCreated sends SMS with real AI (mocked API)', async () => {
    const sentMessages = [];
    const mockAiService = new AiSmsService({
      logger: silentLogger,
      apiKey: 'test-key',
      axios: {
        post: async () => ({
          data: {
            content: [{ text: 'Hi Ava, Marcus here! Excited to help you find your perfect home. What area are you looking in?' }]
          }
        })
      }
    });

    const service = new FUBService({
      registerEventHandlers: false,
      logger: silentLogger,
      aiSmsService: mockAiService,
      sendSmsViatwilio: async (phone, message, meta) => {
        sentMessages.push({ phone, message, meta });
        return { sid: 'SM_TEST', status: 'queued' };
      },
      scheduleSatisfactionPing: () => {},
      createLeadSequence: async () => ({}),
      findLeadByFubId: async () => 'internal-id'
    });

    service.fetchLeadFromFub = async () => ({
      id: 'fub-1',
      firstName: 'Ava',
      phoneNumber: '+14165551234',
      consents: { sms: true },
      assignedTo: { id: 'agent-1', name: 'Marcus Johnson' }
    });
    service.checkDncStatus = async () => false;
    service.logSmsInFub = async () => {};

    await service.handleLeadCreated({ id: 'fub-1', phoneNumber: '+14165551234' });

    assert.strictEqual(sentMessages.length, 1, 'Should send exactly one SMS');
    assert.ok(sentMessages[0].message.includes('Ava'),
      `Outbound SMS should contain lead first name "Ava". Got: "${sentMessages[0].message}"`);
    assert.ok(sentMessages[0].message.includes('Marcus'),
      `Outbound SMS should contain agent first name "Marcus". Got: "${sentMessages[0].message}"`);
    assert.ok(!sentMessages[0].message.includes('matching your interests'),
      'Outbound SMS should not contain hardcoded template text');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Fatal test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
