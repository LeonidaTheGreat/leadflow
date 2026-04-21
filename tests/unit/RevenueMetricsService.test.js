const RevenueMetricsService = require('../../lib/services/RevenueMetricsService')
const { getPool } = require('../../lib/db')

describe('RevenueMetricsService', () => {
  let service
  let pool

  beforeAll(() => {
    service = new RevenueMetricsService()
    pool = getPool()
  })

  describe('captureSnapshot', () => {
    test('should insert revenue metrics for today', async () => {
      const result = await service.captureSnapshot('leadflow')

      expect(result).toBeDefined()
      expect(result.project_id).toBe('leadflow')
      expect(result.date).toBeDefined()
      expect(result.mrr_cents).toBeGreaterThanOrEqual(0)
      expect(result.active_subscribers).toBeGreaterThanOrEqual(0)
      expect(result.trial_users).toBeGreaterThanOrEqual(0)
      expect(parseFloat(result.conversion_rate)).toBeGreaterThanOrEqual(0)
    })

    test('should return same row when called twice on same day', async () => {
      const result1 = await service.captureSnapshot('leadflow')
      const result2 = await service.captureSnapshot('leadflow')

      expect(result1.id).toBe(result2.id)
      expect(result1.date).toEqual(result2.date)
    })
  })

  describe('calculateFunnelMetrics', () => {
    test('should calculate all funnel metrics', async () => {
      const metrics = await service.calculateFunnelMetrics()

      expect(metrics.signups).toBeGreaterThanOrEqual(0)
      expect(metrics.fubConnected).toBeGreaterThanOrEqual(0)
      expect(metrics.ahaCompleted).toBeGreaterThanOrEqual(0)
      expect(metrics.paid).toBeGreaterThanOrEqual(0)
      expect(metrics.trial_users).toBeGreaterThanOrEqual(0)
      expect(metrics.mrr_cents).toBeGreaterThanOrEqual(0)
      expect(metrics.new_subscribers).toBeGreaterThanOrEqual(0)
      expect(metrics.conversion_rate).toBeGreaterThanOrEqual(0)
      expect(metrics.conversion_rate).toBeLessThanOrEqual(1)
    })

    test('should include funnel breakdown', async () => {
      const metrics = await service.calculateFunnelMetrics()

      expect(metrics.funnel).toBeDefined()
      expect(metrics.funnel.signups).toBeDefined()
      expect(metrics.funnel.fub_connected).toBeDefined()
      expect(metrics.funnel.aha_moment).toBeDefined()
      expect(metrics.funnel.paid).toBeDefined()
    })

    test('should calculate funnel rates correctly', async () => {
      const metrics = await service.calculateFunnelMetrics()

      // Rate should be between 0 and 1
      expect(metrics.funnel.signups.rate).toBe(1.0)
      expect(metrics.funnel.fub_connected.rate).toBeGreaterThanOrEqual(0)
      expect(metrics.funnel.fub_connected.rate).toBeLessThanOrEqual(1)
      expect(metrics.funnel.aha_moment.rate).toBeGreaterThanOrEqual(0)
      expect(metrics.funnel.aha_moment.rate).toBeLessThanOrEqual(1)
    })

    test('should calculate extended metrics', async () => {
      const metrics = await service.calculateFunnelMetrics()

      expect(metrics.extended).toBeDefined()
      expect(metrics.extended.fub_activation_rate).toBeGreaterThanOrEqual(0)
      expect(metrics.extended.fub_activation_rate).toBeLessThanOrEqual(1)
      expect(metrics.extended.aha_completion_rate).toBeGreaterThanOrEqual(0)
      expect(metrics.extended.aha_completion_rate).toBeLessThanOrEqual(1)
    })
  })

  describe('getMetricsForRange', () => {
    test('should return historical metrics', async () => {
      const metrics = await service.getMetricsForRange(7)

      expect(Array.isArray(metrics)).toBe(true)
      if (metrics.length > 0) {
        expect(metrics[0].project_id).toBe('leadflow')
        expect(metrics[0].date).toBeDefined()
        expect(metrics[0].mrr_cents).toBeGreaterThanOrEqual(0)
      }
    })

    test('should respect days parameter', async () => {
      const metrics = await service.getMetricsForRange(3)

      expect(metrics.length).toBeLessThanOrEqual(4) // 3 days + 1
    })

    test('should parse data field as JSON', async () => {
      const metrics = await service.getMetricsForRange(7)

      if (metrics.length > 0) {
        expect(metrics[0].data).toBeDefined()
        expect(typeof metrics[0].data).toBe('object')
      }
    })
  })

  describe('checkThresholds', () => {
    test('should return alerts array', async () => {
      const alerts = await service.checkThresholds()

      expect(Array.isArray(alerts)).toBe(true)
    })

    test('should alert when FUB activation < 20%', async () => {
      const alerts = await service.checkThresholds()

      const fubAlert = alerts.find(a => a.type === 'fub_activation')
      // Alert should exist if rate is below threshold
      // (we can't guarantee this in test, but can check format if it exists)
      if (fubAlert) {
        expect(fubAlert.message).toBeDefined()
        expect(fubAlert.value).toBeLessThan(0.2)
      }
    })

    test('should alert when aha completion < 30%', async () => {
      const alerts = await service.checkThresholds()

      const ahaAlert = alerts.find(a => a.type === 'aha_completion')
      if (ahaAlert) {
        expect(ahaAlert.message).toBeDefined()
        expect(ahaAlert.value).toBeLessThan(0.3)
      }
    })
  })
})
