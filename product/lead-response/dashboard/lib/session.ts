import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  lastUsedAt: Date
  userAgent?: string
  ipAddress?: string
}

export interface SessionCreateInput {
  userId: string
  userAgent?: string
  ipAddress?: string
  rememberMe?: boolean
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(input: SessionCreateInput): Promise<Session> {
  const token = generateSessionToken()
  const now = new Date()
  const expiresAt = input.rememberMe 
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: input.userId,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      last_used_at: now.toISOString(),
      user_agent: input.userAgent,
      ip_address: input.ipAddress,
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create session')
  }

  return {
    id: data.id,
    userId: data.user_id,
    token: data.token,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    lastUsedAt: new Date(data.last_used_at),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
  }
}

export async function validateSession(token: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null

  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) {
    await deleteSession(token)
    return null
  }

  await supabase
    .from('sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    id: data.id,
    userId: data.user_id,
    token: data.token,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    lastUsedAt: new Date(),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
  }
}

export async function deleteSession(token: string): Promise<void> {
  await supabase.from('sessions').delete().eq('token', token)
}
