'use strict';

const assert = require('assert');
const EventEmitter = require('events');

const StuckPilotsService = require('../../lib/services/StuckPilotsService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function createTelegramRequest(statusCode = 200, body = '{"ok":true}') {
  return (options, callback) => {
    const response = new EventEmitter();
    response.statusCode = statusCode;

    const request = {
      on() {},
      setTimeout() {},
      write() {},
      end() {
        callback(response);
        response.emit('data', body);
        response.emit('end');
      },
      destroy() {},
    };

    request.capturedOptions = options;
    return request;
  };
}

async function run() {
  console.log('\n=== unit: StuckPilotsService ===\n');

  await check('returns skipped when Telegram config is incomplete', async () => {
    const pool = {
      async query() {
        throw new Error('query should not run');
      },
    };
    const service = new StuckPilotsService(pool, '');

    const result = await service.checkAndAlertStuckPilots({ chatId: '' });

    assert.deepStrictEqual(result, {
      alerted: 0,
      skipped: 'telegram_not_configured',
    });
  });

  await check('alerts each stuck pilot and marks only successful sends', async () => {
    const queries = [];
    const pool = {
      async query(sql, params) {
        queries.push({ sql, params });

        if (queries.length === 1) {
          return {
            rows: [
              {
                id: 'pilot-1',
                first_name: 'Ava',
                last_name: 'Stone',
                stage: 'invited',
                hours_in_stage: 49.1,
                last_contact_at: '2026-04-07T10:00:00.000Z',
                last_contact_type: 'email',
              },
              {
                id: 'pilot-2',
                first_name: 'Ben',
                last_name: 'Lane',
                stage: 'demo_booked',
                hours_in_stage: 26.2,
                last_contact_at: null,
                last_contact_type: null,
              },
            ],
          };
        }

        return { rows: [] };
      },
    };

    let sendCount = 0;
    const service = new StuckPilotsService(pool, 'bot-token');
    service.sendTelegramMessage = async () => {
      sendCount++;
      return sendCount === 1;
    };

    const result = await service.checkAndAlertStuckPilots({ chatId: 'chat-1' });

    assert.deepStrictEqual(result, { alerted: 1 });
    assert.strictEqual(queries.length, 2);
    assert.match(queries[0].sql, /FROM pilot_progress/);
    assert.strictEqual(queries[1].params[0], 'pilot-1');
  });

  await check('sendTelegramMessage uses Bot API endpoint and html mode', async () => {
    let writtenPayload = null;
    const telegramRequest = (options, callback) => {
      const response = new EventEmitter();
      response.statusCode = 200;

      return {
        on() {},
        setTimeout() {},
        write(payload) {
          writtenPayload = payload;
        },
        end() {
          callback(response);
          response.emit('data', '{"ok":true}');
          response.emit('end');
        },
        destroy() {},
      };
    };

    const service = new StuckPilotsService({ query: async () => ({ rows: [] }) }, 'abc123', {
      telegramRequest,
      logger: { log() {}, warn() {}, error() {} },
    });

    const result = await service.sendTelegramMessage('<b>x</b>', 'chat-1', '10788');

    assert.strictEqual(result, true);
    assert.match(writtenPayload, /"parse_mode":"HTML"/);
    assert.match(writtenPayload, /"message_thread_id":"10788"/);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
