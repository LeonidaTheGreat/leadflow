/**
 * PostgREST client wrapper.
 *
 * This module only exposes DB clients and accessors.
 * Domain operations live in service classes under lib/services.
 */

import { postgrestAdmin, postgrestPublic } from './db'

export const supabaseAdmin = postgrestAdmin
export const supabase = postgrestPublic

export function getSupabaseClient() {
  return postgrestPublic
}

export function getSupabaseAdmin() {
  return postgrestAdmin
}
