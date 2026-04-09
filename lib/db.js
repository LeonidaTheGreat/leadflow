/**
 * Canonical Database Access Module
 *
 * Single entry point for all database access in LeadFlow.
 *
 * Exports:
 *   createClient(url, key) — PostgREST HTTP client (drop-in for Supabase JS SDK)
 *   getPool()              — shared pg Pool for raw SQL (lazy-init, singleton)
 *   endPool()              — drain and close the pg Pool (use in test teardown)
 *
 * Do NOT create your own Pool instances or call createClient with hardcoded
 * env vars — use this module so the whole app shares one pool.
 */

'use strict';

const { createClient } = require('./postgrest-client');
const { Pool } = require('pg');

let _pool = null;

/**
 * Get the shared pg Pool. Lazy-initialized on first call.
 * @returns {import('pg').Pool}
 */
function getPool() {
  if (!_pool) {
    const connString = process.env.LOCAL_PG_URL;
    if (!connString) {
      throw new Error('LOCAL_PG_URL is not set');
    }
    _pool = new Pool({ connectionString: connString, max: 10 });
  }
  return _pool;
}

/**
 * Drain and close the shared pg Pool.
 * Call this in test teardown (afterAll) to avoid open handle warnings.
 */
async function endPool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

module.exports = { createClient, getPool, endPool };
