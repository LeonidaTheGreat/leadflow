/**
 * PostgREST Client (Pure Implementation)
 *
 * Direct PostgREST HTTP client with API compatible with Supabase SDK patterns.
 * No dependencies on @supabase/* packages.
 *
 * API Base URL: Set via NEXT_PUBLIC_API_URL env var
 * Production: https://api.imagineapi.org
 */

import type { 
  Lead, 
  Agent, 
  Message, 
  Qualification, 
  Booking, 
  Template,
  Event,
  DashboardStats 
} from '@/lib/types'

const PLACEHOLDER_URL = 'https://placeholder.example.com'

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || PLACEHOLDER_URL).trim()
}

function getApiKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

// ============================================
// QUERY BUILDER CLASS
// ============================================

class QueryBuilder implements PromiseLike<any> {
  private table: string
  private baseUrl: string
  private apiKey: string
  private selectCols: string | null = null
  private filters: Array<{ key: string; op: string; val: any }> = []
  private orderBys: Array<{ col: string; asc: boolean }> = []
  private limitVal: number | null = null
  private offsetVal: number | null = null
  private rangeStart: number | null = null
  private rangeEnd: number | null = null
  private singleVal = false
  private maybeVal = false
  private httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET'
  private bodyData: any = null
  private cachedPromise: Promise<any> | null = null
  private isUpsert = false
  private upsertConflictColumn: string | null | undefined = undefined

  constructor(table: string, baseUrl: string, apiKey: string) {
    this.table = table
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  select(cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): QueryBuilder {
    this.selectCols = cols || '*'
    // Note: count and head options would require additional header support for PostgREST
    // For now, we just accept the parameters for API compatibility
    return this
  }

  eq(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'eq', val })
    return this
  }

  neq(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'neq', val })
    return this
  }

  in(key: string, vals: any[]): QueryBuilder {
    this.filters.push({ key, op: 'in', val: vals })
    return this
  }

  not(key: string, op?: string, val?: any): QueryBuilder {
    // Support both not(key, val) and not(key, op, val) syntaxes
    if (op !== undefined && val === undefined) {
      // not(key, val) - old syntax
      this.filters.push({ key, op: 'not', val: op })
    } else if (op && val !== undefined) {
      // not(key, op, val) - new syntax, e.g., not('rating', 'is', null)
      if (op === 'is' && val === null) {
        this.filters.push({ key, op: 'is.null', val: 'null' })
      } else {
        this.filters.push({ key, op: `not.${op}`, val })
      }
    }
    return this
  }

  gt(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'gt', val })
    return this
  }

  gte(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'gte', val })
    return this
  }

  lt(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'lt', val })
    return this
  }

  lte(key: string, val: any): QueryBuilder {
    this.filters.push({ key, op: 'lte', val })
    return this
  }

  is(key: string, val: any): QueryBuilder {
    if (val === null) {
      this.filters.push({ key, op: 'is.null', val: 'null' })
    } else {
      this.filters.push({ key, op: 'is', val })
    }
    return this
  }

  order(col: string, opts?: { ascending?: boolean }): QueryBuilder {
    this.orderBys.push({ col, asc: opts?.ascending ?? true })
    return this
  }

  limit(n: number): QueryBuilder {
    this.limitVal = n
    return this
  }

  range(start: number, end: number): QueryBuilder {
    this.rangeStart = start
    this.rangeEnd = end
    return this
  }

  single(): QueryBuilder {
    this.singleVal = true
    return this
  }

  maybeSingle(): QueryBuilder {
    this.maybeVal = true
    return this
  }

  insert(data: any | any[]): QueryBuilder {
    this.httpMethod = 'POST'
    this.bodyData = data
    return this
  }

  update(data: any): QueryBuilder {
    this.httpMethod = 'PATCH'
    this.bodyData = data
    return this
  }

  delete(): QueryBuilder {
    this.httpMethod = 'DELETE'
    return this
  }

  upsert(data: any, opts?: { onConflict?: string; ignoreDuplicates?: boolean }): QueryBuilder {
    this.httpMethod = 'POST'
    this.bodyData = Array.isArray(data) ? data : [data]
    this.isUpsert = true
    this.upsertConflictColumn = opts?.onConflict || undefined
    return this
  }

  async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const url = this.buildUrl()
      const headers = this.buildHeaders()
      const body = this.httpMethod !== 'GET' && this.bodyData ? JSON.stringify(this.bodyData) : undefined

      const response = await fetch(url, {
        method: this.httpMethod,
        headers,
        body,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          data: null,
          error: new Error(`HTTP ${response.status}: ${errorText}`),
        }
      }

      let data = this.httpMethod === 'DELETE' ? null : await response.json()

      // Handle single/maybeSingle
      if ((this.singleVal || this.maybeVal) && Array.isArray(data)) {
        data = data.length > 0 ? data[0] : null
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    if (!this.cachedPromise) {
      this.cachedPromise = this.execute()
    }
    return this.cachedPromise.then(onfulfilled, onrejected)
  }

  private buildUrl(): string {
    const url = new URL(`${this.baseUrl}/${this.table}`)

    if (this.selectCols) {
      url.searchParams.set('select', this.selectCols)
    }

    for (const f of this.filters) {
      if (f.op === 'eq') {
        url.searchParams.set(f.key, `eq.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'neq') {
        url.searchParams.set(f.key, `neq.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'in') {
        const vals = (f.val as any[]).map(v => `"${v}"`).join(',')
        url.searchParams.set(f.key, `in.(${vals})`)
      } else if (f.op === 'not') {
        url.searchParams.set(f.key, `not.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'is.null') {
        url.searchParams.set(f.key, 'is.null')
      } else if (f.op === 'is') {
        url.searchParams.set(f.key, `is.${encodeURIComponent(f.val)}`)
      } else if (f.op.startsWith('not.')) {
        const innerOp = f.op.substring(4)
        url.searchParams.set(f.key, `not.${innerOp}.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'gt') {
        url.searchParams.set(f.key, `gt.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'gte') {
        url.searchParams.set(f.key, `gte.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'lt') {
        url.searchParams.set(f.key, `lt.${encodeURIComponent(f.val)}`)
      } else if (f.op === 'lte') {
        url.searchParams.set(f.key, `lte.${encodeURIComponent(f.val)}`)
      }
    }

    if (this.orderBys.length > 0) {
      const clauses = this.orderBys.map(o => `${o.col}.${o.asc ? 'asc' : 'desc'}`).join(',')
      url.searchParams.set('order', clauses)
    }

    if (this.limitVal !== null) {
      url.searchParams.set('limit', String(this.limitVal))
    }

    if (this.rangeStart !== null && this.rangeEnd !== null) {
      url.searchParams.set('offset', String(this.rangeStart))
      url.searchParams.set('limit', String(this.rangeEnd - this.rangeStart + 1))
    }

    return url.toString()
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.apiKey && { 'apikey': this.apiKey }),
    }
    
    if (this.isUpsert) {
      headers['Prefer'] = this.upsertConflictColumn 
        ? `resolution=merge-duplicates,on_conflict=${this.upsertConflictColumn}`
        : 'resolution=merge-duplicates'
    }
    
    return headers
  }
}

// ============================================
// CLIENT OBJECTS
// ============================================

const baseUrl = getBaseUrl()
const apiKey = getApiKey()

export const postgrestAdmin = {
  from: (table: string) => new QueryBuilder(table, baseUrl, apiKey),
  rpc: async (name: string, params?: any) => rpcCall(name, params),
}

export const postgrestPublic = {
  from: (table: string) => new QueryBuilder(table, baseUrl, ''),
  channel: (name: string) => channel(name),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
}

export const supabase = postgrestPublic
export const supabaseAdmin = postgrestAdmin

// ============================================
// PUBLIC API
// ============================================

export function from(table: string): QueryBuilder {
  return new QueryBuilder(table, baseUrl, apiKey)
}

export async function rpc(name: string, params?: any): Promise<{ data: any; error: any }> {
  return rpcCall(name, params)
}

async function rpcCall(name: string, params?: any): Promise<{ data: any; error: any }> {
  try {
    const url = `${baseUrl}/rpc/${name}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
      body: JSON.stringify(params || {}),
    })

    if (!response.ok) {
      const err = await response.text()
      return { data: null, error: new Error(`RPC error: ${err}`) }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

export function channel(name: string): any {
  return {
    on: (event: string, config?: any, callback?: any) => {
      // Support both on() with no args and on(event, config, callback)
      return {
        subscribe: () => Promise.resolve(),
        unsubscribe: () => Promise.resolve(),
      }
    },
    subscribe: () => Promise.resolve(),
    unsubscribe: () => Promise.resolve(),
  }
}

/**
 * Drop-in replacement for @supabase/supabase-js createClient
 */
export function createClient(url: string, key: string, opts?: any) {
  const finalUrl = !url || url.includes('placeholder') ? baseUrl : url
  const finalKey = !key || key === 'placeholder' ? apiKey : key

  return {
    from: (table: string) => new QueryBuilder(table, finalUrl, finalKey),
    rpc: async (name: string, params?: any) => rpcCall(name, params),
    channel: (name: string) => channel(name),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  }
}

export function isPostgrestConfigured(): boolean {
  return baseUrl !== PLACEHOLDER_URL && baseUrl !== '' && apiKey !== ''
}
