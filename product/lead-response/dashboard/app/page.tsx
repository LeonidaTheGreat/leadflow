'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Check, Zap, MessageSquare, Link2, BarChart3, Shield, Clock } from 'lucide-react'

// ─── Helper: CTA Button ───────────────────────────────────────────────────────
function StartTrialButton({
  size = 'lg',
  className = '',
}: {
  size?: 'sm' | 'lg'
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
  const sizes = {
    sm: 'px-6 py-3 text-sm gap-1.5',
    lg: 'px-8 py-4 text-lg gap-2',
  }
  return (
    <Link href="/signup?mode=trial" className={`${base} ${sizes[size]} ${className}`}>
      Start Free Trial — No Credit Card
      <ArrowRight className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
    </Link>
  )
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: 49,
    description: 'For individual agents getting started',
    features: ['Up to 50 leads/month', 'AI SMS responses', 'FUB integration', 'Email support'],
    cta: 'Get Starter',
    href: '/signup?plan=starter',
  },
  {
    name: 'Pro',
    price: 149,
    description: 'Most popular for growing agents',
    popular: true,
    features: [
      'Up to 200 leads/month',
      'AI SMS & email',
      'Advanced qualification',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Get Pro',
    href: '/signup?plan=pro',
  },
  {
    name: 'Team',
    price: 399,
    description: 'For teams and brokerages',
    features: [
      'Up to 500 leads/month',
      'Multi-channel AI',
      'Custom workflows',
      'Team management',
      'Dedicated support',
    ],
    cta: 'Get Team',
    href: '/signup?plan=team',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 backdrop-blur-lg bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <span className="text-lg font-semibold text-white">LeadFlow AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/pilot" className="hover:text-white transition-colors">Pilot Program</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white font-medium transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <StartTrialButton size="sm" />
          </div>
        </div>
      </header>

      {/* ── Hero — CTA Placement 1 ── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-32">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Pilot badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now in Pilot · Limited spots available
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Close More Deals.<br />
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Respond in 30 Seconds.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            LeadFlow AI responds to your real estate leads via SMS instantly — qualifying them,
            booking appointments, and syncing with your CRM. You close, we chase.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <StartTrialButton size="lg" />
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Social proof micro-copy */}
          <p className="mt-6 text-sm text-slate-500">
            Free for 30 days · No credit card · Setup in 5 minutes
          </p>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto border-t border-slate-800 pt-10">
            {[
              { value: '<30s', label: 'Avg response time' },
              { value: '3x', label: 'More conversions' },
              { value: '30 days', label: 'Free trial' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — CTA Placement 2 ── */}
      <section id="features" className="px-4 py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything you need to win leads</h2>
            <p className="text-xl text-slate-400">Built for real estate agents who want to automate without losing the human touch.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-emerald-400" />}
              title="AI Lead Qualification"
              description="Claude AI analyzes every lead in seconds — extracting intent, budget, timeline, and property preferences before you pick up the phone."
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6 text-emerald-400" />}
              title="Instant SMS Response"
              description="Send personalized, on-brand SMS replies within 30 seconds of lead creation. Never lose a lead to a slow response again."
            />
            <FeatureCard
              icon={<Link2 className="w-6 h-6 text-emerald-400" />}
              title="CRM Integration"
              description="Seamless two-way sync with Follow Up Boss. Leads flow in, AI responds, appointments flow back — all without switching tabs."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-emerald-400" />}
              title="Appointment Booking"
              description="AI offers your Cal.com availability directly in the conversation. Leads book, you show up. No back-and-forth."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-emerald-400" />}
              title="Lead Analytics"
              description="Track response rates, qualification scores, and conversion metrics in real time. Know exactly where your pipeline stands."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-emerald-400" />}
              title="TCPA Compliant"
              description="Built with SMS consent and A2P 10DLC compliance from the ground up. Message legally, at scale, without worry."
            />
          </div>

          {/* Features Section CTA */}
          <div className="text-center">
            <p className="text-slate-400 mb-6 text-lg">Ready to stop losing leads to slow follow-up?</p>
            <StartTrialButton size="lg" />
            <p className="mt-4 text-sm text-slate-500">Free for 30 days · Full Pro access · No credit card</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Up and running in minutes</h2>
            <p className="text-xl text-slate-400">From signup to first AI response in under 10 minutes.</p>
          </div>
          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Start your free trial',
                desc: 'Create your account with just email and password. No credit card required.',
              },
              {
                step: '02',
                title: 'Connect Follow Up Boss',
                desc: 'Paste your FUB webhook URL. Leads start flowing in automatically.',
              },
              {
                step: '03',
                title: 'AI handles the rest',
                desc: 'Every new lead gets an instant, personalized SMS. You step in only when they\'re qualified.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-6 items-start">
                <div className="shrink-0 w-12 h-12 rounded-full border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                  <p className="text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing — CTA Placement 3 ── */}
      <section id="pricing" className="px-4 py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-slate-400">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  plan.popular
                    ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/40 to-slate-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 text-sm">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Link
                    href={plan.href}
                    className={`block w-full text-center px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  {/* Pricing section trial CTA — FR-5 */}
                  <Link
                    href="/signup?mode=trial"
                    className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 transition-all"
                  >
                    or start free trial →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing guarantee */}
          <div className="text-center text-slate-400 text-sm space-y-1">
            <p>All plans include a 30-day free trial. No credit card required to start.</p>
            <p>
              Pilot program participants?{' '}
              <Link href="/pilot" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Apply for the pilot program
              </Link>{' '}
              for a dedicated onboarding session.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA Banner ── */}
      <section className="px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Start responding in{' '}
            <span className="text-emerald-400">30 seconds</span>
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join agents already using LeadFlow AI to convert more leads — without working more hours.
          </p>
          <StartTrialButton size="lg" />
          <p className="mt-4 text-sm text-slate-500">
            Free for 30 days · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 px-4 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-xs">▶</span>
            </div>
            <span className="text-sm font-semibold text-white">LeadFlow AI</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/pilot" className="hover:text-slate-300 transition-colors">Pilot Program</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            <Link href="/signup?mode=trial" className="hover:text-slate-300 transition-colors">Start Free Trial</Link>
          </nav>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} LeadFlow AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
