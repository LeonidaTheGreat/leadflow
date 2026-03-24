/**
 * PostgREST Database Client
 * 
 * Wrapper around @supabase/postgrest-js that provides a compatible API
 * with Supabase's client while using PostgREST directly.
 * 
 * This replaces dependency on @supabase/supabase-js and uses the 
 * NEXT_PUBLIC_API_URL environment variable to connect to the PostgREST API.
 */

import { PostgrestClient } from '@supabase/postgrest-js'

const PLACEHOLDER_URL = 'https://placeholder.example.com'
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || PLACEHOLDER_URL).trim()

/**
 * Create a PostgREST client instance
 */
function createPostgrestClient() {
  const client = new PostgrestClient(apiUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      'Content-Profile': 'public',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    schema: 'public',
  })
  return client
}

/**
 * Create a client-side PostgREST client (with appropriate headers)
 */
function createPostgrestClientPublic() {
  const client = new PostgrestClient(apiUrl, {
    headers: {
      'Content-Profile': 'public',
    },
    schema: 'public',
  })
  return client
}

/** Build-time placeholder detection */
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV

/** Server-side admin client (uses service role key) */
export const postgrestAdmin = isBuildTime ? createPostgrestClient() : createPostgrestClient()

/** Client-side public client (no auth) */
export const postgrestPublic = isBuildTime ? createPostgrestClientPublic() : createPostgrestClientPublic()

/**
 * Check if PostgREST is properly configured
 */
export function isPostgrestConfigured(): boolean {
  return (
    apiUrl !== PLACEHOLDER_URL &&
    apiUrl !== '' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== ''
  )
}

/**
 * Re-export as a single client for compatibility with existing Supabase imports
 * This maintains the same interface as the old supabaseAdmin client
 */
export const db = postgrestAdmin

/**
 * Supabase-compatible wrapper for from() method
 * Allows using db.from('table').select() pattern
 */
export const from = (table: string) => postgrestAdmin.from(table)

/**
 * Supabase-compatible RPC wrapper
 */
export const rpc = (fn: string, args?: Record<string, any>, options?: any) => 
  postgrestAdmin.rpc(fn, args, options)

/**
 * Helper to unwrap PostgREST response into Supabase-compatible format
 */
export function unwrapResponse<T>(response: any): { data: T | null; error: any } {
  if (response.error) {
    return { data: null, error: response.error }
  }
  return { data: response.data, error: null }
}

/**
 * Helper to unwrap array response into Supabase-compatible format
 */
export function unwrapArrayResponse<T>(response: any): { data: T[]; error: any } {
  if (response.error) {
    return { data: [], error: response.error }
  }
  return { data: Array.isArray(response.data) ? response.data : [], error: null }
}
