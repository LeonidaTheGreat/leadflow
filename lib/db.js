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

const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// PostgREST HTTP client (consolidated from lib/postgrest-client.js)
// Drop-in replacement for @supabase/supabase-js createClient.
// Supports: .from(table).select/insert/update/delete/upsert
//           .eq/.neq/.gt/.gte/.lt/.lte/.in/.not/.is/.or
//           .order/.limit/.range/.single/.maybeSingle
//           .rpc(name, params)
//           .auth.getUser() / .auth.getSession()  (stubs)
// ---------------------------------------------------------------------------

class QueryBuilder {
  constructor(table, baseUrl, apiKey) {
    this._table = table;
    this._baseUrl = baseUrl;
    this._apiKey = apiKey;
    this._selectCols = null;
    this._filters = [];
    this._orderBys = [];
    this._limitVal = null;
    this._rangeStart = null;
    this._rangeEnd = null;
    this._singleVal = false;
    this._maybeVal = false;
    this._httpMethod = 'GET';
    this._bodyData = null;
    this._isUpsert = false;
    this._upsertConflictColumn = undefined;
    this._cachedPromise = null;
    this._countMode = null;
  }

  select(cols, opts) {
    this._selectCols = cols || '*';
    if (opts && opts.count) {
      this._countMode = opts.count;
    }
    return this;
  }

  eq(key, val) { this._filters.push({ key, op: 'eq', val }); return this; }
  neq(key, val) { this._filters.push({ key, op: 'neq', val }); return this; }
  gt(key, val) { this._filters.push({ key, op: 'gt', val }); return this; }
  gte(key, val) { this._filters.push({ key, op: 'gte', val }); return this; }
  lt(key, val) { this._filters.push({ key, op: 'lt', val }); return this; }
  lte(key, val) { this._filters.push({ key, op: 'lte', val }); return this; }

  in(key, vals) { this._filters.push({ key, op: 'in', val: vals }); return this; }

  is(key, val) {
    if (val === null) {
      this._filters.push({ key, op: 'is.null', val: 'null' });
    } else {
      this._filters.push({ key, op: 'is', val });
    }
    return this;
  }

  not(key, op, val) {
    if (op !== undefined && val === undefined) {
      this._filters.push({ key, op: 'not', val: op });
    } else if (op && val !== undefined) {
      if (op === 'is' && val === null) {
        this._filters.push({ key, op: 'is.null', val: 'null' });
      } else {
        this._filters.push({ key, op: `not.${op}`, val });
      }
    }
    return this;
  }

  or(filterStr) {
    this._filters.push({ key: 'or', op: 'raw', val: `(${filterStr})` });
    return this;
  }

  order(col, opts) {
    this._orderBys.push({ col, asc: opts && opts.ascending !== undefined ? opts.ascending : true });
    return this;
  }

  limit(n) { this._limitVal = n; return this; }

  range(start, end) {
    this._rangeStart = start;
    this._rangeEnd = end;
    return this;
  }

  single() { this._singleVal = true; return this; }
  maybeSingle() { this._maybeVal = true; return this; }

  insert(data) {
    this._httpMethod = 'POST';
    this._bodyData = data;
    return this;
  }

  update(data) {
    this._httpMethod = 'PATCH';
    this._bodyData = data;
    return this;
  }

  delete() {
    this._httpMethod = 'DELETE';
    return this;
  }

  upsert(data, opts) {
    this._httpMethod = 'POST';
    this._bodyData = Array.isArray(data) ? data : [data];
    this._isUpsert = true;
    this._upsertConflictColumn = (opts && opts.onConflict) || undefined;
    return this;
  }

  async _execute() {
    try {
      const url = this._buildUrl();
      const headers = this._buildHeaders();
      const body = this._httpMethod !== 'GET' && this._bodyData ? JSON.stringify(this._bodyData) : undefined;

      const response = await fetch(url, {
        method: this._httpMethod,
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorObj;
        try { errorObj = JSON.parse(errorText); } catch (_) { errorObj = { message: errorText }; }
        return {
          data: null,
          error: { message: errorObj.message || errorText, code: errorObj.code, status: response.status },
          count: null,
        };
      }

      let data;
      if (this._httpMethod === 'DELETE' && !this._selectCols) {
        data = null;
      } else {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      }

      // Parse count from content-range header if requested
      let count = null;
      if (this._countMode) {
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const parts = contentRange.split('/');
          if (parts[1] && parts[1] !== '*') {
            count = parseInt(parts[1], 10);
          }
        }
      }

      // Handle single/maybeSingle
      if ((this._singleVal || this._maybeVal) && Array.isArray(data)) {
        if (data.length === 0) {
          data = null;
          if (this._singleVal) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, count };
          }
        } else {
          data = data[0];
        }
      }

      return { data, error: null, count };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
        count: null,
      };
    }
  }

  then(onfulfilled, onrejected) {
    if (!this._cachedPromise) {
      this._cachedPromise = this._execute();
    }
    return this._cachedPromise.then(onfulfilled, onrejected);
  }

  _buildUrl() {
    const url = new URL(`${this._baseUrl}/${this._table}`);

    if (this._selectCols) {
      url.searchParams.set('select', this._selectCols);
    }

    for (const f of this._filters) {
      if (f.op === 'raw') {
        url.searchParams.set(f.key, f.val);
      } else if (f.op === 'eq') {
        url.searchParams.set(f.key, `eq.${f.val}`);
      } else if (f.op === 'neq') {
        url.searchParams.set(f.key, `neq.${f.val}`);
      } else if (f.op === 'in') {
        const vals = f.val.map(v => `"${v}"`).join(',');
        url.searchParams.set(f.key, `in.(${vals})`);
      } else if (f.op === 'not') {
        url.searchParams.set(f.key, `not.${f.val}`);
      } else if (f.op === 'is.null') {
        url.searchParams.set(f.key, 'is.null');
      } else if (f.op === 'is') {
        url.searchParams.set(f.key, `is.${f.val}`);
      } else if (f.op.startsWith('not.')) {
        const innerOp = f.op.substring(4);
        url.searchParams.set(f.key, `not.${innerOp}.${f.val}`);
      } else if (f.op === 'gt') {
        url.searchParams.set(f.key, `gt.${f.val}`);
      } else if (f.op === 'gte') {
        url.searchParams.set(f.key, `gte.${f.val}`);
      } else if (f.op === 'lt') {
        url.searchParams.set(f.key, `lt.${f.val}`);
      } else if (f.op === 'lte') {
        url.searchParams.set(f.key, `lte.${f.val}`);
      }
    }

    if (this._orderBys.length > 0) {
      const clauses = this._orderBys.map(o => `${o.col}.${o.asc ? 'asc' : 'desc'}`).join(',');
      url.searchParams.set('order', clauses);
    }

    if (this._limitVal !== null) {
      url.searchParams.set('limit', String(this._limitVal));
    }

    if (this._rangeStart !== null && this._rangeEnd !== null) {
      url.searchParams.set('offset', String(this._rangeStart));
      url.searchParams.set('limit', String(this._rangeEnd - this._rangeStart + 1));
    }

    return url.toString();
  }

  _buildHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this._apiKey) {
      headers['apikey'] = this._apiKey;
      headers['Authorization'] = `Bearer ${this._apiKey}`;
    }

    // PostgREST requires Prefer header for mutations that return data
    if (this._httpMethod !== 'GET' && this._selectCols) {
      headers['Prefer'] = this._isUpsert
        ? 'resolution=merge-duplicates,return=representation'
        : 'return=representation';
    } else if (this._isUpsert) {
      headers['Prefer'] = 'resolution=merge-duplicates';
    }

    // Request count if needed
    if (this._countMode) {
      const existing = headers['Prefer'] || '';
      headers['Prefer'] = existing ? `${existing},count=${this._countMode}` : `count=${this._countMode}`;
    }

    return headers;
  }
}

/**
 * Drop-in replacement for Supabase JS SDK's createClient.
 *
 * @param {string} url - PostgREST base URL
 * @param {string} key - API key / service role key
 * @param {object} [opts] - Ignored (accepted for API compatibility)
 * @returns {object} Client with .from(), .rpc(), .auth stubs
 */
function createClient(url, key, opts) {
  const finalUrl = (url || '').trim();
  const finalKey = (key || '').trim();

  return {
    from: (table) => new QueryBuilder(table, finalUrl, finalKey),
    rpc: async (name, params) => {
      try {
        const rpcUrl = `${finalUrl}/rpc/${name}`;
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(finalKey && { 'apikey': finalKey }),
            ...(finalKey && { 'Authorization': `Bearer ${finalKey}` }),
          },
          body: JSON.stringify(params || {}),
        });

        if (!response.ok) {
          const err = await response.text();
          return { data: null, error: { message: `RPC error: ${err}` } };
        }

        const data = await response.json();
        return { data, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : String(error) },
        };
      }
    },
    auth: {
      getUser: async (token) => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  };
}

// ---------------------------------------------------------------------------
// pg Pool (raw SQL)
// ---------------------------------------------------------------------------

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
