import { NextResponse } from 'next/server'
import { requirePrivilegedRouteAuth } from '@/lib/security/privileged-route-auth'

export async function GET(request: Request) {
  const unauthorized = await requirePrivilegedRouteAuth(request)
  if (unauthorized) return unauthorized

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 20) || 'NOT_SET'
  
  return NextResponse.json({
    has_anthropic_key: hasAnthropicKey,
    key_prefix: keyPrefix,
    node_env: process.env.NODE_ENV })
}
