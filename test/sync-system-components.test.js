/**
 * Tests for sync-system-components.js
 * 
 * Tests schema alignment:
 * - name → component_name
 * - type → category  
 * - url → metadata.url
 * - status_emoji mapping
 */

const { SystemComponentsSync } = require('../scripts/sync-system-components.js')
const { createClient } = require('@supabase/supabase-js')

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

describe('SystemComponentsSync', () => {
  let syncer
  let mockSupabase

  beforeEach(() => {
    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({ data: [], error: null })
    }
    createClient.mockReturnValue(mockSupabase)

    // Create syncer instance
    syncer = new SystemComponentsSync()
    syncer.config = {
      project_id: 'leadflow',
      smoke_tests: [
        {
          id: 'test-1',
          name: 'Test Component',
          url: 'https://example.com',
          check_type: 'http_200',
          severity: 'critical'
        }
      ]
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getStatusEmoji', () => {
    test('returns 🟢 for live status', () => {
      expect(syncer.getStatusEmoji('live')).toBe('🟢')
    })

    test('returns 🟡 for building status', () => {
      expect(syncer.getStatusEmoji('building')).toBe('🟡')
    })

    test('returns 🔴 for error status', () => {
      expect(syncer.getStatusEmoji('error')).toBe('🔴')
    })

    test('returns ⚪ for deprecated status', () => {
      expect(syncer.getStatusEmoji('deprecated')).toBe('⚪')
    })

    test('returns ⚪ for unknown status', () => {
      expect(syncer.getStatusEmoji('unknown')).toBe('⚪')
    })
  })

  describe('generateComponentUUID', () => {
    test('generates deterministic UUID for same input', () => {
      const uuid1 = syncer.generateComponentUUID('test-id')
      const uuid2 = syncer.generateComponentUUID('test-id')
      expect(uuid1).toBe(uuid2)
    })

    test('generates different UUIDs for different inputs', () => {
      const uuid1 = syncer.generateComponentUUID('test-id-1')
      const uuid2 = syncer.generateComponentUUID('test-id-2')
      expect(uuid1).not.toBe(uuid2)
    })

    test('generates valid UUID format', () => {
      const uuid = syncer.generateComponentUUID('test-id')
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
  })

  describe('upsertComponent', () => {
    test('uses correct column names (schema alignment)', async () => {
      const component = {
        id: 'test-uuid',
        component_name: 'Test Name',
        category: 'health_check',
        status: 'live',
        metadata: { url: 'https://test.com' }
      }

      await syncer.upsertComponent(component)

      expect(mockSupabase.from).toHaveBeenCalledWith('system_components')
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          project_id: 'leadflow',
          component_name: 'Test Name',  // NOT 'name'
          category: 'health_check',      // NOT 'type'
          status: 'live',
          status_emoji: '🟢',
          metadata: { url: 'https://test.com' },  // URL stored in metadata
          last_checked: expect.any(String)
        }),
        { onConflict: 'id' }
      )
    })

    test('stores URL in metadata, not as top-level column', async () => {
      const component = {
        id: 'test-uuid',
        component_name: 'Test',
        category: 'health_check',
        status: 'live',
        metadata: { url: 'https://example.com', extra: 'data' }
      }

      await syncer.upsertComponent(component)

      const upsertCall = mockSupabase.upsert.mock.calls[0][0]
      expect(upsertCall).not.toHaveProperty('url')  // No top-level URL
      expect(upsertCall.metadata).toHaveProperty('url')  // URL in metadata
    })

    test('throws error on Supabase error', async () => {
      mockSupabase.upsert.mockReturnValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(syncer.upsertComponent({ id: 'test' }))
        .rejects.toThrow('Supabase error: Database error')
    })
  })

  describe('syncDeployedPages', () => {
    test('syncs smoke tests with URLs only', async () => {
      syncer.config.smoke_tests = [
        { id: 'test-1', name: 'With URL', url: 'https://test.com', check_type: 'http_200', severity: 'critical' },
        { id: 'test-2', name: 'Without URL', check_type: 'supabase_read', severity: 'warning' }
      ]

      const result = await syncer.syncDeployedPages()

      expect(result.count).toBe(1)
      expect(result.synced[0].id).toBe('test-1')
      expect(mockSupabase.upsert).toHaveBeenCalledTimes(1)
    })

    test('generates deterministic UUIDs for components', async () => {
      syncer.config.smoke_tests = [
        { id: 'my-test', name: 'Test', url: 'https://test.com', check_type: 'http_200', severity: 'critical' }
      ]

      await syncer.syncDeployedPages()

      const upsertCall = mockSupabase.upsert.mock.calls[0][0]
      expect(upsertCall.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    test('includes all metadata fields', async () => {
      syncer.config.smoke_tests = [
        { id: 'test-1', name: 'Test', url: 'https://test.com', check_type: 'json_status_ok', severity: 'critical' }
      ]

      await syncer.syncDeployedPages()

      const upsertCall = mockSupabase.upsert.mock.calls[0][0]
      expect(upsertCall.metadata).toEqual({
        url: 'https://test.com',
        test_id: 'test-1',
        check_type: 'json_status_ok',
        severity: 'critical',
        description: 'Smoke test endpoint for Test'
      })
    })

    test('tracks errors for failed syncs', async () => {
      mockSupabase.upsert.mockReturnValue({
        data: null,
        error: { message: 'Connection failed' }
      })

      syncer.config.smoke_tests = [
        { id: 'test-1', name: 'Test', url: 'https://test.com', check_type: 'http_200', severity: 'critical' }
      ]

      const result = await syncer.syncDeployedPages()

      expect(result.count).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('Connection failed')
    })
  })

  describe('getRegisteredComponents', () => {
    test('fetches components ordered by last_checked', async () => {
      mockSupabase.order.mockReturnValue({
        data: [
          { id: '1', component_name: 'Component 1' },
          { id: '2', component_name: 'Component 2' }
        ],
        error: null
      })

      const result = await syncer.getRegisteredComponents()

      expect(mockSupabase.from).toHaveBeenCalledWith('system_components')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('last_checked', { ascending: false })
      expect(result).toHaveLength(2)
    })

    test('throws error on fetch failure', async () => {
      mockSupabase.order.mockReturnValue({
        data: null,
        error: { message: 'Query failed' }
      })

      await expect(syncer.getRegisteredComponents())
        .rejects.toThrow('Failed to fetch components: Query failed')
    })
  })
})
