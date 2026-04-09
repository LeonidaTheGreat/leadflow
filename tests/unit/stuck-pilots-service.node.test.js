'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');

const {
  StuckPilotsService,
} = require('../../lib/services/StuckPilotsService');

function createHttpsModule(statusCode = 200) {
  return {
    request(options, callback) {
      const response = new EventEmitter();
      response.statusCode = statusCode;

      const request = new EventEmitter();
      request.setTimeout = () => {};
      request.destroy = () => {};
      request.write = () => {};
      request.end = () => {
        callback(response);
        response.emit('data', '{"ok":true}');
        response.emit('end');
      };

      return request;
    }
  };
}

test('StuckPilotsService#checkAndAlertStuckPilots skips when Telegram is not configured', async () => {
  let queried = false;
  const pool = {
    async query() {
      queried = true;
      return { rows: [] };
    }
  };

  const service = new StuckPilotsService(pool, null, { chatId: null });
  const result = await service.checkAndAlertStuckPilots();

  assert.deepEqual(result, { alerted: 0, skipped: 'telegram_not_configured' });
  assert.equal(queried, false);
});

test('StuckPilotsService#checkAndAlertStuckPilots sends alerts and marks each pilot', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return {
          rows: [
            {
              id: 'pilot-1',
              agent_id: 'agent-1',
              stage: 'trial_started',
              stage_entered_at: '2026-04-07T12:00:00.000Z',
              last_contact_at: '2026-04-08T12:00:00.000Z',
              last_contact_type: 'email',
              first_name: 'Jane',
              last_name: 'Doe',
              hours_in_stage: 49.2,
            }
          ]
        };
      }

      return { rows: [] };
    }
  };

  const service = new StuckPilotsService(pool, 'bot-token', {
    chatId: 'chat-id',
    dashboardUrl: 'https://example.com/pilots',
    httpsModule: createHttpsModule(),
  });

  const result = await service.checkAndAlertStuckPilots();

  assert.deepEqual(result, { alerted: 1 });
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /FROM pilot_progress pp/);
  assert.equal(queries[1].sql, 'UPDATE pilot_progress SET stuck_since = NOW() WHERE id = $1');
  assert.deepEqual(queries[1].params, ['pilot-1']);

  const message = service.buildAlertMessage(
    {
      first_name: 'Jane',
      last_name: 'Doe',
      stage: 'trial_started',
      hours_in_stage: 49.2,
      last_contact_at: '2026-04-08T12:00:00.000Z',
      last_contact_type: 'email',
    },
    service.dashboardUrl
  );

  assert.match(message, /Jane Doe/);
  assert.match(message, /trial_started/);
  assert.match(message, /https:\/\/example.com\/pilots/);
});
