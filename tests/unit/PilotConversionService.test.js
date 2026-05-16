'use strict';

const PilotConversionService = require('../../lib/services/PilotConversionService');

describe('PilotConversionService', () => {
  describe('MILESTONES', () => {
    it('includes day_79 critical milestone', () => {
      expect(PilotConversionService.MILESTONES.day_79).toBeDefined();
      expect(PilotConversionService.MILESTONES.day_79.days).toBe(79);
      expect(PilotConversionService.MILESTONES.day_79.template).toBe('day79_critical');
    });

    it('includes day_75 and day_85 to close the Day 55–90 gap', () => {
      expect(PilotConversionService.MILESTONES.day_75).toBeDefined();
      expect(PilotConversionService.MILESTONES.day_75.days).toBe(75);
      expect(PilotConversionService.MILESTONES.day_85).toBeDefined();
      expect(PilotConversionService.MILESTONES.day_85.days).toBe(85);
    });

    it('has all six milestones', () => {
      const keys = Object.keys(PilotConversionService.MILESTONES);
      expect(keys).toEqual(['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']);
    });

    it('milestone days are in ascending order', () => {
      const days = Object.values(PilotConversionService.MILESTONES).map(m => m.days);
      expect(days).toEqual([30, 45, 55, 75, 79, 85]);
    });

    it('day_79 subject references 11 days', () => {
      const subject = PilotConversionService.MILESTONES.day_79.subject;
      expect(subject).toContain('11 days');
    });

    it('each milestone has required fields', () => {
      for (const [key, val] of Object.entries(PilotConversionService.MILESTONES)) {
        expect(typeof val.days).toBe('number', `${key}.days should be a number`);
        expect(typeof val.subject).toBe('string', `${key}.subject should be a string`);
        expect(typeof val.template).toBe('string', `${key}.template should be a string`);
      }
    });
  });

  describe('renderTemplate', () => {
    let service;
    const mockAgent = { id: 'agent-1', email: 'test@example.com', first_name: 'John' };
    const mockStats = { leadsResponded: 5, avgResponseTime: '3 minutes', appointmentsBooked: 2 };
    const mockCheckoutUrl = 'https://app.example.com/billing/upgrade?agent=agent-1';

    beforeEach(() => {
      service = new PilotConversionService();
    });

    it('renders day79_critical template with urgency messaging', () => {
      const result = service.renderTemplate('day79_critical', mockAgent, mockStats, mockCheckoutUrl);
      expect(result.html).toContain('11 days');
      expect(result.html).toContain('5');
      expect(result.html).toContain(mockCheckoutUrl);
      expect(result.text).toContain('11 DAYS');
      expect(result.text).toContain(mockCheckoutUrl);
    });

    it('day79_critical html includes red alert styling', () => {
      const result = service.renderTemplate('day79_critical', mockAgent, mockStats, mockCheckoutUrl);
      expect(result.html).toContain('fee2e2');
    });

    it('renders day75_urgent template', () => {
      const result = service.renderTemplate('day75_urgent', mockAgent, mockStats, mockCheckoutUrl);
      expect(result.html).toContain('15 days');
      expect(result.text).toContain('15 days');
    });

    it('renders day85_final template with FINAL NOTICE', () => {
      const result = service.renderTemplate('day85_final', mockAgent, mockStats, mockCheckoutUrl);
      expect(result.html).toContain('5 days');
      expect(result.text).toContain('5 DAYS');
    });

    it('renders all milestone templates without throwing', () => {
      const templateNames = Object.values(PilotConversionService.MILESTONES).map(m => m.template);
      for (const templateName of templateNames) {
        expect(() => service.renderTemplate(templateName, mockAgent, mockStats, mockCheckoutUrl)).not.toThrow();
      }
    });

    it('throws for unknown template', () => {
      expect(() => service.renderTemplate('day_999_nonexistent', mockAgent, mockStats, mockCheckoutUrl)).toThrow('Unknown template');
    });

    it('uses first_name from agent object', () => {
      const result = service.renderTemplate('day79_critical', mockAgent, mockStats, mockCheckoutUrl);
      expect(result.html).toContain('John');
      expect(result.text).toContain('John');
    });
  });

  describe('runConversionSequence', () => {
    it('processes all six milestones', async () => {
      const processed = [];
      const service = new PilotConversionService();
      service.processMilestone = jest.fn(async (m) => {
        processed.push(m);
        return { milestone: m, processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] };
      });

      await service.runConversionSequence();

      expect(processed).toEqual(['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']);
    });

    it('includes day_79 in the sequence', async () => {
      const service = new PilotConversionService();
      service.processMilestone = jest.fn(async (m) => ({
        milestone: m, processed: 0, sent: 0, skipped: 0, failed: 0, errors: []
      }));

      const result = await service.runConversionSequence();
      expect(result.milestones.day_79).toBeDefined();
    });

    it('returns results keyed by milestone', async () => {
      const service = new PilotConversionService();
      service.processMilestone = jest.fn(async (m) => ({
        milestone: m, processed: 1, sent: 1, skipped: 0, failed: 0, errors: []
      }));

      const result = await service.runConversionSequence();
      expect(Object.keys(result.milestones)).toEqual(['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']);
    });
  });

  describe('getEligibleAgents', () => {
    it('throws for invalid milestone when DB is configured', async () => {
      const mockDb = { from: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [], error: null })) })) };
      const service = new PilotConversionService({ db: mockDb });
      await expect(service.getEligibleAgents('day_999')).rejects.toThrow('Invalid milestone');
    });

    it('accepts day_79 and returns [] when DB not configured', async () => {
      const service = new PilotConversionService({ db: null });
      const result = await service.getEligibleAgents('day_79');
      expect(result).toEqual([]);
    });

    it('accepts day_75 and returns [] when DB not configured', async () => {
      const service = new PilotConversionService({ db: null });
      const result = await service.getEligibleAgents('day_75');
      expect(result).toEqual([]);
    });

    it('accepts day_85 and returns [] when DB not configured', async () => {
      const service = new PilotConversionService({ db: null });
      const result = await service.getEligibleAgents('day_85');
      expect(result).toEqual([]);
    });
  });
});
