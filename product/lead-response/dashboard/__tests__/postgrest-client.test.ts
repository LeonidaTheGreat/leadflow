/**
 * PostgREST Client Stub Tests
 *
 * Verifies that the PostgREST client (lib/db.ts) matches Supabase SDK API
 * contracts. These tests exist because the PostgREST client replaced
 * @supabase/supabase-js — any API mismatch causes client-side crashes.
 *
 * Key contract: channel().on().subscribe() returns the channel (not a Promise),
 * so useEffect cleanup can call subscription.unsubscribe() synchronously.
 */

import { channel, createClient, postgrestAdmin, postgrestPublic, supabase, from } from '@/lib/db'

describe('PostgREST client — channel() stub', () => {
  it('channel() returns an object with on, subscribe, unsubscribe', () => {
    const ch = channel('test')
    expect(typeof ch.on).toBe('function')
    expect(typeof ch.subscribe).toBe('function')
    expect(typeof ch.unsubscribe).toBe('function')
  })

  it('.on() returns the channel itself (chainable)', () => {
    const ch = channel('test')
    const result = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {})
    expect(result).toBe(ch)
  })

  it('.on().subscribe() returns the channel (not a Promise)', () => {
    const ch = channel('test')
    const subscription = ch.on('postgres_changes', {}, () => {}).subscribe()
    // This is the critical contract: subscribe() returns the channel, NOT a Promise
    expect(subscription).toBe(ch)
    expect(subscription).not.toBeInstanceOf(Promise)
  })

  it('.subscribe() returns the channel (not a Promise)', () => {
    const ch = channel('test')
    const result = ch.subscribe()
    expect(result).toBe(ch)
    expect(result).not.toBeInstanceOf(Promise)
  })

  it('.unsubscribe() is callable and does not throw', () => {
    const ch = channel('test')
    expect(() => ch.unsubscribe()).not.toThrow()
  })

  it('full Supabase Realtime pattern works: channel().on().subscribe() then unsubscribe()', () => {
    // This is the exact pattern used in LeadFeed.tsx and other components
    const ch = channel('leads')
    const subscription = ch
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {})
      .subscribe()

    // useEffect cleanup pattern
    expect(() => subscription.unsubscribe()).not.toThrow()
  })

  it('multiple .on() calls are chainable', () => {
    const ch = channel('test')
    const result = ch
      .on('postgres_changes', { event: 'INSERT' }, () => {})
      .on('postgres_changes', { event: 'UPDATE' }, () => {})
      .on('postgres_changes', { event: 'DELETE' }, () => {})
      .subscribe()

    expect(result).toBe(ch)
    expect(() => result.unsubscribe()).not.toThrow()
  })
})

describe('PostgREST client — createClient()', () => {
  it('returns an object with from, rpc, channel, auth', () => {
    const client = createClient('http://localhost', 'test-key')
    expect(typeof client.from).toBe('function')
    expect(typeof client.rpc).toBe('function')
    expect(typeof client.channel).toBe('function')
    expect(client.auth).toBeDefined()
    expect(typeof client.auth.getUser).toBe('function')
    expect(typeof client.auth.getSession).toBe('function')
  })

  it('.channel() on createClient also returns chainable object', () => {
    const client = createClient('http://localhost', 'test-key')
    const subscription = client.channel('test').on('event', {}, () => {}).subscribe()
    expect(subscription).not.toBeInstanceOf(Promise)
    expect(() => subscription.unsubscribe()).not.toThrow()
  })

  it('.from() returns a query builder with standard methods', () => {
    const client = createClient('http://localhost', 'test-key')
    const qb = client.from('test_table')
    expect(typeof qb.select).toBe('function')
    expect(typeof qb.insert).toBe('function')
    expect(typeof qb.update).toBe('function')
    expect(typeof qb.delete).toBe('function')
    expect(typeof qb.eq).toBe('function')
    expect(typeof qb.neq).toBe('function')
    expect(typeof qb.gt).toBe('function')
    expect(typeof qb.gte).toBe('function')
    expect(typeof qb.lt).toBe('function')
    expect(typeof qb.lte).toBe('function')
    expect(typeof qb.in).toBe('function')
    expect(typeof qb.order).toBe('function')
    expect(typeof qb.limit).toBe('function')
    expect(typeof qb.single).toBe('function')
    expect(typeof qb.maybeSingle).toBe('function')
  })

  it('.auth.getUser() returns { data: { user: null }, error: null }', async () => {
    const client = createClient('http://localhost', 'test-key')
    const result = await client.auth.getUser()
    expect(result).toEqual({ data: { user: null }, error: null })
  })

  it('.auth.getSession() returns { data: { session: null }, error: null }', async () => {
    const client = createClient('http://localhost', 'test-key')
    const result = await client.auth.getSession()
    expect(result).toEqual({ data: { session: null }, error: null })
  })
})

describe('PostgREST client — query builder chainability', () => {
  it('.select().eq().order().limit().single() is fully chainable', () => {
    const qb = from('test_table')
    const chain = qb.select('*').eq('id', 1).order('created_at', { ascending: false }).limit(10).single()
    // All methods should return the query builder for chaining
    expect(chain).toBeDefined()
    expect(typeof chain.then).toBe('function') // PromiseLike
  })

  it('.insert().select().single() is chainable (used in signup routes)', () => {
    const qb = from('test_table')
    const chain = qb.insert({ name: 'test' }).select('id, name').single()
    expect(chain).toBeDefined()
    expect(typeof chain.then).toBe('function')
  })

  it('.update().eq() is chainable', () => {
    const qb = from('test_table')
    const chain = qb.update({ name: 'updated' }).eq('id', 1)
    expect(chain).toBeDefined()
    expect(typeof chain.then).toBe('function')
  })
})

describe('PostgREST client — exports', () => {
  it('postgrestAdmin has from and rpc', () => {
    expect(typeof postgrestAdmin.from).toBe('function')
    expect(typeof postgrestAdmin.rpc).toBe('function')
  })

  it('postgrestPublic has from, channel, auth', () => {
    expect(typeof postgrestPublic.from).toBe('function')
    expect(typeof postgrestPublic.channel).toBe('function')
    expect(postgrestPublic.auth).toBeDefined()
  })

  it('supabase is an alias for postgrestPublic', () => {
    expect(supabase).toBe(postgrestPublic)
  })
})
