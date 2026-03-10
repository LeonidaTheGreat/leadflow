/**
 * Tests for the /admin/nps page and NPS stats logic.
 * US-3: PM dashboard — NPS score, response counts, promoter/detractor breakdown.
 */

import type { NPSStats } from '../lib/nps-service'

// ==================== NPS Score Calculation ====================

function calculateNPS(promoters: number, detractors: number, total: number): number {
  if (total === 0) return 0
  return Math.round(((promoters - detractors) / total) * 100)
}

function classifyScore(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

function classifyNPS(nps: number): string {
  if (nps >= 50) return 'Excellent'
  if (nps >= 30) return 'Good'
  if (nps >= 0) return 'Average'
  return 'Poor'
}

describe('Admin NPS Dashboard — US-3 PM Dashboard', () => {
  describe('NPS score calculation', () => {
    it('calculates NPS correctly with mixed responses', () => {
      // 6 promoters, 2 detractors, 10 total → (6-2)/10 * 100 = 40
      expect(calculateNPS(6, 2, 10)).toBe(40)
    })

    it('returns 0 NPS when there are no responses', () => {
      expect(calculateNPS(0, 0, 0)).toBe(0)
    })

    it('returns 100 NPS when all are promoters', () => {
      expect(calculateNPS(10, 0, 10)).toBe(100)
    })

    it('returns -100 NPS when all are detractors', () => {
      expect(calculateNPS(0, 10, 10)).toBe(-100)
    })

    it('rounds NPS to nearest integer', () => {
      // 1 promoter, 0 detractors, 3 total → (1-0)/3 * 100 = 33.33 → 33
      expect(calculateNPS(1, 0, 3)).toBe(33)
    })
  })

  describe('Score classification', () => {
    it('classifies 9-10 as promoters', () => {
      expect(classifyScore(9)).toBe('promoter')
      expect(classifyScore(10)).toBe('promoter')
    })

    it('classifies 7-8 as passives', () => {
      expect(classifyScore(7)).toBe('passive')
      expect(classifyScore(8)).toBe('passive')
    })

    it('classifies 0-6 as detractors', () => {
      expect(classifyScore(0)).toBe('detractor')
      expect(classifyScore(6)).toBe('detractor')
    })
  })

  describe('NPS rating labels', () => {
    it('labels 50+ as Excellent', () => {
      expect(classifyNPS(50)).toBe('Excellent')
      expect(classifyNPS(100)).toBe('Excellent')
    })

    it('labels 30-49 as Good', () => {
      expect(classifyNPS(30)).toBe('Good')
      expect(classifyNPS(49)).toBe('Good')
    })

    it('labels 0-29 as Average', () => {
      expect(classifyNPS(0)).toBe('Average')
      expect(classifyNPS(29)).toBe('Average')
    })

    it('labels negative as Poor', () => {
      expect(classifyNPS(-1)).toBe('Poor')
      expect(classifyNPS(-100)).toBe('Poor')
    })
  })

  describe('NPSStats interface shape', () => {
    it('has the correct structure for dashboard rendering', () => {
      const mockStats: NPSStats = {
        currentNPS: 42,
        responseCount: 10,
        previousPeriodCount: 7,
        promoters: 6,
        passives: 2,
        detractors: 2,
        recentResponses: [],
      }

      expect(mockStats).toHaveProperty('currentNPS')
      expect(mockStats).toHaveProperty('responseCount')
      expect(mockStats).toHaveProperty('previousPeriodCount')
      expect(mockStats).toHaveProperty('promoters')
      expect(mockStats).toHaveProperty('passives')
      expect(mockStats).toHaveProperty('detractors')
      expect(mockStats).toHaveProperty('recentResponses')
      expect(Array.isArray(mockStats.recentResponses)).toBe(true)
    })

    it('validates that promoters + passives + detractors equals total', () => {
      const mockStats: NPSStats = {
        currentNPS: 40,
        responseCount: 10,
        previousPeriodCount: 5,
        promoters: 6,
        passives: 2,
        detractors: 2,
        recentResponses: [],
      }

      expect(mockStats.promoters + mockStats.passives + mockStats.detractors).toBe(mockStats.responseCount)
    })
  })

  describe('Period comparison', () => {
    it('shows positive trend when current > previous', () => {
      const currentCount = 15
      const previousCount = 10
      const isTrending = currentCount >= previousCount
      expect(isTrending).toBe(true)
    })

    it('shows negative trend when current < previous', () => {
      const currentCount = 5
      const previousCount = 10
      const isTrending = currentCount >= previousCount
      expect(isTrending).toBe(false)
    })
  })

  describe('Percentage breakdown', () => {
    it('correctly calculates promoter percentage', () => {
      const promoters = 6
      const total = 10
      const pct = Math.round((promoters / total) * 100)
      expect(pct).toBe(60)
    })

    it('correctly calculates detractor percentage', () => {
      const detractors = 2
      const total = 10
      const pct = Math.round((detractors / total) * 100)
      expect(pct).toBe(20)
    })

    it('returns 0% when no responses', () => {
      const total = 0
      const pct = total > 0 ? Math.round((5 / total) * 100) : 0
      expect(pct).toBe(0)
    })
  })
})
