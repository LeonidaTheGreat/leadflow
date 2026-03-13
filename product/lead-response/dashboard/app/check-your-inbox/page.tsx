'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertTriangle, Check, Info, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function CheckYourInboxContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const error = searchParams.get('error')
  const resent = searchParams.get('resent')

  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (!email || countdown > 0 || loading) return

    setLoading(true)
    setResendStatus('loading')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (response.ok) {
        setResendStatus('success')
        setResendMessage('Verification email resent. Check your inbox.')
        setCountdown(60) // 60 second cooldown
      } else if (response.status === 429) {
        setResendStatus('error')
        setResendMessage(result.message || 'Maximum resends reached. Try again in an hour.')
      } else {
        setResendStatus('error')
        setResendMessage(result.error || 'Failed to resend email. Please try again.')
      }
    } catch (err) {
      setResendStatus('error')
      setResendMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get banner content based on error/resent params
  const getBanner = () => {
    if (resent === 'true' || resendStatus === 'success') {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
          <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{resendStatus === 'success' ? resendMessage : 'Verification email resent. Check your inbox.'}</p>
          </div>
        </div>
      )
    }

    switch (error) {
      case 'link_expired':
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">That link has expired. Request a new one below.</p>
            </div>
          </div>
        )
      case 'invalid_token':
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">That link is invalid. Please request a new one.</p>
            </div>
          </div>
        )
      case 'token_already_used':
        return (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This link has already been used. Try logging in.</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-lg">▶</span>
            </div>
            <h1 className="text-2xl font-bold text-white">LeadFlow AI</h1>
          </Link>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Banner */}
            {getBanner()}

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Mail className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Check your inbox</h2>
              
              <p className="text-slate-300 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-emerald-400 font-semibold break-all">
                  {email || 'your email address'}
                </span>
                . Click the link to activate your account.
              </p>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <p className="text-sm text-slate-400">
                  The link expires in 24 hours.
                </p>
              </div>

              {/* Resend Button */}
              <div className="pt-4">
                {resendStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                    {resendMessage}
                  </div>
                )}

                <Button
                  onClick={handleResend}
                  disabled={loading || countdown > 0 || !email}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    <>Resend in {countdown}s</>
                  ) : (
                    <>Resend email</>
                  )}
                </Button>
              </div>

              {/* Secondary Link */}
              <div className="pt-2">
                <Link
                  href="/signup"
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
                >
                  Wrong email? Sign up with a different address
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Already verified?{' '}
          <Link href="/login" className="text-slate-400 hover:text-slate-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

// Main page component with Suspense
export default function CheckYourInboxPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-lg">▶</span>
              </div>
              <h1 className="text-2xl font-bold text-white">LeadFlow AI</h1>
            </div>
          </div>
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <CheckYourInboxContent />
    </Suspense>
  )
}
