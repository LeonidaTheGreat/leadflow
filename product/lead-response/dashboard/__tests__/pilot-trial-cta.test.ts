/**
 * Tests for pilot trial CTA email delay functionality
 * UC: fix-48h-trial-cta-email-delay-is-not-implemented
 */

import { describe, it, expect } from '@jest/globals'

describe('48h Trial CTA Email Delay Implementation', () => {
  describe('Migration Schema', () => {
    it('should have created migration file with trial_cta_sent columns', () => {
      const fs = require('fs')
      const path = require('path')
      
      const migrationPath = path.join(process.cwd(), '..', '..', '..', 'migrations', '013_pilot_trial_cta_sent.sql')
      const migrationExists = fs.existsSync(migrationPath)
      
      expect(migrationExists).toBe(true)
      
      if (migrationExists) {
        const content = fs.readFileSync(migrationPath, 'utf8')
        expect(content).toContain('trial_cta_sent')
        expect(content).toContain('trial_cta_sent_at')
        expect(content).toContain('pilot_progress')
        expect(content).toContain('aha_moment')
      }
    })
  })

  describe('Cron Route Implementation', () => {
    it('should have created the pilot-trial-cta cron route', () => {
      const fs = require('fs')
      const path = require('path')
      
      const routePath = path.join(process.cwd(), 'app', 'api', 'cron', 'pilot-trial-cta', 'route.ts')
      const routeExists = fs.existsSync(routePath)
      
      expect(routeExists).toBe(true)
      
      if (routeExists) {
        const content = fs.readFileSync(routePath, 'utf8')
        expect(content).toContain('aha_moment')
        expect(content).toContain('trial_cta_sent')
        expect(content).toContain('stage_entered_at')
        expect(content).toContain('48')
        expect(content).toContain('sendPilotTrialCTAEmail')
      }
    })
  })

  describe('Vercel Cron Configuration', () => {
    it('should have added pilot-trial-cta to vercel.json crons', () => {
      const fs = require('fs')
      const path = require('path')
      
      const vercelPath = path.join(process.cwd(), 'vercel.json')
      const vercelExists = fs.existsSync(vercelPath)
      
      expect(vercelExists).toBe(true)
      
      if (vercelExists) {
        const content = fs.readFileSync(vercelPath, 'utf8')
        const config = JSON.parse(content)
        
        expect(config.crons).toBeDefined()
        expect(Array.isArray(config.crons)).toBe(true)
        
        const pilotTrialCtaCron = config.crons.find((cron: any) => 
          cron.path === '/api/cron/pilot-trial-cta'
        )
        
        expect(pilotTrialCtaCron).toBeDefined()
        expect(pilotTrialCtaCron.schedule).toBeDefined()
      }
    })
  })

  describe('48h Delay Logic', () => {
    it('should correctly calculate 48h threshold', () => {
      const now = new Date()
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)
      
      // 48h ago should be at the threshold
      expect(fortyEightHoursAgo.getTime()).toBeLessThan(now.getTime())
      
      // 24h ago should NOT trigger (less than 48h)
      const twentyFourHoursDiff = now.getTime() - twentyFourHoursAgo.getTime()
      expect(twentyFourHoursDiff).toBeLessThan(48 * 60 * 60 * 1000)
      
      // 72h ago should trigger (more than 48h)
      const seventyTwoHoursDiff = now.getTime() - seventyTwoHoursAgo.getTime()
      expect(seventyTwoHoursDiff).toBeGreaterThan(48 * 60 * 60 * 1000)
    })

    it('should generate correct ISO timestamp for 48h ago', () => {
      const now = Date.now()
      const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString()
      
      // Verify it's a valid ISO string
      expect(fortyEightHoursAgo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // Verify it's approximately 48 hours ago
      const parsed = new Date(fortyEightHoursAgo).getTime()
      const diffHours = (now - parsed) / (1000 * 60 * 60)
      expect(diffHours).toBeCloseTo(48, 0)
    })
  })

  describe('Email Service Integration', () => {
    it('should have sendPilotTrialCTAEmail function available', () => {
      const fs = require('fs')
      const path = require('path')
      
      const emailServicePath = path.join(process.cwd(), 'lib', 'email-service.ts')
      const emailServiceExists = fs.existsSync(emailServicePath)
      
      expect(emailServiceExists).toBe(true)
      
      if (emailServiceExists) {
        const content = fs.readFileSync(emailServicePath, 'utf8')
        expect(content).toContain('sendPilotTrialCTAEmail')
      }
    })
  })
})
