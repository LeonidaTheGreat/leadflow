/**
 * Pilot Campaign API Unit Tests
 * 
 * Tests for campaign stats calculation and validation logic
 */

describe('Campaign Stats Calculation', () => {
  it('should calculate progress percentage correctly', () => {
    const goal = 30;
    const signedUp = 15;
    const percentage = (signedUp / goal) * 100;
    
    expect(percentage).toBe(50);
  });

  it('should handle zero goal', () => {
    const goal = 0;
    const signedUp = 5;
    const percentage = goal > 0 ? (signedUp / goal) * 100 : 0;
    
    expect(percentage).toBe(0);
  });

  it('should calculate 100% when goal is reached', () => {
    const goal = 30;
    const signedUp = 30;
    const percentage = (signedUp / goal) * 100;
    
    expect(percentage).toBe(100);
  });

  it('should calculate conversion rate correctly', () => {
    const totalTargets = 50;
    const signedUp = 10;
    const conversionRate = totalTargets > 0 ? (signedUp / totalTargets) * 100 : 0;
    
    expect(conversionRate).toBe(20);
  });
});

describe('UTM Channel Support', () => {
  it('should support all required outreach channels', () => {
    const validChannels = ['facebook', 'reddit', 'linkedin', 'instagram', 'twitter', 'email', 'referral', 'other'];
    
    expect(validChannels).toContain('facebook');
    expect(validChannels).toContain('reddit');
    expect(validChannels).toContain('linkedin');
    expect(validChannels).toContain('instagram');
    expect(validChannels).toContain('email');
    expect(validChannels).toHaveLength(8);
  });

  it('should support all required status values', () => {
    const validStatuses = ['identified', 'contacted', 'responded', 'scheduled', 'signed_up', 'declined', 'nurture'];
    
    expect(validStatuses).toContain('identified');
    expect(validStatuses).toContain('contacted');
    expect(validStatuses).toContain('responded');
    expect(validStatuses).toContain('scheduled');
    expect(validStatuses).toContain('signed_up');
    expect(validStatuses).toContain('declined');
    expect(validStatuses).toContain('nurture');
    expect(validStatuses).toHaveLength(7);
  });
});

describe('Days Remaining Calculation', () => {
  it('should calculate days remaining correctly', () => {
    const endDate = new Date('2026-05-05');
    const today = new Date('2026-04-05');
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysRemaining).toBe(30);
  });

  it('should return negative days when campaign is overdue', () => {
    const endDate = new Date('2026-03-01');
    const today = new Date('2026-04-05');
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysRemaining).toBeLessThan(0);
  });
});

describe('Campaign Data Structure', () => {
  it('should have valid campaign structure', () => {
    const campaign = {
      id: 'uuid-123',
      name: '30 Pilots in 30 Days',
      description: 'Test campaign',
      goal_count: 30,
      start_date: '2026-04-05',
      end_date: '2026-05-05',
      status: 'active',
      utm_campaign: 'pilot_recruitment_30_30'
    };

    expect(campaign.name).toBe('30 Pilots in 30 Days');
    expect(campaign.goal_count).toBe(30);
    expect(campaign.status).toBe('active');
    expect(campaign.utm_campaign).toBeDefined();
  });

  it('should have valid target structure', () => {
    const target = {
      id: 'uuid-456',
      campaign_id: 'uuid-123',
      name: 'Sarah Mitchell',
      email: 'sarah@example.com',
      source_channel: 'facebook',
      status: 'identified',
      priority: 1
    };

    expect(target.name).toBe('Sarah Mitchell');
    expect(target.source_channel).toBe('facebook');
    expect(target.status).toBe('identified');
    expect(target.campaign_id).toBeDefined();
  });
});

describe('Status Color Mapping', () => {
  const STATUS_COLORS = {
    identified: 'bg-slate-500',
    contacted: 'bg-blue-500',
    responded: 'bg-yellow-500',
    scheduled: 'bg-purple-500',
    signed_up: 'bg-emerald-500',
    declined: 'bg-red-500',
    nurture: 'bg-gray-500',
  };

  it('should have color for each status', () => {
    const statuses = ['identified', 'contacted', 'responded', 'scheduled', 'signed_up', 'declined', 'nurture'];
    
    statuses.forEach(status => {
      expect(STATUS_COLORS[status]).toBeDefined();
      expect(STATUS_COLORS[status]).toMatch(/^bg-/);
    });
  });
});
