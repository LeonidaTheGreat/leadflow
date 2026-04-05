'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key,
  Link2,
  ClipboardCopy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

interface FubUser {
  name: string
  email: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['API Key', 'Webhook', 'Test Lead', 'Done']
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 3 * 60 * 1_000 // 3 minutes

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10" data-testid="step-indicator">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = (index + 1) as Step
        const isCompleted = stepNumber < currentStep
        const isActive = stepNumber === currentStep

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-orange-500 text-white ring-4 ring-orange-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
                data-testid={`step-circle-${stepNumber}`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-orange-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`h-px w-12 mx-1 mb-4 transition-all ${
                  stepNumber < currentStep ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: API Key ──────────────────────────────────────────────────────────

function Step1ApiKey({
  onNext,
}: {
  onNext: (fubUser: FubUser | null) => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async () => {
    setError('')

    if (!apiKey.trim()) {
      setError('Please enter your FUB API key.')
      return
    }

    if (apiKey.trim().length < 20) {
      setError('API key must be at least 20 characters. Double-check Follow Up Boss → Admin → API.')
      return
    }

    setIsVerifying(true)

    try {
      const response = await fetch('/api/onboarding/fub/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        setError(data.error || 'Invalid API key. Check Follow Up Boss → Admin → API.')
        return
      }

      onNext(data.fubUser ?? null)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="animate-in fade-in-0 duration-300" data-testid="step-1-api-key">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-5">
          <Key className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Connect Follow Up Boss</h2>
        <p className="text-slate-400 text-center text-sm">
          Enter your FUB API key to get started.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            FUB API Key
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
            <input
              data-testid="fub-api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify()
              }}
              placeholder="Paste your FUB API key here"
              className={`w-full pl-10 pr-16 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
                error
                  ? 'border-red-500 focus:ring-red-500/40'
                  : 'border-slate-600 focus:border-orange-500 focus:ring-orange-500/30'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 text-xs font-medium px-1 py-1"
              data-testid="toggle-show-key"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Find your key in{' '}
            <a
              href="https://app.followupboss.com/2/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-0.5"
              data-testid="fub-api-link"
            >
              Follow Up Boss → Admin → API <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {error && (
          <div
            className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
            data-testid="api-key-error"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          data-testid="verify-api-key-btn"
          onClick={handleVerify}
          disabled={isVerifying || !apiKey.trim()}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify &amp; Continue
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Webhook URL ──────────────────────────────────────────────────────

function Step2Webhook({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onboarding/fub/webhook-url')
      .then((r) => r.json())
      .then((d) => setWebhookUrl(d.url ?? ''))
      .catch(() => setWebhookUrl(''))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCopy = async () => {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      const el = document.getElementById('webhook-url-display') as HTMLInputElement | null
      el?.select()
    }
  }

  return (
    <div className="animate-in fade-in-0 duration-300" data-testid="step-2-webhook">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-5">
          <Link2 className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Add Webhook to FUB</h2>
        <p className="text-slate-400 text-center text-sm">
          Paste this URL in Follow Up Boss so leads are sent to LeadFlow automatically.
        </p>
      </div>

      <div className="space-y-5">
        {/* Webhook URL display */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Your LeadFlow Webhook URL
          </label>
          {isLoading ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-slate-800 border border-slate-600 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              <span className="text-slate-500 text-sm">Loading…</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="webhook-url-display"
                data-testid="webhook-url-display"
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 py-3 px-4 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm font-mono focus:outline-none select-all"
              />
              <button
                data-testid="copy-webhook-url-btn"
                onClick={handleCopy}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium min-w-[90px] justify-center"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-200 mb-3">How to add this in FUB:</p>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-orange-400 font-bold shrink-0">1.</span>
              Open Follow Up Boss → <strong className="text-slate-300">Admin</strong> → <strong className="text-slate-300">Webhooks</strong>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 font-bold shrink-0">2.</span>
              Click <strong className="text-slate-300">Add Webhook</strong>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 font-bold shrink-0">3.</span>
              Paste the URL above and select the <strong className="text-slate-300">New Lead</strong> event
            </li>
            <li className="flex gap-2">
              <span className="text-orange-400 font-bold shrink-0">4.</span>
              Click <strong className="text-slate-300">Save</strong>
            </li>
          </ol>
          <a
            href="https://app.followupboss.com/2/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            data-testid="fub-webhooks-link"
          >
            Open FUB Webhooks <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Confirmation checkbox */}
        <label
          className="flex items-start gap-3 cursor-pointer group"
          data-testid="webhook-confirm-label"
        >
          <input
            data-testid="webhook-confirm-checkbox"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-orange-500 cursor-pointer"
          />
          <span className="text-sm text-slate-300 group-hover:text-slate-200 transition">
            I&apos;ve added the webhook in Follow Up Boss
          </span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            data-testid="step2-back-btn"
            onClick={onBack}
            className="flex-1 py-3 px-4 border border-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-700/40 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            data-testid="step2-next-btn"
            onClick={onNext}
            disabled={!confirmed}
            className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Next: Test Lead
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Test Lead ────────────────────────────────────────────────────────

function Step3TestLead({
  onSuccess,
  onBack,
}: {
  onSuccess: (leadName: string) => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<'waiting' | 'received' | 'timeout'>('waiting')
  const [leadName, setLeadName] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)

  const poll = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding/fub/test-status')
      const data = await response.json()
      if (data.received === true) {
        setLeadName(data.leadName ?? 'Test Lead')
        setStatus('received')
        return true
      }
    } catch {
      // Non-fatal — continue polling
    }
    return false
  }, [])

  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()

    const tick = async () => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt
      setElapsedMs(elapsed)

      if (elapsed >= POLL_TIMEOUT_MS) {
        setStatus('timeout')
        return
      }

      const received = await poll()
      if (received || cancelled) return

      setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [poll])

  useEffect(() => {
    if (status === 'received') {
      const timer = setTimeout(() => {
        onSuccess(leadName)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [status, leadName, onSuccess])

  const timeLeft = Math.max(0, Math.round((POLL_TIMEOUT_MS - elapsedMs) / 1000))
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeLeftStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="animate-in fade-in-0 duration-300" data-testid="step-3-test-lead">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">📬</span>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Send a Test Lead</h2>
        <p className="text-slate-400 text-center text-sm">
          Create a test contact in FUB — LeadFlow will detect it within 30 seconds.
        </p>
      </div>

      <div className="space-y-5">
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-200 mb-3">How to send a test lead:</p>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold shrink-0">1.</span>
              Open Follow Up Boss → <strong className="text-slate-300">People</strong>
            </li>
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold shrink-0">2.</span>
              Click <strong className="text-slate-300">Add Person</strong> and create a test contact
            </li>
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold shrink-0">3.</span>
              Add a phone number and save — LeadFlow will detect it here automatically
            </li>
          </ol>
        </div>

        {/* Status indicator */}
        <div
          data-testid="test-lead-status"
          className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
            status === 'received'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : status === 'timeout'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-slate-800/40 border-slate-700'
          }`}
        >
          {status === 'waiting' && (
            <>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
              <div>
                <p className="text-slate-200 text-sm font-medium">Waiting for test lead…</p>
                <p className="text-slate-500 text-xs">Checking every 5 seconds · {timeLeftStr} remaining</p>
              </div>
            </>
          )}
          {status === 'received' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 text-sm font-medium">Lead received!</p>
                {leadName && <p className="text-slate-400 text-xs">{leadName}</p>}
              </div>
            </>
          )}
          {status === 'timeout' && (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">No lead received yet.</p>
                <p className="text-slate-400 text-xs">
                  Make sure you added the webhook URL from Step 2. Check FUB → Admin → Webhooks.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            data-testid="step3-back-btn"
            onClick={onBack}
            className="flex-1 py-3 px-4 border border-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-700/40 transition-all duration-200"
          >
            ← Back
          </button>
          {status === 'timeout' && (
            <button
              data-testid="step3-skip-btn"
              onClick={() => onSuccess('')}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-all duration-200"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function Step4Success({
  leadName,
  fubUser,
}: {
  leadName: string
  fubUser: FubUser | null
}) {
  const router = useRouter()

  const handleGoToDashboard = async () => {
    try {
      await fetch('/api/onboarding/fub/complete', { method: 'POST' })
    } catch {
      // Non-fatal — still redirect
    }
    router.push('/dashboard')
  }

  return (
    <div className="animate-in fade-in-0 duration-300 text-center" data-testid="step-4-success">
      <div className="mb-8">
        <div
          className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6 animate-in zoom-in-50 duration-500"
          data-testid="success-checkmark"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">You&apos;re connected!</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          FUB is connected. When a new lead arrives, LeadFlow will respond via SMS within 30 seconds.
        </p>
      </div>

      {(leadName || fubUser) && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6 text-left space-y-2">
          {fubUser?.name && (
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">FUB account: </span>
              <span className="font-medium text-slate-200">{fubUser.name}</span>
            </p>
          )}
          {leadName && (
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Test lead received: </span>
              <span className="font-medium text-emerald-400">{leadName}</span>
            </p>
          )}
        </div>
      )}

      <button
        data-testid="go-to-dashboard-btn"
        onClick={handleGoToDashboard}
        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        Go to Dashboard
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Main Wizard Page ─────────────────────────────────────────────────────────

export default function FubWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [fubUser, setFubUser] = useState<FubUser | null>(null)
  const [testLeadName, setTestLeadName] = useState('')

  // Check if wizard already completed — redirect to dashboard
  useEffect(() => {
    fetch('/api/onboarding/fub/status')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json()
        // If fub_onboarding_completed is true, agent has already set up FUB — go to dashboard
        if (data.fub_onboarding_completed) {
          router.push('/dashboard')
        }
      })
      .catch(() => {
        // Network error — allow wizard to load, don't block the user
      })
  }, [router])

  const handleStep1Next = (user: FubUser | null) => {
    setFubUser(user)
    setStep(2)
  }

  const handleStep2Next = () => {
    setStep(3)
  }

  const handleStep3Success = (leadName: string) => {
    setTestLeadName(leadName)
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LF</span>
            </div>
            <span className="text-white font-semibold">LeadFlow</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-300">FUB Setup Wizard</h1>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8">
          <StepIndicator currentStep={step} />

          {step === 1 && <Step1ApiKey onNext={handleStep1Next} />}
          {step === 2 && (
            <Step2Webhook
              onNext={handleStep2Next}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3TestLead
              onSuccess={handleStep3Success}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Success
              leadName={testLeadName}
              fubUser={fubUser}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Need help?{' '}
          <a
            href="mailto:support@leadflowai.com"
            className="text-slate-500 hover:text-slate-400 transition"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
