/**
 * PostgREST Database Client — Supabase-compatible interface
 *
 * Drop-in replacement for @supabase/supabase-js createClient().
 * Talks to the local PostgreSQL via PostgREST API (Cloudflare tunnel).
 *
 * Usage:
 *   const { createClient } = require('./db-client')
 *   const supabase = createClient()  // args ignored, uses env vars
 *   const { data, error } = await supabase.from('leads').select('*').eq('id', 123)
 *
 * Supports: .from(table).select().insert().update().delete()
 * With filters: .eq(), .in(), .gte(), .lte(), .lt(), .gt(), .not(), .is(), .like(), .ilike()
 * With modifiers: .order(), .limit(), .single(), .maybeSingle()
 * With headers: Prefer: return=representation for insert/update
 */

const https = require('https')
const http = require('http')

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.SUPABASE_URL || 'https://api.imagineapi.org/rest/v1'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LEADFLOW_API_KEY || ''

function createClient() {
  return {
    from(table) {
      return new QueryBuilder(table)
    }
  }
}

class QueryBuilder {
  constructor(table) {
    this._table = table
    this._method = 'GET'
    this._select = '*'
    this._filters = []
    this._order = null
    this._limit = null
    this._body = null
    this._single = false
    this._maybeSingle = false
    this._prefer = []
  }

  select(columns = '*') {
    this._method = 'GET'
    this._select = columns
    return this
  }

  insert(data) {
    this._method = 'POST'
    this._body = data
    this._prefer.push('return=representation')
    return this
  }

  update(data) {
    this._method = 'PATCH'
    this._body = data
    this._prefer.push('return=representation')
    return this
  }

  delete() {
    this._method = 'DELETE'
    this._prefer.push('return=representation')
    return this
  }

  upsert(data, { onConflict } = {}) {
    this._method = 'POST'
    this._body = data
    this._prefer.push('return=representation')
    this._prefer.push(`resolution=merge-duplicates`)
    if (onConflict) {
      this._prefer.push(`on_conflict=${onConflict}`)
    }
    return this
  }

  // Filters
  eq(column, value) { this._filters.push(`${column}=eq.${value}`); return this }
  neq(column, value) { this._filters.push(`${column}=neq.${value}`); return this }
  gt(column, value) { this._filters.push(`${column}=gt.${value}`); return this }
  gte(column, value) { this._filters.push(`${column}=gte.${value}`); return this }
  lt(column, value) { this._filters.push(`${column}=lt.${value}`); return this }
  lte(column, value) { this._filters.push(`${column}=lte.${value}`); return this }
  like(column, value) { this._filters.push(`${column}=like.${value}`); return this }
  ilike(column, value) { this._filters.push(`${column}=ilike.${value}`); return this }
  is(column, value) { this._filters.push(`${column}=is.${value}`); return this }
  in(column, values) { this._filters.push(`${column}=in.(${values.join(',')})`); return this }
  not(column, operator, value) { this._filters.push(`${column}=not.${operator}.${value}`); return this }
  or(conditions) { this._filters.push(`or=(${conditions})`); return this }

  // Modifiers
  order(column, { ascending = true } = {}) {
    this._order = `${column}.${ascending ? 'asc' : 'desc'}`
    return this
  }

  limit(n) { this._limit = n; return this }
  single() { this._single = true; this._prefer.push('count=exact'); return this }
  maybeSingle() { this._maybeSingle = true; return this }

  // Execute
  async then(resolve, reject) {
    try {
      const result = await this._execute()
      resolve(result)
    } catch (err) {
      if (reject) reject(err)
      else resolve({ data: null, error: err })
    }
  }

  _buildUrl() {
    let url = `${API_URL}/${this._table}`
    const params = []

    if (this._method === 'GET' && this._select !== '*') {
      params.push(`select=${encodeURIComponent(this._select)}`)
    }

    for (const filter of this._filters) {
      params.push(filter)
    }

    if (this._order) params.push(`order=${this._order}`)
    if (this._limit) params.push(`limit=${this._limit}`)

    if (params.length > 0) url += '?' + params.join('&')
    return url
  }

  _execute() {
    return new Promise((resolve) => {
      const url = new URL(this._buildUrl())
      const isHttps = url.protocol === 'https:'
      const client = isHttps ? https : http

      const headers = {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      }

      if (this._prefer.length > 0) {
        headers['Prefer'] = this._prefer.join(', ')
      }

      if (this._single) {
        headers['Accept'] = 'application/vnd.pgrst.object+json'
      }

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: this._method,
        headers,
        timeout: 15000
      }

      const req = client.request(reqOptions, (res) => {
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = body ? JSON.parse(body) : null
              if (this._single && Array.isArray(data)) {
                resolve({ data: data[0] || null, error: null })
              } else if (this._maybeSingle && Array.isArray(data)) {
                resolve({ data: data[0] || null, error: null })
              } else {
                resolve({ data, error: null })
              }
            } catch {
              resolve({ data: body, error: null })
            }
          } else {
            const error = { message: body, status: res.statusCode }
            try { Object.assign(error, JSON.parse(body)) } catch {}
            resolve({ data: null, error })
          }
        })
      })

      req.on('error', (err) => {
        resolve({ data: null, error: { message: err.message } })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ data: null, error: { message: 'Request timeout' } })
      })

      if (this._body) {
        req.write(JSON.stringify(this._body))
      }
      req.end()
    })
  }
}

module.exports = { createClient }
