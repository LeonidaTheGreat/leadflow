/**
 * Database Client Factory
 * 
 * Creates a Supabase client for database operations.
 * Used by middleware, API routes, and server components.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the provided URL and key.
 * 
 * @param url - The Supabase API URL
 * @param key - The Supabase API key (public or service role)
 * @returns A Supabase client instance
 */
export function createClient(url: string, key: string) {
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
