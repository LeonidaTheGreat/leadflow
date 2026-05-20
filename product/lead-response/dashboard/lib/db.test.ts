'use strict'

/**
 * Unit tests for dashboard PostgREST hub: lib/db.ts
 *
 * These tests cover createClient behavior and core query/header building
 * without real network calls.
 */

describe('dashboard/lib/db.ts createClient', () => {
  const originalEnv = { ...process.env }
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.API_SECRET_KEY
    delete process.env.NEXT_PUBLIC_API_KEY
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
      text: async () => '[]',
    } as any)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    global.fetch = originalFetch
  })

  test('falls back to env URL/key when placeholders are passed', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test'
    process.env.API_SECRET_KEY = 'env-secret'
    const mod = await import('./db')

    const client = mod.createClient('placeholder', 'placeholder')
    await client.from('leads').select('*')

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/api\.test\/leads/)
    expect(opts.headers.apikey).toBe('env-secret')
    expect(opts.headers.Authorization).toBe('Bearer env-secret')
  })

  test('lte filter keeps raw timestamp value (no double encoding)', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test'
    process.env.API_SECRET_KEY = 'env-secret'
    const mod = await import('./db')

    const ts = '2026-05-19T17:00:00.000Z'
    await mod.createClient('placeholder', 'placeholder').from('tasks').lte('created_at', ts).select('*')

    const [url] = (global.fetch as jest.Mock).mock.calls[0]
    const decoded = decodeURIComponent(String(url))
    expect(decoded).toContain(`created_at=lte.${ts}`)
    expect(String(url)).not.toContain('%253A')
  })

  test('upsert+select sends merge + representation Prefer header', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test'
    process.env.API_SECRET_KEY = 'env-secret'
    const mod = await import('./db')

    await mod.createClient('placeholder', 'placeholder').from('agents').upsert({ id: 1 }).select('*')

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0]
    expect(opts.headers.Prefer).toContain('resolution=merge-duplicates')
    expect(opts.headers.Prefer).toContain('return=representation')
  })

  test('channel stub supports chainable realtime-like API', async () => {
    const mod = await import('./db')
    const ch = mod.createClient('https://api.test', 'key').channel('room')

    expect(typeof ch.on).toBe('function')
    expect(typeof ch.subscribe).toBe('function')
    expect(typeof ch.unsubscribe).toBe('function')
    expect(ch.on('postgres_changes', {}, () => {})).toBe(ch)
    expect(ch.subscribe()).toBe(ch)
  })

  test('isPostgrestConfigured returns false when env is incomplete', async () => {
    const mod = await import('./db')
    expect(mod.isPostgrestConfigured()).toBe(false)
  })
})
