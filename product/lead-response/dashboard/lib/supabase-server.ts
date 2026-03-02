import { createClient } from '@supabase/supabase-js'

/**
 * Build-safe server-side Supabase client.
 *
 * During `next build`, env vars may not be set. Using '' as the URL
 * causes createClient() to throw "supabaseUrl is required" at module
 * evaluation time, which fails the build.
 *
 * This module uses placeholders so the build succeeds. At runtime,
 * API route handlers should check `isSupabaseConfigured()` before
 * querying — returning 503 if credentials are missing.
 */

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/** Returns true if real Supabase credentials are configured (not placeholders). */
export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl !== PLACEHOLDER_URL &&
    supabaseKey !== PLACEHOLDER_KEY &&
    supabaseUrl !== '' &&
    supabaseKey !== ''
  )
}
