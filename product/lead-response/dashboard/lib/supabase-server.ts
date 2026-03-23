import { createClient } from '@/lib/db'

/**
 * Build-safe server-side database client.
 *
 * During `next build`, env vars may not be set. This module uses
 * placeholders so the build succeeds. At runtime, API route handlers
 * should check `isDBConfigured()` before querying.
 */

const PLACEHOLDER_URL = 'https://placeholder.local'
const PLACEHOLDER_KEY = 'placeholder'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || PLACEHOLDER_URL
const apiKey = process.env.API_SECRET_KEY || PLACEHOLDER_KEY

export const supabaseServer = createClient(apiUrl, apiKey)

/** Returns true if real API credentials are configured (not placeholders). */
export function isSupabaseConfigured(): boolean {
  return (
    apiUrl !== PLACEHOLDER_URL &&
    apiKey !== PLACEHOLDER_KEY &&
    apiUrl !== '' &&
    apiKey !== ''
  )
}
