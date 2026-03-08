'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Minus, ArrowRight, Sparkles } from 'lucide-react'

// Pricing data matching PMF.md
const PRICING_TIERS = [
  {
    name: 'Starter',
    tier: 'starter',
    price: 49,
    description: 'Solo agents testing AI',
    features: [
      { text: '100 SMS responses/mo', included: true },
      { text: 'Basic AI quality', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: '1 agent included', included: true },
      { text: 'Email support', included: true },
      { text: 'Cal.com booking', included: false },
      { text: 'Lead qualification scoring', included: false },
      { text: 'Lead routing', included: false },
      { text: 'White-label', included: false },
    ],
    cta: 'Get Started',
    ctaLink: '/signup?plan=starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: 149,
    description: 'Core plan for working agents',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI (Claude)', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: '1 agent included', included: true },
      { text: 'Priority support', included: true },
      { text: 'Lead routing', included: false },
      { text: 'White-label', included: false },
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    tier: 'team',
    price: 399,
    description: 'Small teams (up to 5 agents)',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI (Claude)', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: '5 agents included', included: true },
      { text: 'Lead routing', included: true },
      { text: 'Priority support', included: true },
      { text: 'White-label', included: false },
    ],
    cta: 'Get Started',
    ctaLink: '/signup?plan=team',
    highlighted: false,
  },
  {
    name: 'Brokerage',
    tier: 'brokerage',
    price: '999+',
    description: 'Large brokerages & white-label',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI + Custom', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics + Admin', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: 'Unlimited agents', included: true },
      { text: 'Lead routing', included: true },
      { text: 'White-label', included: true },
      { text: 'Compliance reporting', included: true },
      { text: 'Dedicated support', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:hello@leadflow.ai',
    highlighted: false,
  },
]

export default function HomePage() {
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LeadFlow AI</h1>
          <nav className="flex items-center gap-4">
            <Link 
              href="/pricing" 
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/onboarding" 
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            AI-Powered Lead Response
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Instantly qualify and respond to real estate leads using Claude AI.
            Never miss another opportunity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/onboarding"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/login"
              className="px-8 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <button 
              onClick={testWebhook}
              disabled={isLoading}
              className="px-8 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Webhook'}
            </button>
          </div>
          
          {testResult && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Result:</p>
              <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                {testResult}
              </pre>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
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

        {/* Pricing Section */}
        <section className="mt-24" id="pricing">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Choose the perfect plan for your real estate business. All plans include a 14-day free trial.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                Currently offering free pilots to qualifying agents —{' '}
                <Link href="/pilot" className="underline hover:text-emerald-600">
                  Join the pilot
                </Link>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`relative rounded-2xl border transition-all duration-200 ${
                  tier.highlighted
                    ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-emerald-500/20 scale-[1.02]'
                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                } p-6 overflow-hidden`}
              >
                {/* Background gradient for highlighted */}
                {tier.highlighted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 pointer-events-none" />
                )}

                <div className="relative z-10">
                  {/* Popular badge */}
                  {tier.highlighted && (
                    <div className="absolute -top-2 -right-2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}

                  <h4 className="text-xl font-bold text-white mb-1">{tier.name}</h4>
                  <p className="text-slate-400 text-sm mb-4">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${tier.price}</span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={tier.ctaLink}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all mb-6 flex items-center justify-center gap-2 ${
                      tier.highlighted
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-500'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* View Full Comparison Link */}
          <div className="mt-8 text-center">
            <Link 
              href="/pricing" 
              className="text-emerald-500 hover:text-emerald-400 font-medium inline-flex items-center gap-2"
            >
              View full feature comparison
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* API Endpoints */}
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
