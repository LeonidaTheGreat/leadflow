'use strict';

jest.mock('../../lib/db', () => ({
  getPool: jest.fn(() => ({ query: jest.fn() })),
}));

const mockRunCampaign = jest.fn();
const mockGetStats = jest.fn();
jest.mock('../../lib/services/LapsedTrialReactivationService', () => {
  return jest.fn().mockImplementation(() => ({
    runCampaign: mockRunCampaign,
    getStats: mockGetStats,
  }));
});

const router = require('../../routes/admin/reactivation-campaign');

function getHandler(path, method) {
  const layer = router.stack.find((entry) => (
    entry.route
    && entry.route.path === path
    && entry.route.methods
    && entry.route.methods[method]
  ));
  return layer.route.stack[0].handle;
}

function getPostHandler() {
  return getHandler('/api/admin/reactivation-campaign', 'post');
}

function getStatsHandler() {
  return getHandler('/api/admin/reactivation-campaign/stats', 'get');
}

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('POST /api/admin/reactivation-campaign', () => {
  const originalApiKey = process.env.LEADFLOW_API_KEY;
  const handler = getPostHandler();

  beforeEach(() => {
    process.env.LEADFLOW_API_KEY = 'admin-secret';
    mockRunCampaign.mockReset();
    mockGetStats.mockReset();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.LEADFLOW_API_KEY;
    else process.env.LEADFLOW_API_KEY = originalApiKey;
  });

  it('returns dry-run payload and delegates validated body to service', async () => {
    mockRunCampaign.mockResolvedValue({
      eligible: 2,
      agents: [
        { id: 'a1', email: 'a@example.com', first_name: 'A', trial_ends_at: '2026-01-01T00:00:00.000Z' },
      ],
    });

    const req = {
      headers: { leadflow_api_key: 'admin-secret' },
      body: { dryRun: true, limit: 5 },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      eligible: 2,
      agents: [{ id: 'a1', email: 'a@example.com', first_name: 'A', trial_ends_at: '2026-01-01T00:00:00.000Z' }],
    });
    expect(mockRunCampaign).toHaveBeenCalledWith({ dryRun: true, limit: 5 });
  });

  it('returns 401 for missing admin key', async () => {
    const req = {
      headers: {},
      body: { dryRun: true, limit: 5 },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(mockRunCampaign).not.toHaveBeenCalled();
  });

  it('runs live mode and returns campaign send summary', async () => {
    mockRunCampaign.mockResolvedValue({
      eligible: 1,
      attempted: 1,
      sent_count: 1,
      failed_count: 0,
      sent: [{ id: 'a1', email: 'a@example.com', resend_id: 're_1' }],
      failed: [],
    });

    const req = {
      headers: { 'x-api-key': 'admin-secret' },
      body: { dryRun: false, limit: 10 },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.sent_count).toBe(1);
    expect(mockRunCampaign).toHaveBeenCalledWith({ dryRun: false, limit: 10 });
  });
});

describe('GET /api/admin/reactivation-campaign/stats', () => {
  const originalApiKey = process.env.LEADFLOW_API_KEY;
  const handler = getStatsHandler();

  beforeEach(() => {
    process.env.LEADFLOW_API_KEY = 'admin-secret';
    mockGetStats.mockReset();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.LEADFLOW_API_KEY;
    else process.env.LEADFLOW_API_KEY = originalApiKey;
  });

  it('returns stats payload when authorized', async () => {
    mockGetStats.mockResolvedValue({ eligible: 10, sent_total: 42, sent_last_24h: 3 });

    const req = { headers: { leadflow_api_key: 'admin-secret' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ eligible: 10, sent_total: 42, sent_last_24h: 3 });
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it('returns 401 for missing admin key', async () => {
    const req = { headers: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(mockGetStats).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    mockGetStats.mockRejectedValue(new Error('db down'));

    const req = { headers: { 'x-api-key': 'admin-secret' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
