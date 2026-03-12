'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Zap, MessageSquare, Clock, TrendingUp, Star, ArrowRight, Phone } from 'lucide-react'

const STATS = [
  { value: '<30s', label: 'Average response time' },
  { value: '78%', label: 'Lead engagement rate' },
  { value: '35%', label: 'More appointments booked' },
  { value: '24/7', label: 'Always on, never miss a lead' },
]

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 49,
    description: 'For solo agents testing AI lead response',
    features: [
      '100 SMS responses/month',
      'AI-powered replies',
      'Dashboard access',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    tier: 'starter',
  },
  {
    name: 'Pro',
    price: 149,
    description: 'The most popular plan for serious agents',
    features: [
      'Unlimited SMS responses',
      'Full AI + lead qualification',
      'Cal.com calendar integration',
      'Analytics & reporting',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    tier: 'pro',
  },
  {
    name: 'Team',
    price: 399,
    description: 'For teams and small brokerages',
    features: [
      'Everything in Pro',
      'Up to 5 agents',
      'Team dashboard',
      'Lead routing',
      'Dedicated success manager',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    tier: 'team',
  },
]

const FEATURES = [
  {
    icon: <Zap className="w-6 h-6 text-emerald-500" />,
    title: 'Responds in Under 30 Seconds',
    description: 'AI texts your leads instantly — before a competitor picks up the phone.',
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-emerald-500" />,
    title: 'Sounds Like You, Not a Robot',
    description: 'Personalized SMS that matches your style. Leads won\'t know it\'s AI.',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-emerald-500" />,
    title: 'Qualifies & Scores Leads',
    description: 'Know who\'s ready to buy before you spend a minute on the phone.',
  },
  {
    icon: <Clock className="w-6 h-6 text-emerald-500" />,
    title: 'Books Appointments Automatically',
    description: 'Cal.com integration books meetings directly into your calendar.',
  },
  {
    icon: <Phone className="w-6 h-6 text-emerald-500" />,
    title: 'Works With Follow Up Boss',
    description: 'Plugs into your existing FUB workflow — no workflow disruption.',
  },
  {
    icon: <Star className="w-6 h-6 text-emerald-500" />,
    title: 'Full Analytics Dashboard',
    description: 'Track every lead, every response, every conversion in real time.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'I used to lose leads because I was showing a house. Now LeadFlow texts them back in seconds. My conversion rate is up 35%.',
    author: 'Sarah M.',
    role: 'RE/MAX Agent, Toronto',
  },
  {
    quote: 'Set it up in 10 minutes. The AI handles my after-hours leads while I sleep. Best $149/month I\'ve ever spent.',
    author: 'James K.',
    role: 'Keller Williams, Atlanta',
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      window.location.href = `/onboarding?email=${encodeURIComponent(email)}`
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold text-slate-900">LeadFlow AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">Pricing</a>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">Sign In</Link>
            <Link
              href="/onboarding"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
          <Link
            href="/onboarding"
            className="md:hidden px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-300 text-sm font-medium">AI responds to leads in under 30 seconds</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Never Lose Another Lead to{' '}
            <span className="text-emerald-400">Slow Response Time</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            LeadFlow AI automatically texts your leads the moment they come in — 24/7, in your voice — while you focus on closing deals.
          </p>
          <form onSubmit={handleSignupSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <p className="text-slate-400 text-sm">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-emerald-500 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-emerald-100 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Agitation */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              35% of Real Estate Leads Never Get a Response
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              You&apos;re too busy showing homes, attending closings, and running your business. Leads don&apos;t wait — they move on to the next agent in 5 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: '😤', title: 'Missing calls during showings', desc: 'You\'re with a client. A hot lead texts. You see it 3 hours later. They\'ve already signed with someone else.' },
              { emoji: '😴', title: 'After-hours leads go cold', desc: '60% of online leads come in after 6pm. Without instant response, they\'re gone by morning.' },
              { emoji: '🔁', title: 'Manual follow-up takes hours', desc: 'Texting 50 leads, tracking responses, scheduling follow-ups — it\'s a full-time job on top of your job.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              AI That Works While You Work
            </h2>
            <p className="text-xl text-slate-600">Everything you need to turn leads into appointments — automatically.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3">{feature.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Real Agents, Real Results</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">&quot;{t.quote}&quot;</p>
                <div>
                  <div className="font-semibold text-slate-900">{t.author}</div>
                  <div className="text-slate-500 text-sm">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">Start free. Cancel anytime. No long-term contracts.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 ${
                  plan.highlighted
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-block bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-slate-500 mb-1">/month</span>
                </div>
                <p className="text-slate-600 text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/onboarding?plan=${plan.tier}`}
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-slate-900 to-emerald-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Responding to Every Lead in 30 Seconds
          </h2>
          <p className="text-slate-300 text-xl mb-8">
            Join real estate agents who never miss a lead — no matter how busy they are.
          </p>
          <form onSubmit={handleSignupSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <p className="text-emerald-300 text-sm">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <span className="text-white font-bold">LeadFlow AI</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/onboarding" className="hover:text-white transition-colors">Get Started</Link>
            <a href="mailto:support@leadflow.ai" className="hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
