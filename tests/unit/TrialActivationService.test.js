const TrialActivationService = require('../../lib/services/TrialActivationService');

describe('TrialActivationService', () => {
  let service;
  let mockPool;
  let mockEmailService;

  beforeEach(() => {
    mockEmailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue({
        success: true,
        resend_id: 'test-email-id',
      }),
    };

    mockPool = {
      query: jest.fn(),
    };

    service = new TrialActivationService({
      pool: mockPool,
      emailService: mockEmailService,
      appUrl: 'https://test.example.com',
    });
  });

  describe('findPendingPilots', () => {
    it('should find pilots at signed_up stage with trial_cta_sent=false', async () => {
      const pilots = [{
        id: 'pilot-123',
        agent_id: 'agent-123',
        stage: 'signed_up',
        trial_cta_sent: false,
        stage_entered_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      }];

      mockPool.query.mockResolvedValue({ rows: pilots });

      const result = await service.findPendingPilots(5);

      expect(mockPool.query).toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('pilot-123');
    }, 10000);

    it('should return empty array if no pilots found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findPendingPilots(5);

      expect(result).toEqual([]);
    }, 10000);
  });

  describe('getAgent', () => {
    it('should fetch agent by id', async () => {
      const agent = {
        id: 'agent-123',
        email: 'test@example.com',
        first_name: 'Test',
      };

      mockPool.query.mockResolvedValue({ rows: [agent] });

      const result = await service.getAgent('agent-123');

      expect(result).toEqual(agent);
    }, 10000);

    it('should return null if agent not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getAgent('nonexistent');

      expect(result).toBe(null);
    }, 10000);
  });

  describe('hasEmailBeenSent', () => {
    it('should return true if email has been sent', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ trial_cta_sent: true }],
      });

      const result = await service.hasEmailBeenSent('pilot-123');

      expect(result).toBe(true);
    }, 10000);

    it('should return false if email has not been sent', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ trial_cta_sent: false }],
      });

      const result = await service.hasEmailBeenSent('pilot-123');

      expect(result).toBe(false);
    }, 10000);
  });

  describe('sendTrialCTA', () => {
    it('should send email with correct subject and content', async () => {
      const agent = {
        id: 'agent-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      const pilot = { id: 'pilot-123' };

      const result = await service.sendTrialCTA(agent, pilot);

      expect(mockEmailService.send).toHaveBeenCalled();
      const callArgs = mockEmailService.send.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('AI lead response dashboard');
      expect(result.success).toBe(true);
    }, 10000);

    it('should handle email send failure', async () => {
      mockEmailService.send.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const agent = {
        id: 'agent-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      const result = await service.sendTrialCTA(agent, {});

      expect(result.success).toBe(false);
    }, 10000);
  });

  describe('createLeadSimulation', () => {
    it('should create lead simulation for agent', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.createLeadSimulation('agent-123');

      expect(mockPool.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('updatePilotProgress', () => {
    it('should update pilot progress', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.updatePilotProgress('pilot-123');

      expect(mockPool.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('updateAgentPilotStartDate', () => {
    it('should update agent pilot start date', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.updateAgentPilotStartDate('agent-123');

      expect(mockPool.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('processActivations', () => {
    it('should process all pending pilots', async () => {
      const pilot = {
        id: 'pilot-123',
        agent_id: 'agent-123',
        stage: 'signed_up',
        trial_cta_sent: false,
      };

      const agent = {
        id: 'agent-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      jest.spyOn(service, 'findPendingPilots').mockResolvedValue([pilot]);
      jest.spyOn(service, 'hasEmailBeenSent').mockResolvedValue(false);
      jest.spyOn(service, 'getAgent').mockResolvedValue(agent);
      jest.spyOn(service, 'activatePilot').mockResolvedValue({ success: true });

      const results = await service.processActivations();

      expect(results.processed).toBe(1);
      expect(results.activated).toBe(1);
    }, 15000);

    it('should skip pilots with emails already sent', async () => {
      const pilot = {
        id: 'pilot-123',
        agent_id: 'agent-123',
      };

      jest.spyOn(service, 'findPendingPilots').mockResolvedValue([pilot]);
      jest.spyOn(service, 'hasEmailBeenSent').mockResolvedValue(true);

      const results = await service.processActivations();

      expect(results.processed).toBe(1);
      expect(results.skipped).toBe(1);
    }, 15000);
  });
});
