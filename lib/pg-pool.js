/**
 * Shared PostgreSQL Connection Pool
 *
 * Single pg Pool instance for the entire application.
 * All code that needs raw SQL should import getPool() from here.
 * Do NOT create your own Pool instances — use this one.
 */

'use strict';

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

module.exports = { getPool };
