'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import TrialSignupForm from '@/components/trial-signup-form'
import { trackCTAClick, trackScrollDepth } from '@/lib/ga4'

function ScrollDepthTracker() {
  const [trackedDepths, setTrackedDepths] = useState<Set<number>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll depth as percentage
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY

      const totalScrollableHeight = documentHeight - windowHeight
      if (totalScrollableHeight <= 0) return

      const scrollDepthPercent = Math.round((scrollTop / totalScrollableHeight) * 100)

      // Track at 25%, 50%, 75%, 90%
      const milestones = [25, 50, 75, 90]
      milestones.forEach(milestone => {
        if (scrollDepthPercent >= milestone && !trackedDepths.has(milestone)) {
          trackScrollDepth(milestone)
          setTrackedDepths(prev => new Set([...prev, milestone]))
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trackedDepths])

  return null
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ScrollDepthTracker />
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LeadFlow AI</h1>
          <nav className="flex items-center gap-4">
            <a
              href="#pricing"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              onClick={() => trackCTAClick('nav', 'Pricing', '#pricing')}
            >
              Pricing
            </a>
            <Link
              href="/pilot"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              onClick={() => trackCTAClick('nav', 'Pilot Program', '/pilot')}
            >
              Pilot Program
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              onClick={() => trackCTAClick('nav', 'Sign In', '/login')}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — CTA Placement #1 */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered Lead Response in Under 30 Seconds
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              Instantly qualify and respond to real estate leads using AI.
              Never miss another opportunity. Start free — no credit card required.
            </p>

            {/* Hero Trial CTA */}
            <Suspense fallback={<div className="h-24" />}>
              <TrialSignupForm compact />
            </Suspense>

            <p className="mt-6 text-sm text-slate-400">
              <a 
                href="#features" 
                className="hover:text-white underline underline-offset-4"
                onClick={() => trackCTAClick('hero', 'See how it works', '#features')}
              >See how it works ↓</a>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
          Everything You Need to Convert More Leads
        </h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          LeadFlow AI handles the hard work so you can focus on closing deals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="AI Qualification"
            description="Claude 3.5 Sonnet analyzes leads to extract intent, budget, timeline, and property preferences."
            icon="🤖"
          />
          <FeatureCard
            title="Instant SMS Response"
            description="Automatically send personalized SMS responses within seconds of lead creation."
            icon="📱"
          />
          <FeatureCard
            title="CRM Integration"
            description="Seamlessly sync with Follow Up Boss and Cal.com for booking appointments."
            icon="🔗"
          />
          <FeatureCard
            title="Smart Booking"
            description="AI books appointments directly on your calendar — leads go from inquiry to meeting in minutes."
            icon="📅"
          />
          <FeatureCard
            title="Lead Scoring"
            description="Automatic scoring based on urgency, budget, and timeline. Focus on the hottest leads first."
            icon="⭐"
          />
          <FeatureCard
            title="Analytics Dashboard"
            description="Track response times, conversion rates, and lead quality in real time."
            icon="📊"
          />
        </div>

        {/* CTA Placement #2: End of Features */}
        <div className="mt-16 text-center">
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to Respond Faster?
          </h4>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Join agents who are converting more leads with AI-powered responses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup?mode=trial"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
              onClick={() => trackCTAClick('final_cta', 'Start Free Trial', '/signup')}
            >
              Start Free Trial — No Credit Card
            </Link>
            <Link
              href="/pilot"
              className="px-8 py-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              onClick={() => trackCTAClick('final_cta', 'Apply for Pilot Program', '/pilot')}
            >
              Apply for Pilot Program →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing — CTA Placement #3 */}
      <section id="pricing" className="bg-white dark:bg-slate-900 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            Simple, Transparent Pricing
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Start with a free 30-day trial. Upgrade when you&apos;re ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$49"
              period="/month"
              description="Perfect for solo agents"
              features={[
                'Up to 50 leads/month',
                'AI SMS responses',
                'Basic qualification',
                'Calendar integration',
                'Email support'
              ]}
            />
            <PricingCard
              name="Pro"
              price="$149"
              period="/month"
              description="For growing agents"
              popular
              features={[
                'Up to 200 leads/month',
                'AI SMS & email responses',
                'Advanced qualification',
                'Calendar integration',
                'Priority support',
                'Advanced analytics'
              ]}
            />
            <PricingCard
              name="Team"
              price="$399"
              period="/month"
              description="For teams & brokerages"
              features={[
                'Up to 500 leads/month',
                'Multi-channel AI',
                'Custom workflows',
                'Team management (5 agents)',
                'Dedicated support',
                'White-label options'
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            We use Google Analytics to improve this site. No personal data is shared.
          </p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link href="/pilot" className="hover:text-slate-900 dark:hover:text-white">Pilot Program</Link>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h4>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  )
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
}) {
  return (
    <div className={`rounded-xl border-2 p-8 ${popular ? 'border-emerald-500 relative shadow-lg shadow-emerald-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}
      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h4>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900 dark:text-white">{price}</span>
        <span className="text-slate-500 dark:text-slate-400">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="text-emerald-500 mt-0.5">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={`/signup?plan=${name.toLowerCase()}`}
        className={`mt-6 w-full block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
          popular
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
        }`}
        onClick={() => trackCTAClick('pricing', `Start ${name} Plan`, `/signup?plan=${name.toLowerCase()}`)}
      >
        Get Started
      </Link>
      <Link
        href="/signup?mode=trial"
        className="mt-3 block text-center text-sm text-emerald-500 hover:text-emerald-600 font-medium"
        onClick={() => trackCTAClick('pricing', 'Start free trial', '/signup')}
      >
        or start free trial →
      </Link>
    </div>
  )
}
