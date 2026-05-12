'use client'

import { CheckCircle2 } from 'lucide-react'

function formatResponseTime(ms: number | null): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function OnboardingConfirm({
  onBack,
  onNext,
  agentData,
}: {
  onBack: () => void
  onNext: () => void
  agentData: any
}) {
  const completionTimestamp = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">You're all set!</h2>
          <p className="text-slate-300">
            Review your information before starting your free 60-day pilot
          </p>
          <p className="text-xs text-slate-500 mt-2">Completed on {completionTimestamp}</p>
        </div>

        {/* Summary */}
        <div className="space-y-4 mb-8">
          {/* Account Info */}
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wide">
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-slate-400">Email</span>
                <span className="text-white font-medium">{agentData.email}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400">Name</span>
                <span className="text-white font-medium">
                  {agentData.firstName} {agentData.lastName}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400">Phone</span>
                <span className="text-white font-medium">
                  {agentData.phoneNumber
                    ? `(${agentData.phoneNumber.slice(0, 3)}) ${agentData.phoneNumber.slice(
                        3,
                        6
                      )}-${agentData.phoneNumber.slice(6)}`
                    : 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400">State</span>
                <span className="text-white font-medium">{agentData.state || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wide">
              Connected Integrations
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="text-slate-300">Cal.com Booking</span>
                </div>
                <span className={`text-sm font-medium ${
                  agentData.calcomLink ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {agentData.calcomLink ? '✓ Connected' : '○ Skipped'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="text-slate-300">Twilio SMS</span>
                </div>
                <span className={`text-sm font-medium ${
                  agentData.smsPhoneNumber ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {agentData.smsPhoneNumber ? '✓ Connected' : '○ Skipped'}
                </span>
              </div>
              {/* Aha Moment Simulator status */}
              {(() => {
                const simulatorCompleted = agentData.ahaCompleted
                const simulatorSkipped = agentData.ahaSkipped
                return (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <span className="text-slate-300">AI Demo Response</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      simulatorCompleted ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {simulatorCompleted
                        ? `✓ Saw AI respond in ${formatResponseTime(agentData.ahaResponseTimeMs)}`
                        : simulatorSkipped
                        ? '⊘ Skipped for now'
                        : '⊘ Not started'}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Pilot Plan Info */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-emerald-300 mb-3 uppercase tracking-wide">
              Your Free Pilot
            </h3>
            <div className="space-y-2 text-sm text-emerald-200/80">
              <div className="flex justify-between">
                <span>Plan</span>
                <span className="font-medium text-emerald-300">Free Pilot</span>
              </div>
              <div className="flex justify-between">
                <span>Duration</span>
                <span className="font-medium text-emerald-300">60 days</span>
              </div>
              <div className="flex justify-between">
                <span>Credit card</span>
                <span className="font-medium text-emerald-300">Not required</span>
              </div>
              <div className="flex justify-between">
                <span>Access level</span>
                <span className="font-medium text-emerald-300">Full features</span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">What's next?</h3>
            <ul className="space-y-2 text-sm text-blue-200/80">
              <li className="flex gap-2">
                <span>1.</span>
                <span>We'll create your LeadFlow AI account and dashboard</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>You'll be able to connect lead sources (Zillow, Realtor.com, etc.)</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Start receiving and responding to leads instantly</span>
              </li>
            </ul>
          </div>

          {/* Pricing teaser — soft nudge, does not gate onboarding */}
          <div data-testid="onboarding-shows-price" className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-4">
            <p className="text-sm text-slate-300">
              Plans start at <strong className="text-white">$49/mo</strong>. Upgrade any time during your trial —
              no credit card needed to get started.{' '}
              <a href="/dashboard/pricing" className="text-emerald-400 hover:text-emerald-300 underline">
                See all plans →
              </a>
            </p>
          </div>

          {/* Terms */}
          <div className="p-4 bg-slate-700/20 rounded-lg">
            <p className="text-xs text-slate-400">
              By completing onboarding, you agree to our{' '}
              <a href="/terms" className="text-emerald-400 hover:text-emerald-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-emerald-400 hover:text-emerald-300">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            onClick={onNext}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            See Your First AI Response
          </button>
        </div>
      </div>

      {/* Testimonial */}
      <div className="mt-8 bg-slate-800/50 border border-slate-700/30 rounded-lg p-6 text-center">
        <p className="text-slate-300 italic mb-3">
          "I was missing 35% of my leads. LeadFlow AI changed the game for me. Now I respond
          instantly and close more deals."
        </p>
        <p className="text-sm text-slate-400">— Real Estate Agent, California</p>
      </div>
    </div>
  )
}
