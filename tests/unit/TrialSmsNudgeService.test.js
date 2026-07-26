'use strict';

const TrialSmsNudgeService = require('../../lib/services/TrialSmsNudgeService');

describe('TrialSmsNudgeService', () => {
  let service;
  let mockPool;
  let mockTwilio;

  const makeAgent = (overrides = {}) => ({
    id: 'agent-uuid-1',
    first_name: 'Jane',
    phone_number: '+15551234567',
    trial_ends_at: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    mockTwilio = {
      sendSms: jest.fn().mockResolvedValue({ success: true, sid: 'SM123' }),
    };
    mockPool = {
      query: jest.fn(),
    };
    service = new TrialSmsNudgeService({
      pool: mockPool,
      twilioService: mockTwilio,
      appUrl: 'https://test.example.com',
    });
  });

  describe('runNudgeSequence — dry run', () => {
    it('returns eligible counts without sending SMS', async () => {
      const agent = makeAgent();
      mockPool.query.mockResolvedValue({ rows: [agent] });

      const results = await service.runNudgeSequence({ dryRun: true });

      expect(mockTwilio.sendSms).not.toHaveBeenCalled();
      expect(results.stepsProcessed).toBe(3);
      expect(results.totalEligible).toBe(3); // one agent per step (mocked)
      expect(results.totalSent).toBe(0);
      expect(results.byStep.day3.skipped).toBe(1);
      expect(results.byStep.day7.skipped).toBe(1);
      expect(results.byStep.day12.skipped).toBe(1);
    }, 10000);

    it('returns zero when no eligible agents', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const results = await service.runNudgeSequence({ dryRun: true });

      expect(results.totalEligible).toBe(0);
      expect(results.totalSent).toBe(0);
    }, 10000);
  });

  describe('runNudgeSequence — live send', () => {
    it('sends SMS and marks agent when Twilio succeeds', async () => {
      const agent = makeAgent();
      // First query = eligible list; second = UPDATE (no rows returned)
      mockPool.query
        .mockResolvedValueOnce({ rows: [agent] }) // day3 eligible
        .mockResolvedValueOnce({ rows: [] })       // day3 UPDATE
        .mockResolvedValueOnce({ rows: [] })       // day7 eligible
        .mockResolvedValueOnce({ rows: [] });      // day12 eligible

      const results = await service.runNudgeSequence();

      expect(mockTwilio.sendSms).toHaveBeenCalledTimes(1);
      expect(mockTwilio.sendSms).toHaveBeenCalledWith(
        '+15551234567',
        expect.stringContaining('Jane'),
        expect.objectContaining({ trigger: 'trial-sms-nudge-day3' })
      );

      // Mark-sent UPDATE must have run
      const updateCall = mockPool.query.mock.calls[1];
      expect(updateCall[0]).toContain('trial_sms_day3_sent = true');
      expect(updateCall[1]).toEqual(['agent-uuid-1']);

      expect(results.byStep.day3.sent).toBe(1);
      expect(results.totalSent).toBe(1);
      expect(results.totalFailed).toBe(0);
    }, 10000);

    it('counts failure and continues when Twilio throws', async () => {
      const agent = makeAgent();
      mockPool.query
        .mockResolvedValueOnce({ rows: [agent] }) // day3 eligible
        .mockResolvedValueOnce({ rows: [] })       // day7 eligible
        .mockResolvedValueOnce({ rows: [] });      // day12 eligible

      mockTwilio.sendSms.mockRejectedValue(new Error('Twilio error'));

      const results = await service.runNudgeSequence();

      expect(results.byStep.day3.failed).toBe(1);
      expect(results.totalFailed).toBe(1);
      expect(results.totalSent).toBe(0);
      // No UPDATE query should have run
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    }, 10000);

    it('does not mark agent when Twilio returns success:false', async () => {
      const agent = makeAgent();
      mockPool.query
        .mockResolvedValueOnce({ rows: [agent] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockTwilio.sendSms.mockResolvedValue({ success: false });

      const results = await service.runNudgeSequence();

      expect(results.byStep.day3.failed).toBe(1);
      // Pool should only have been called 3 times (the 3 eligible queries) — no UPDATE
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    }, 10000);

    it('sends correct message for each step', async () => {
      // Return one agent for each step
      mockPool.query.mockResolvedValue({ rows: [makeAgent()] });

      await service.runNudgeSequence();

      const calls = mockTwilio.sendSms.mock.calls;
      expect(calls[0][1]).toContain('11 days left');
      expect(calls[1][1]).toContain('halfway done');
      expect(calls[2][1]).toContain('2 days left');
    }, 10000);

    it('upgrade URL contains appUrl and agent ref', async () => {
      const agent = makeAgent({ id: 'test-agent-id' });
      mockPool.query
        .mockResolvedValueOnce({ rows: [agent] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.runNudgeSequence();

      const message = mockTwilio.sendSms.mock.calls[0][1];
      expect(message).toContain('https://test.example.com/upgrade');
      expect(message).toContain('test-agent-id');
    }, 10000);
  });

  describe('getEligibleAgents', () => {
    it('returns agents from all three steps with nudgeStep set', async () => {
      const agentA = makeAgent({ id: 'a1' });
      const agentB = makeAgent({ id: 'b1' });
      const agentC = makeAgent({ id: 'c1' });

      mockPool.query
        .mockResolvedValueOnce({ rows: [agentA] })  // day3
        .mockResolvedValueOnce({ rows: [agentB] })  // day7
        .mockResolvedValueOnce({ rows: [agentC] }); // day12

      const eligible = await service.getEligibleAgents();

      expect(eligible).toHaveLength(3);
      expect(eligible[0].nudgeStep).toBe('day3');
      expect(eligible[1].nudgeStep).toBe('day7');
      expect(eligible[2].nudgeStep).toBe('day12');
    }, 10000);

    it('returns empty array when no agents are eligible', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const eligible = await service.getEligibleAgents();

      expect(eligible).toEqual([]);
    }, 10000);
  });

  describe('constructor defaults', () => {
    it('accepts pool without other options', () => {
      const svc = new TrialSmsNudgeService({ pool: mockPool });
      expect(svc.pool).toBe(mockPool);
    });

    it('normalises trailing slash in appUrl', () => {
      const svc = new TrialSmsNudgeService({
        pool: mockPool,
        appUrl: 'https://example.com/',
      });
      const url = svc._buildUpgradeUrl('abc');
      expect(url).not.toContain('//upgrade');
    });
  });
});
