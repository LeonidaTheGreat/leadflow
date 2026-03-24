/**
 * Server-side PostgREST client wrapper.
 *
 * During `next build`, env vars may not be set. This module provides
 * a build-safe re-export of the PostgREST client from lib/db.ts.
 *
 * At runtime, API route handlers should check `isSupabaseConfigured()`
 * before querying — returning 503 if credentials are missing.
 */

import { postgrestAdmin as supabaseServer, isPostgrestConfigured } from './db'

export { supabaseServer }

/** Returns true if real PostgREST credentials are configured. */
export function isSupabaseConfigured(): boolean {
  return isPostgrestConfigured()
}
