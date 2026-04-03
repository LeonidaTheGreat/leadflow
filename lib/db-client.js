/**
 * PostgREST Database Client — re-exports from postgrest-client.js
 *
 * This file exists for backwards compatibility. The canonical implementation
 * is in lib/postgrest-client.js. Both are drop-in replacements for
 * @supabase/supabase-js createClient().
 */
module.exports = require('./postgrest-client')
