'use client'

/*
TASK SPEC (61d47e0b-b81c-4c12-9c85-03945a31ee98)
What:
- Change file: product/lead-response/dashboard/app/page.tsx
- Function: HomePage()
- Update stale feature copy that claims an outdated Claude model name to model-agnostic text aligned with AI_MODEL-driven runtime behavior.
- Change file: product/lead-response/dashboard/lib/ai.ts
- Functions/constants: getModelClient(), qualifyLead(), Anthropic fallback constant usage
- Upgrade Anthropic fallback model from "claude-3-haiku-20240307" to "claude-haiku-4-5" and remove stale Sonnet reference in qualification docstring.

Verify:
- Run: rg -n "Claude 3\\.5 Sonnet" product/lead-response/dashboard/app/
- Expect: no matches.
- Run: npm run lint
- Run: npm test
- Run: npm run build
- Run: npm audit --audit-level=high
- Run: cd product/lead-response/dashboard && npx next build
- Expect all commands exit 0.

Boundaries:
- Do not change routes/services outside product/lead-response/dashboard/lib/ai.ts.
- Do not alter pricing/content unrelated to the AI model copy claim.
- Do not modify database schema, migrations, or non-dashboard modules.
*/

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import TrialSignupForm from '@/components/trial-signup-form'
import { trackCTAClick, attachScrollMilestoneObservers } from '@/lib/analytics/ga4'

export default function HomePage() {
  const [pricingPeriod, setPricingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null)

  // Scroll-depth milestone refs (FR-3 / US-2)
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

  useEffect(() => {
    void fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'landing_page_viewed',
        properties: { page: 'home' },
      }),
    }).catch(() => {
      // Non-blocking analytics.
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      {/* Urgency Banner — pilot scarcity trigger */}
      <div
        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-center py-2.5 px-4 text-sm font-medium"
        data-testid="urgency-banner"
      >
        🎯 <span className="font-semibold">Limited Pilot Spots:</span> Only 10 spots remaining. Join today to lock in 20% lifetime pricing.{' '}
        <Link href="/pilot" className="underline underline-offset-2 font-semibold hover:text-emerald-100">
          Apply Now →
        </Link>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" data-testid="nav">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LeadFlow AI</h1>
          <nav className="flex items-center gap-4">
            <a
              href="#features"
              data-testid="nav-features"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              data-testid="nav-how-it-works"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              data-testid="nav-pricing"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              data-testid="nav-faq"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              FAQ
            </a>
            {/* CTA: join_pilot_nav (FR-2) */}
            <Link
              href="/pilot"
              onClick={() => trackCTAClick('join_pilot_nav', 'Pilot Program', 'navigation')}
              data-cta-id="join_pilot_nav"
              className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Pilot Program
            </Link>
            {/* CTA: sign_in_nav (FR-2) */}
            <Link
              href="/login"
              onClick={() => trackCTAClick('sign_in_nav', 'Sign In', 'navigation')}
              data-cta-id="sign_in_nav"
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              data-testid="nav-cta"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — CTA Placement #1 */}
      <section ref={ref25} id="hero" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" data-testid="hero-section">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered Lead Response in Under 30 Seconds
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              Instantly qualify and respond to real estate leads using AI.
              Never miss another opportunity. Start your 14-day free trial — no credit card required.
            </p>

            {/* Hero Trial CTA */}
            <Suspense fallback={<div className="h-24" />}>
              <TrialSignupForm compact />
            </Suspense>

            {/* Trust bar */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-400" data-testid="hero-trust-bar">
              <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> 14-day free trial</span>
              <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> No credit card</span>
              <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Cancel anytime</span>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              {/* CTA: see_how_it_works (FR-2) */}
              <a
                href="#features"
                onClick={() => trackCTAClick('see_how_it_works', 'See how it works', 'hero')}
                data-cta-id="see_how_it_works"
                data-testid="hero-cta-secondary"
                className="text-slate-400 hover:text-white underline underline-offset-4"
              >
                See how it works ↓
              </a>
              <span className="text-slate-600">|</span>
              <Link href="/demo" className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4">
                Try Live AI Demo →
              </Link>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12" data-testid="problem-section">
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

      {/* Stats Bar — FR-2 */}
      <section id="stats" className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700" data-testid="stats-bar">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">&lt;30s</div>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Average Response Time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">78%</div>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Deals Go to First Responder</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">35%</div>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Leads Never Get a Response</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">24/7</div>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Always On</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={ref50} id="features" className="container mx-auto px-4 py-20" data-testid="features-section">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
          Everything You Need to Convert More Leads
        </h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          LeadFlow AI handles the hard work so you can focus on closing deals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="AI Qualification"
            description="Your configured AI model analyzes leads to extract intent, budget, timeline, and property preferences."
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
        <div className="mt-16 text-center" data-testid="features-cta">
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to Respond Faster?
          </h4>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Join agents converting more leads with a 14-day free trial — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* CTA: start_trial_features */}
            <Link
              href="/signup/trial"
              onClick={() => trackCTAClick('start_trial_features', 'Start Free Trial — No Credit Card', 'features')}
              data-cta-id="start_trial_features"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
            >
              Start Free Trial — No Credit Card
            </Link>
            <Link
              href="/pilot"
              className="px-8 py-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              Apply for Pilot Program →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white dark:bg-slate-900 py-20" data-testid="how-it-works-section">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            How It Works
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            LeadFlow AI responds to leads in three simple steps.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <HowItWorksStep
              step={1}
              icon="🔗"
              title="Connect Your CRM"
              description="Link your Follow Up Boss account in under 5 minutes. Your existing leads and contacts sync automatically."
              testId="how-it-works-step-1"
            />
            <HowItWorksStep
              step={2}
              icon="⚡"
              title="AI Responds Instantly"
              description="The moment a lead comes in, LeadFlow AI sends a personalized SMS response in <30 seconds — 24/7, even during showings."
              testId="how-it-works-step-2"
            />
            <HowItWorksStep
              step={3}
              icon="🏆"
              title="You Close the Deals"
              description="Qualified leads get booked on your calendar automatically. You show up to the meeting — the AI did the work."
              testId="how-it-works-step-3"
            />
          </div>
        </div>
      </section>

      {/* Social Proof — Pilot Program Outcomes */}
      <section id="testimonials" data-testid="testimonials" className="bg-slate-50 dark:bg-slate-950 py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            What Early Agents Experience
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Outcomes from our pilot program — real estate agents who integrated LeadFlow AI into their workflow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <OutcomeCard
              icon="⚡"
              stat="&lt;30s"
              label="Response Time"
              detail="Leads receive a personalized SMS within 30 seconds — day or night, during showings or on weekends."
            />
            <OutcomeCard
              icon="📅"
              stat="3x"
              label="More Appointments Booked"
              detail="Pilot agents report booking significantly more appointments per week by never missing an inbound lead."
            />
            <OutcomeCard
              icon="🏆"
              stat="24/7"
              label="Always-On Coverage"
              detail="Every lead gets an instant response regardless of time of day — no lead goes cold while you sleep."
            />
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
            Results from our pilot program. Individual outcomes vary based on lead volume and market conditions.
          </p>

          <div className="mt-8 text-center">
            {/* CTA: get_started_testimonial */}
            <Link
              href="/signup/trial"
              onClick={() => trackCTAClick('get_started_testimonial', 'Get Started', 'testimonials')}
              data-cta-id="get_started_testimonial"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors inline-block"
            >
              Get Started Today →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing — CTA Placement #3 */}
      <section ref={ref75} id="pricing" className="bg-white dark:bg-slate-900 py-20" data-testid="pricing-section">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            Simple, Transparent Pricing
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Start with a free 14-day trial. No credit card required. Upgrade when you&apos;re ready.
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12" data-testid="pricing-annual-toggle">
            <span className={`text-sm font-medium ${pricingPeriod === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setPricingPeriod(pricingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-300 dark:bg-slate-700 transition-colors"
              aria-label="Toggle annual pricing"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  pricingPeriod === 'annual' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${pricingPeriod === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              Annual {pricingPeriod === 'annual' && <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">Save 2 months</span>}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <PricingCard
              name="Starter"
              price={pricingPeriod === 'monthly' ? '$49' : '$490'}
              period={pricingPeriod === 'monthly' ? '/month' : '/year'}
              description="Perfect for solo agents"
              features={[
                '100 SMS/month',
                'Basic AI qualification',
                'Dashboard access',
                'Calendar integration',
                'Email support'
              ]}
              testId="pricing-starter-cta"
            />
            <PricingCard
              name="Pro"
              price={pricingPeriod === 'monthly' ? '$149' : '$1490'}
              period={pricingPeriod === 'monthly' ? '/month' : '/year'}
              description="For growing agents"
              popular
              features={[
                'Unlimited SMS',
                'Full AI qualification',
                'Advanced analytics',
                'Cal.com booking',
                'Priority support',
                'Custom templates'
              ]}
              testId="pricing-pro-cta"
            />
            <PricingCard
              name="Team"
              price={pricingPeriod === 'monthly' ? '$399' : '$3990'}
              period={pricingPeriod === 'monthly' ? '/month' : '/year'}
              description="For small teams (2-5 agents)"
              features={[
                '5 agent seats',
                'Unlimited SMS',
                'Team dashboard',
                'Lead routing',
                'Custom workflows',
                'Dedicated support'
              ]}
              testId="pricing-team-cta"
            />
            <PricingCard
              name="Brokerage"
              price={pricingPeriod === 'monthly' ? '$999+' : '$9990+'}
              period={pricingPeriod === 'monthly' ? '/month' : '/year'}
              description="For large brokerages (20+ agents)"
              features={[
                'Unlimited agents',
                'Unlimited SMS',
                'White-label options',
                'Admin dashboard',
                'SLA guarantees',
                'Custom integrations'
              ]}
              cta="Contact Sales"
              testId="pricing-brokerage-cta"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-white dark:bg-slate-900 py-20" data-testid="faq-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
            Frequently Asked Questions
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-12">
            Got questions? We&apos;ve got answers.
          </p>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                index={index + 1}
                question={item.question}
                answer={item.answer}
                isOpen={openFaqItem === index + 1}
                onToggle={() => setOpenFaqItem(openFaqItem === index + 1 ? null : index + 1)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="final-cta" className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-20" data-testid="final-cta-section">
        <div className="container mx-auto px-4 text-center max-w-2xl mx-auto">
          <h3 className="text-4xl font-bold mb-4">
            Stop Losing Leads to Agents Who Respond Faster
          </h3>
          <p className="text-lg text-emerald-50 mb-8">
            Join LeadFlow AI and respond to every lead in under 30 seconds — automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup/trial"
              onClick={() => trackCTAClick('final_cta_primary', 'Start My Free Trial', 'final')}
              data-cta-id="final_cta_primary"
              data-testid="final-cta-primary"
              className="px-8 py-4 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Start My Free Trial →
            </Link>
            <a
              href="mailto:support@leadflow.ai"
              className="text-white hover:text-emerald-50 font-medium underline underline-offset-4"
            >
              Have questions? Talk to us.
            </a>
          </div>
          <p className="text-sm text-emerald-50 mt-8">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">Sign In</Link>
            <Link href="/pilot" className="hover:text-slate-900 dark:hover:text-white">Pilot Program</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const faqItems = [
  {
    question: "How does LeadFlow AI respond to leads?",
    answer: "It monitors your FUB inbox. When a new lead arrives, AI generates a personalized SMS using their name, property of interest, and inquiry context. Sent in <30 seconds.",
  },
  {
    question: "Do I need to sign a long-term contract?",
    answer: "No. All plans are month-to-month. Cancel anytime from your dashboard.",
  },
  {
    question: "Does the AI sound like a robot?",
    answer: "No. The AI is trained to sound like a professional agent — warm, helpful, and specific to the lead's inquiry. You can customize the tone and templates.",
  },
  {
    question: "How does it integrate with Follow Up Boss?",
    answer: "Via OAuth. Connect in <5 minutes. New leads automatically trigger AI responses. No FUB changes required.",
  },
  {
    question: "Is SMS messaging compliant (A2P 10DLC)?",
    answer: "Yes. LeadFlow is registered for A2P 10DLC compliance. All SMS is opt-in and includes compliant opt-out language.",
  },
  {
    question: "How long does setup take?",
    answer: "Most agents are live in under 15 minutes. Connect FUB, verify your phone, and the AI starts responding.",
  },
  {
    question: "What happens if I want to respond myself?",
    answer: "You can take over any conversation at any time from the dashboard. The AI pauses on that lead the moment you respond.",
  },
]

function OutcomeCard({ stat, label, detail, icon }: { stat: string; label: string; detail: string; icon: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{stat}</div>
      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{label}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  )
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col">
      <div className="text-emerald-500 text-3xl leading-none mb-4">&ldquo;</div>
      <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed flex-1">{quote}</p>
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
        <p className="font-semibold text-slate-900 dark:text-white text-sm">{name}</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{role}</p>
      </div>
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

function HowItWorksStep({ step, icon, title, description, testId }: { step: number; icon?: string; title: string; description: string; testId?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center" data-testid={testId}>
      {icon ? (
        <div className="text-4xl mb-4">{icon}</div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
          {step}
        </div>
      )}
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{title}</h4>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  )
}

function FAQItem({ index, question, answer, isOpen, onToggle }: { index: number; question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg" data-testid={`faq-item-${index}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left font-medium text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span>{question}</span>
        <span className="text-emerald-500 text-xl transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div id={`faq-answer-${index}`} className="px-6 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700">
          {answer}
        </div>
      )}
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
  cta = 'Start 14-Day Free Trial',
  testId
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  cta?: string
  testId?: string
}) {
  const isBrokerage = name === 'Brokerage'
  const planSlug = name.toLowerCase()

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
        href={isBrokerage ? 'mailto:sales@leadflow.ai' : `/signup/trial?plan=${planSlug}`}
        onClick={() => trackCTAClick(`pricing_${planSlug}`, `${cta} ${name}`, 'pricing')}
        data-cta-id={`pricing_${planSlug}`}
        data-testid={testId}
        className={`mt-6 w-full block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
          popular
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}
