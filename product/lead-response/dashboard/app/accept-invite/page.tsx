'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

type Status = 'loading' | 'success' | 'error' | 'expired'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Token must be present
    if (!token) {
      setStatus('error')
      setError('Missing invite token')
      return
    }

    // Process the invite
    processInvite(token)
  }, [token])

  async function processInvite(inviteToken: string) {
    try {
      // Call the server-side handler
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: inviteToken })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 410) {
          setStatus('expired')
          setError(data.error || 'This invite has expired. Please request a new one.')
        } else {
          setStatus('error')
          setError(data.error || 'Failed to accept invite')
        }
        return
      }

      if (data.success) {
        setStatus('success')
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/onboarding')
        }, 2000)
      } else {
        setStatus('error')
        setError(data.error || 'Failed to accept invite')
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <Loader2 className="text-emerald-400 animate-spin" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Processing Your Invite</h1>
            <p className="text-slate-400">Activating your account...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to LeadFlow! 🎉</h1>
            <p className="text-slate-400 mb-4">Your account is ready. Let's get you set up...</p>
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Redirecting to dashboard
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </a>
          </div>
        )}

        {/* Expired State */}
        {status === 'expired' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-6">
              <AlertCircle className="text-yellow-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invite Expired</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <p className="text-slate-500 text-sm mb-6">
              Contact Stojan to request a new invite.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
