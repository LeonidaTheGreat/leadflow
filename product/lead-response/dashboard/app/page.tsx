'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import TrialSignupForm from '@/components/trial-signup-form'
import { trackCTAClick } from '@/lib/analytics/ga4'
import LeadMagnetSection from '@/components/LeadMagnetSection'
import { useUtmCapture } from '@/lib/utm-capture'
import { ScrollDepthTracker } from '@/components/scroll-depth-tracker'

export default function HomePage() {
  // Capture UTM parameters on mount (first-touch wins)
  useUtmCapture()
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      {/* Scroll Depth Tracking */}
      <ScrollDepthTracker />
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LeadFlow AI</h1>
          <nav className="flex items-center gap-4">
            <a
              href="#pricing"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/pilot"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pilot Program
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
                href="#how-it-works"
                className="hover:text-white underline underline-offset-4"
                onClick={() => trackCTAClick('see_how_it_works', 'See how it works', 'hero')}
              >
                See how it works ↓
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar — PRD FR-2 Specification */}
      <section className="bg-slate-100 dark:bg-slate-800 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">&lt;30s</div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Response Time</h4>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">78%</div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Deals to First Responder</h4>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">35%</div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Leads Never Responded To</h4>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">24/7</div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Always On</h4>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — 3 Steps */}
      <section id="how-it-works" data-testid="how-it-works" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
          How It Works
        </h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Get started in minutes — no technical setup required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <HowItWorksStep
            step={1}
            title="Connect Your CRM"
            description="Link your Follow Up Boss account in one click. We sync your leads automatically."
          />
          <HowItWorksStep
            step={2}
            title="AI Responds Instantly"
            description="When a new lead arrives, our AI qualifies them and sends a personalized SMS in under 30 seconds."
          />
          <HowItWorksStep
            step={3}
            title="Book & Close"
            description="Qualified leads get booked on your calendar. You focus on showing homes and closing deals."
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white dark:bg-slate-900 py-20">
        <div className="container mx-auto px-4">
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
        </div>
      </section>

      {/* Testimonials — Social Proof Section */}
      <section id="testimonials" data-testid="testimonials" className="bg-white dark:bg-slate-900 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            What Real Estate Agents Are Saying
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Join hundreds of agents who have transformed their lead response.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} />
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
            Results may vary. Testimonials represent expected outcomes based on typical usage.
          </p>
        </div>
      </section>

      {/* Lead Magnet — Email Capture (feat-lead-magnet-email-capture) */}
      <LeadMagnetSection />

      {/* Pricing — CTA Placement #3 */}
      <section id="pricing" data-testid="pricing" className="bg-white dark:bg-slate-900 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            Simple, Transparent Pricing
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Start with a free 30-day trial. Upgrade when you&apos;re ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <PricingCard
              name="Starter"
              price="$49"
              period="/month"
              description="Perfect for solo agents"
              badge="Free pilot"
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
              badge="Most popular"
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
              description="For small teams"
              badge="5 agents"
              features={[
                'Up to 500 leads/month',
                'Multi-channel AI',
                'Custom workflows',
                'Team management (5 agents)',
                'Dedicated support',
                'White-label options'
              ]}
            />
            <PricingCard
              name="Brokerage"
              price="$999+"
              period="/month"
              description="For large brokerages (20+ agents)"
              badge="Enterprise"
              features={[
                'Unlimited leads',
                'Multi-channel AI (SMS/email/voice)',
                'Unlimited agents',
                'White-label options',
                'Admin dashboard & compliance',
                'Dedicated account manager',
                'SLA guarantees (99.9% uptime)',
                'Custom integrations'
              ]}
              cta="Contact Sales"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link href="/pilot" className="hover:text-slate-900 dark:hover:text-white">Pilot Program</Link>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const testimonials = [
  {
    quote: "I used to lose leads because I couldn't respond fast enough. LeadFlow changed that overnight.",
    name: "Sarah M.",
    title: "Solo Agent, Austin TX",
  },
  {
    quote: "My response time went from 2 hours to 30 seconds. I've booked 3 extra appointments this month.",
    name: "Mike R.",
    title: "Team Lead, Denver CO",
  },
  {
    quote: "Setup took 5 minutes. The AI sounds like me, not a robot.",
    name: "Jennifer K.",
    title: "Realtor, Miami FL",
  },
]

function HowItWorksStep({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center" data-testid={`how-it-works-step-${step}`}>
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">
        {step}
      </div>
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h4>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
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

function TestimonialCard({
  quote,
  name,
  title,
}: {
  quote: string
  name: string
  title: string
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col" data-testid="testimonial-card">
      <div className="text-emerald-500 text-4xl mb-4">"</div>
      <p className="text-slate-700 dark:text-slate-300 mb-6 flex-grow">{quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  cta = 'Get Started',
  badge
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  cta?: string
  badge?: string
}) {
  const isBrokerage = name === 'Brokerage'

  const getBadgeColor = () => {
    if (popular) return 'bg-emerald-500 text-white'
    if (name === 'Starter') return 'bg-blue-500 text-white'
    if (name === 'Team') return 'bg-purple-500 text-white'
    return 'bg-slate-600 text-white'
  }

  return (
    <div className={`rounded-xl border-2 p-8 ${popular ? 'border-emerald-500 relative shadow-lg shadow-emerald-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`${getBadgeColor()} text-xs font-bold px-3 py-1 rounded-full`}>
            {badge}
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
        href={isBrokerage ? 'mailto:sales@leadflow.ai' : `/signup?plan=${name.toLowerCase()}`}
        onClick={() => trackCTAClick(`pricing_${name.toLowerCase()}`, `${cta} ${name}`, 'pricing')}
        className={`mt-6 w-full block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
          popular
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
        }`}
      >
        {cta}
      </Link>
      {!isBrokerage && (
        <Link
          href="/signup/trial"
          className="mt-3 block text-center text-sm text-emerald-500 hover:text-emerald-600 font-medium"
        >
          or start free trial →
        </Link>
      )}
    </div>
  )
}
