'use strict';

const PilotPhonelessReactivationService = require('../../lib/services/PilotPhonelessReactivationService');

describe('PilotPhonelessReactivationService', () => {
  let pool;
  let emailService;
  let service;

  const SAMPLE_SIGNUPS = [
    { id: 'ps-1', email: 'alice@example.com', name: 'Alice Smith', created_at: '2026-05-01T00:00:00.000Z' },
    { id: 'ps-2', email: 'bob@example.com', name: 'Bob Jones', created_at: '2026-05-02T00:00:00.000Z' },
  ];

  beforeEach(() => {
    pool = { query: jest.fn() };
    emailService = {
      send: jest.fn(),
      fromEmail: 'stojan@landyourleads.com',
    };
    service = new PilotPhonelessReactivationService({
      pool,
      emailService,
      bookingUrl: 'https://cal.com/stojan/15min',
      signupUrl: 'https://leadflow-ai-five.vercel.app/signup/trial',
    });
  });

  describe('dryRun', () => {
    it('returns eligible count and signups without sending emails', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 21 }] })
        .mockResolvedValueOnce({ rows: SAMPLE_SIGNUPS });

      const result = await service.runCampaign({ dryRun: true, limit: 2 });

      expect(result).toEqual({
        eligible: 21,
        signups: SAMPLE_SIGNUPS,
      });
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('queries pilot_signups filtering on missing phone and dedup via email_events', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.runCampaign({ dryRun: true });

      const [countSql, countParams] = pool.query.mock.calls[0];
      expect(countSql).toContain('phone IS NULL OR ps.phone');
      expect(countSql).toContain('email_events');
      expect(countParams[0]).toBe('pilot_phoneless_reactivation');

      const [eligibleSql, eligibleParams] = pool.query.mock.calls[1];
      expect(eligibleParams[0]).toBe('pilot_phoneless_reactivation');
      expect(eligibleSql).toContain('ORDER BY ps.created_at ASC');
    });
  });

  describe('live run', () => {
    it('sends email and logs to email_events for each eligible signup', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [SAMPLE_SIGNUPS[0]] })
        .mockResolvedValueOnce({ rows: [] }); // email_events insert

      emailService.send.mockResolvedValue({ success: true, resend_id: 're_abc' });

      const result = await service.runCampaign({ dryRun: false, limit: 10 });

      expect(emailService.send).toHaveBeenCalledTimes(1);
      const sendCall = emailService.send.mock.calls[0][0];
      expect(sendCall.to).toBe('alice@example.com');
      expect(sendCall.subject).toContain('LeadFlow');
      expect(sendCall.html).toContain('phone number');
      expect(sendCall.tags).toEqual([{ name: 'campaign', value: 'pilot-phoneless-reactivation' }]);

      // Should log to email_events
      const logCall = pool.query.mock.calls[2];
      expect(logCall[1][0]).toBe('pilot_phoneless_reactivation');
      expect(logCall[1][1]).toBe('alice@example.com');
      expect(logCall[1][3]).toBe('sent');

      expect(result.eligible).toBe(1);
      expect(result.sent_count).toBe(1);
      expect(result.failed_count).toBe(0);
      expect(result.sent[0]).toEqual({ id: 'ps-1', email: 'alice@example.com', resend_id: 're_abc' });
    });

    it('records failed send without throwing', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [SAMPLE_SIGNUPS[0]] })
        .mockResolvedValueOnce({ rows: [] });

      emailService.send.mockResolvedValue({ success: false, error: 'RESEND_API_KEY not configured' });

      const result = await service.runCampaign({ dryRun: false });

      expect(result.sent_count).toBe(0);
      expect(result.failed_count).toBe(1);
      expect(result.failed[0].error).toBe('RESEND_API_KEY not configured');

      const logCall = pool.query.mock.calls[2];
      expect(logCall[1][3]).toBe('failed');
    });

    it('extracts first name from full name in email', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [SAMPLE_SIGNUPS[1]] })
        .mockResolvedValueOnce({ rows: [] });

      emailService.send.mockResolvedValue({ success: true, resend_id: 're_xyz' });

      await service.runCampaign({ dryRun: false });

      const { html } = emailService.send.mock.calls[0][0];
      expect(html).toContain('Hi Bob');
    });

    it('uses "there" as fallback when name is missing', async () => {
      const namelessSignup = { id: 'ps-3', email: 'nameless@example.com', name: null, created_at: '2026-05-03T00:00:00.000Z' };
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [namelessSignup] })
        .mockResolvedValueOnce({ rows: [] });

      emailService.send.mockResolvedValue({ success: true });

      await service.runCampaign({ dryRun: false });

      const { html } = emailService.send.mock.calls[0][0];
      expect(html).toContain('Hi there');
    });
  });

  describe('constants', () => {
    it('exposes EMAIL_TYPE', () => {
      expect(PilotPhonelessReactivationService.EMAIL_TYPE).toBe('pilot_phoneless_reactivation');
    });
  });

  describe('throws when pool is not configured', () => {
    it('rejects runCampaign with missing pool', async () => {
      const noPoolService = new PilotPhonelessReactivationService({ emailService });
      await expect(noPoolService.runCampaign({ dryRun: true })).rejects.toThrow('DB pool not configured');
    });
  });
});
