import { NextResponse } from 'next/server'

// Lightweight latency probe — no DB call, no auth.
// Used by the genome's performance regression check to measure pure Vercel function
// overhead (~50–100ms) separately from Supabase round-trip time (~100–400ms).
// Result: API latency regressions become diagnosable — a spike here = Vercel cold start;
// a spike only on /api/health = Supabase latency.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true })
}
