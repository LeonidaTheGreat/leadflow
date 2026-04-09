/**
 * Test suite for PostgREST migration
 * Verifies that the PostgREST client supports all query patterns used in the codebase
 */

import { createClient } from '@/lib/db'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { leadService } from '@/lib/services/LeadService'
import { messageService } from '@/lib/services/MessageService'
import { agentService } from '@/lib/services/AgentService'

describe('PostgREST Migration', () => {
  // These tests verify that the client can be created and has the expected methods
  
  test('createClient should create a valid PostgREST client', () => {
    const client = createClient('https://api.example.com', 'test-key')
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
    expect(typeof client.rpc).toBe('function')
  })

  test('postgrest client should support .from() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('test_table')
    expect(query).toBeDefined()
  })

  test('postgrest client should support .select() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*')
    expect(query).toBeDefined()
  })

  test('postgrest client should support .eq() filter', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').eq('id', '123')
    expect(query).toBeDefined()
  })

  test('postgrest client should support .insert() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').insert({ name: 'test' })
    expect(query).toBeDefined()
  })

  test('postgrest client should support .update() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').update({ name: 'updated' }).eq('id', '123')
    expect(query).toBeDefined()
  })

  test('postgrest client should support .order() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').order('created_at', { ascending: false })
    expect(query).toBeDefined()
  })

  test('postgrest client should support .limit() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').limit(10)
    expect(query).toBeDefined()
  })

  test('postgrest client should support .single() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').single()
    expect(query).toBeDefined()
  })

  test('postgrest client should support .in() filter', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').in('id', ['1', '2', '3'])
    expect(query).toBeDefined()
  })

  test('postgrest client should support .not() filter', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.from('leads').select('*').not('status', 'eq', 'closed')
    expect(query).toBeDefined()
  })

  test('postgrest client should support .rpc() method', () => {
    const client = createClient('https://api.example.com', 'test-key')
    const query = client.rpc('increment_template_usage', { template_id: '123' })
    expect(query).toBeDefined()
  })

  test('service class instances should expose domain methods', () => {
    expect(typeof leadService.getLeadById).toBe('function')
    expect(typeof leadService.getLeadByPhone).toBe('function')
    expect(typeof leadService.createLead).toBe('function')
    expect(typeof leadService.updateLead).toBe('function')
    expect(typeof leadService.getLeadsByAgent).toBe('function')
    expect(typeof messageService.getMessagesByLead).toBe('function')
    expect(typeof messageService.createMessage).toBe('function')
    expect(typeof messageService.updateMessageStatus).toBe('function')
    expect(typeof agentService.getAgentById).toBe('function')
  })

  test('supabaseAdmin and supabase should be available', () => {
    expect(supabaseAdmin).toBeDefined()
    expect(supabase).toBeDefined()
  })
})
