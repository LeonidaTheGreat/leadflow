import { NextResponse } from 'next/server'

export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 20) || 'NOT_SET'
  
  return NextResponse.json({
    has_anthropic_key: hasAnthropicKey,
    key_prefix: keyPrefix,
    node_env: process.env.NODE_ENV,
  })
}
