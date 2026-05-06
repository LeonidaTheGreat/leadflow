'use strict';

const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');

describe('E2E: POST /api/admin/reactivation-campaign dryRun', () => {
  it('returns eligible count without sending emails', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: 5 }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 'a1', email: 'test@example.com', first_name: 'Test', trial_ends_at: '2026-01-01T00:00:00Z' },
          ],
        }),
    };
    const emailService = { sendLapsedTrialReactivation: jest.fn() };

    const service = new LapsedTrialReactivationService({ pool, emailService });
    const result = await service.runCampaign({ dryRun: true, limit: 100 });

    expect(result).toHaveProperty('eligible');
    expect(typeof result.eligible).toBe('number');
    expect(result.eligible).toBe(5);
    expect(result).toHaveProperty('agents');
    expect(Array.isArray(result.agents)).toBe(true);
    expect(emailService.sendLapsedTrialReactivation).not.toHaveBeenCalled();

    const countSql = pool.query.mock.calls[0][0];
    expect(countSql).toContain('trial_ends_at < NOW()');
    expect(countSql).toContain("COALESCE(aha_completed, false) = false");
    expect(countSql).toContain("COALESCE(subscription_status, 'inactive') != 'active'");
  });

  it('getStats returns campaign funnel metrics', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: 10 }] })
        .mockResolvedValueOnce({ rows: [{ sent: 3, opened_via_utm: 1, reactivated: 0 }] }),
    };

    const service = new LapsedTrialReactivationService({ pool });
    const stats = await service.getStats();

    expect(stats).toEqual({
      eligible: 10,
      sent: 3,
      opened_via_utm: 1,
      reactivated: 0,
    });
  });
});
