'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackCTAClick, attachScrollMilestoneObservers } from '@/lib/analytics/ga4'
import LeadMagnetSection from '@/components/LeadMagnetSection'
import PricingSection from '@/components/PricingSection'
import TrialSignupForm from '@/components/trial-signup-form'

export default function HomePage() {
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Scroll-depth milestone refs (FR-3 / US-2)
  // ref25 → 25%, ref50 → 50%, ref75 → 75%
  const ref25 = useRef<HTMLDivElement>(null)
  const ref50 = useRef<HTMLDivElement>(null)
  const ref75 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = attachScrollMilestoneObservers([
      ref25.current,
      ref50.current,
      ref75.current,
    ])
    return cleanup
  }, [])

  const testWebhook = async () => {
    setIsLoading(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/webhook/fub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lead.created',
          data: {
            id: 'test-' + Date.now(),
            firstName: 'Test',
            lastName: 'User',
            phoneNumber: '+14165550000',
            email: 'test@example.com',
            source: 'Website',
            status: 'New Lead',
            consents: { sms: true }
          }
        })
      })
      const data = await response.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setTestResult('Error: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header / Nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LeadFlow AI</h1>
          <nav className="flex items-center gap-4">
            <a
              href="#pricing"
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pricing
            </a>
            {/* CTA: start_free_trial_nav (FR-2) */}
            <Link
              href="/signup/trial"
              onClick={() => trackCTAClick('start_free_trial_nav', 'Start Free Trial', 'navigation')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
              data-cta-id="start_free_trial_nav"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              onClick={() => trackCTAClick('sign_in_nav', 'Sign In', 'navigation')}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — scroll milestone 25% anchor */}
      <main className="container mx-auto px-4 py-16">
        <div ref={ref25} className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            AI-Powered Lead Response
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Instantly qualify and respond to real estate leads using Claude AI.
            Never miss another opportunity.
          </p>

          <div className="flex flex-col items-center gap-4">
            {/* CTA: start_free_trial_hero (FR-1) - Primary CTA */}
            <Link
              href="/signup/trial"
              onClick={() =>
                trackCTAClick('start_free_trial_hero', 'Start Free Trial — No Credit Card Required', 'hero')
              }
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
              data-cta-id="start_free_trial_hero"
            >
              Start Free Trial — No Credit Card Required
            </Link>
            {/* CTA: pilot_program_secondary (FR-2) - Secondary link */}
            <p className="text-sm text-slate-500">
              Or{' '}
              <Link
                href="/pilot"
                onClick={() =>
                  trackCTAClick('pilot_program_secondary', 'Apply for Structured Pilot Program', 'hero')
                }
                className="underline hover:text-slate-700 transition-colors"
                data-cta-id="pilot_program_secondary"
              >
                apply for our Structured Pilot Program
              </Link>{' '}
              for teams/brokerages
            </p>
            {/* CTA: see_how_it_works (FR-2) */}
            <button
              onClick={() => {
                trackCTAClick('see_how_it_works', 'See How It Works', 'hero')
                testWebhook()
              }}
              disabled={isLoading}
              className="px-8 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              data-cta-id="see_how_it_works"
            >
              {isLoading ? 'Testing...' : 'See How It Works'}
            </button>
          </div>

          {/* CTA Placement #1: TrialSignupForm compact in hero */}
          <TrialSignupForm compact className="mt-8" />

          {testResult && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Result:</p>
              <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                {testResult}
              </pre>
            </div>
          )}
        </div>

        {/* Features — scroll milestone 50% anchor */}
        <div ref={ref50} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="AI Qualification"
            description="Claude 3.5 Sonnet analyzes leads to extract intent, budget, timeline, and property preferences."
            icon="🤖"
          />
          <FeatureCard
            title="Instant SMS"
            description="Automatically send personalized SMS responses within seconds of lead creation."
            icon="📱"
          />
          <FeatureCard
            title="CRM Integration"
            description="Seamlessly sync with Follow Up Boss and Cal.com for booking appointments."
            icon="🔗"
          />
        </div>

        {/* ── Lead Magnet / Email Capture (between Hero/Features and Pricing) ── */}
        <LeadMagnetSection />

        {/* CTA Placement #2: End of Features section */}
        <div className="mt-12 text-center">
          <Link
            href="/signup/trial"
            onClick={() => trackCTAClick('features_trial_cta', 'Start Free Trial', 'features')}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors inline-block"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Pricing Section — scroll milestone 75% anchor (FR-1) */}
        <div ref={ref75}>
          <PricingSection />
        </div>

        {/* API Endpoints (developer reference) */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">API Endpoints</h3>
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white">Endpoint</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white">Method</th>
                  <th className="px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">/api/webhook</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">POST</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">Generic lead webhook</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">/api/webhook/fub</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">POST</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">Follow Up Boss webhook</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">/api/sms/send</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">POST</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">Send SMS</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">/api/sms/status</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">POST</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">Twilio status callback</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">/api/booking</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">GET</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">Get booking link</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-slate-600 dark:text-slate-400">
          <p>Built with Next.js 15, shadcn/ui, Supabase, and Claude AI</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  )
}
