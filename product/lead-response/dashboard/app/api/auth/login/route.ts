/*
TASK SPEC (c51cff3e-4f4e-4905-8681-f125fff17317)
What:
- Change `product/lead-response/dashboard/app/api/auth/login/route.ts` in `POST()` to support legacy `salt:hash` password verification for existing `real_estate_agents` rows and auto-upgrade verified legacy hashes to bcrypt.
- Add helper functions in this file: legacy hash format detection and PBKDF2 verification.
- Add/update tests in `product/lead-response/dashboard/__tests__/bcrypt-password-verify.test.ts` to verify legacy row login works and hash is upgraded.

Verify:
- `cd product/lead-response/dashboard && npm test -- __tests__/bcrypt-password-verify.test.ts`
- `cd /var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-c51cff3e-4f4e-4905-8681-f125fff17317 && npm test`
- `cd /var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-c51cff3e-4f4e-4905-8681-f125fff17317 && npm run build`
- `rg -n "verifyLegacyPbkdf2Password|isLegacyPbkdf2Hash" product/lead-response/dashboard/app/api/auth/login/route.ts`

Boundaries:
- Do not modify signup routes, onboarding routes, DB schema, or migrations.
- Do not change session/token contracts or response payload shape outside password verification behavior.
- Keep changes scoped to password verification compatibility for existing rows.
*/
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createSession } from '@/lib/services/AuthService'
import { logSessionStart } from '@/lib/session-analytics'
import { logger } from '@/lib/logger'

const supabase = createClient(process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org', process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || '')
const LEGACY_PBKDF2_ITERATIONS = 1000
const LEGACY_PBKDF2_KEY_LENGTH = 64
const LEGACY_PBKDF2_DIGEST = 'sha512'
const BCRYPT_SALT_ROUNDS = 10

function isLegacyPbkdf2Hash(hash: string): boolean {
  if (typeof hash !== 'string') return false
  const parts = hash.split(':')
  if (parts.length !== 2) return false
  const [salt, digest] = parts
  return Boolean(salt) && Boolean(digest)
}

function verifyLegacyPbkdf2Password(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':')
  if (!salt || !expectedHash) return false
  const actualHash = crypto.pbkdf2Sync(
    password,
    salt,
    LEGACY_PBKDF2_ITERATIONS,
    LEGACY_PBKDF2_KEY_LENGTH,
    LEGACY_PBKDF2_DIGEST
  ).toString('hex')
  if (actualHash.length !== expectedHash.length) return false
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'utf8'), Buffer.from(expectedHash, 'utf8'))
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email (include onboarding state for post-login redirect)
    const { data: user, error: userError } = await supabase
      .from('real_estate_agents')
      .select('id, email, password_hash, first_name, last_name, email_verified, onboarding_completed')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json(
        { 
          error: 'EMAIL_NOT_VERIFIED', 
          message: 'Please confirm your email address.',
          resendUrl: '/api/auth/resend-verification'
        },
        { status: 403 }
      )
    }

    // Verify password with bcrypt first; legacy PBKDF2 fallback for pre-fix rows.
    let isValidPassword = await bcrypt.compare(password, user.password_hash)
    let shouldUpgradeLegacyHash = false
    if (!isValidPassword && isLegacyPbkdf2Hash(user.password_hash)) {
      isValidPassword = verifyLegacyPbkdf2Password(password, user.password_hash)
      shouldUpgradeLegacyHash = isValidPassword
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create server-side session
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') 
      ?? undefined
    const session = await createSession({
      userId: user.id,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress,
      rememberMe })

    // Update last login timestamp and migrate legacy hash to bcrypt when needed.
    const loginUpdatePayload: Record<string, string> = { last_login_at: new Date().toISOString() }
    if (shouldUpgradeLegacyHash) {
      loginUpdatePayload.password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    }
    await supabase
      .from('real_estate_agents')
      .update(loginUpdatePayload)
      .eq('id', user.id)

    // Log session analytics (fail silently — must not break login)
    const analyticsSessionId = await logSessionStart(user.id, ipAddress, request.headers.get('user-agent') || null)

    // Create response with user data and onboarding status
    const response = NextResponse.json({
      success: true,
      token: session.token,
      analyticsSessionId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        // onboardingCompleted drives the post-login wizard redirect
        onboardingCompleted: user.onboarding_completed ?? false }
    })

    // Set HTTP-only cookie with session token
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 24 hours
    response.cookies.set({
      name: 'leadflow_session',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/' })

    return response
  } catch (error) {
    logger.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
