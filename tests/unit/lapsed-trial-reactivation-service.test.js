'use strict';

const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');

describe('LapsedTrialReactivationService', () => {
  let pool;
  let emailService;
  let service;

  beforeEach(() => {
    pool = { query: jest.fn() };
    emailService = { sendLapsedTrialReactivation: jest.fn() };
    service = new LapsedTrialReactivationService({
      pool,
      emailService,
      appUrl: 'https://leadflow-ai-five.vercel.app',
    });
  });

  it('dryRun returns eligible count and agents without sending emails', async () => {
    const eligibleRows = [
      {
        id: 'a1',
        email: 'agent1@example.com',
        first_name: 'Ava',
        trial_ends_at: '2026-03-20T10:00:00.000Z',
      },
      {
        id: 'a2',
        email: 'agent2@example.com',
        first_name: 'Mia',
        trial_ends_at: '2026-03-21T11:00:00.000Z',
      },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 7 }] })
      .mockResolvedValueOnce({ rows: eligibleRows });

    const result = await service.runCampaign({ dryRun: true, limit: 2 });

    expect(result).toEqual({
      eligible: 7,
      agents: [
        {
          id: 'a1',
          email: 'agent1@example.com',
          first_name: 'Ava',
          trial_ends_at: '2026-03-20T10:00:00.000Z',
        },
        {
          id: 'a2',
          email: 'agent2@example.com',
          first_name: 'Mia',
          trial_ends_at: '2026-03-21T11:00:00.000Z',
        },
      ],
    });

    expect(emailService.sendLapsedTrialReactivation).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(2);

    const eligibilitySql = pool.query.mock.calls[1][0];
    expect(eligibilitySql).toContain('trial_ends_at < NOW()');
    expect(eligibilitySql).toContain("COALESCE(subscription_status, 'inactive') != 'active'");
    expect(eligibilitySql).toContain('COALESCE(trial_email_expired_sent, false) = false');
  });

  it('getStats returns eligible, sent_total, and sent_last_24h counts', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ eligible: 10, sent_total: 42, sent_last_24h: 3 }],
    });

    const result = await service.getStats();

    expect(result).toEqual({ eligible: 10, sent_total: 42, sent_last_24h: 3 });
    expect(pool.query).toHaveBeenCalledTimes(1);

    const statsSql = pool.query.mock.calls[0][0];
    expect(statsSql).toContain('COUNT(*) FILTER');
    expect(statsSql).toContain("COALESCE(subscription_status, 'inactive') != 'active'");
    expect(statsSql).toContain('COALESCE(trial_email_expired_sent, false) = true');
    expect(statsSql).toContain("INTERVAL '24 hours'");
  });

  it('getStats returns zeros when no rows match', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await service.getStats();

    expect(result).toEqual({ eligible: 0, sent_total: 0, sent_last_24h: 0 });
  });

  it('getStats throws when pool is missing', async () => {
    const bare = new LapsedTrialReactivationService({});
    await expect(bare.getStats()).rejects.toThrow('DB pool not configured');
  });

  it('live run sends email payload and marks trial_email_expired_sent=true for successful sends', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'a1',
          email: 'agent1@example.com',
          first_name: 'Ava',
          trial_ends_at: '2026-03-20T10:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    emailService.sendLapsedTrialReactivation.mockResolvedValue({ success: true, resend_id: 're_123' });

    const result = await service.runCampaign({ dryRun: false, limit: 10 });

    expect(emailService.sendLapsedTrialReactivation).toHaveBeenCalledTimes(1);
    expect(emailService.sendLapsedTrialReactivation).toHaveBeenCalledWith({
      to: 'agent1@example.com',
      firstName: 'Ava',
      dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard?utm_source=reactivation_email&utm_medium=email&utm_campaign=lapsed_trial_reactivation',
    });

    const updateSql = pool.query.mock.calls[2][0];
    const updateParams = pool.query.mock.calls[2][1];
    expect(updateSql).toContain('trial_email_expired_sent = true');
    expect(updateParams).toEqual(['a1']);

    expect(result.eligible).toBe(1);
    expect(result.sent_count).toBe(1);
    expect(result.failed_count).toBe(0);
    expect(result.sent[0].resend_id).toBe('re_123');
  });
});
