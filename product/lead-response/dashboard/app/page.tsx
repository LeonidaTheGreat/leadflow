'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackEvent, trackCTAClick, trackFormEvent, attachScrollMilestoneObservers } from '@/lib/analytics/ga4'

interface FormData {
  name: string
  email: string
  phone: string
  brokerage_name: string
  team_name: string
  monthly_leads: string
  current_crm: string
}

interface FormErrors {
  name?: string
  email?: string
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-teal-600">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="bg-gray-50 p-8 rounded-lg border-l-4 border-teal-600">
      <p className="text-gray-600 italic mb-4 leading-relaxed text-sm">&ldquo;{quote}&rdquo;</p>
      <div className="font-semibold text-slate-800 text-sm">— {author}</div>
      <div className="text-gray-500 text-xs mt-1">{role}</div>
    </div>
  )
}

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
      <button onClick={onClick} className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-slate-800 text-base">{question}</span>
        <span className={`text-teal-600 text-xl font-bold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-6 pb-5 bg-gray-50"><p className="text-gray-600 text-sm leading-relaxed pt-4">{answer}</p></div>
      </div>
    </div>
  )
}

function PilotModal({ isOpen, onClose, utmParams }: { isOpen: boolean; onClose: () => void; utmParams: Record<string, string> }) {
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', brokerage_name: '', team_name: '', monthly_leads: '', current_crm: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => document.getElementById('pilotName')?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name || formData.name.trim().length < 2) newErrors.name = 'Please enter your name'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email || !emailRegex.test(formData.email)) newErrors.email = 'Please enter a valid email'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'landing_page', ...utmParams })
      })
      const result = await response.json()
      if (response.ok && result.success) {
        trackFormEvent('pilot_signup_complete', { source: 'landing_page' })
        setIsSuccess(true)
      } else {
        alert(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      alert('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) onClose()
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', brokerage_name: '', team_name: '', monthly_leads: '', current_crm: '' })
    setErrors({})
    setIsSuccess(false)
  }

  const handleClose = () => { resetForm(); onClose() }

  if (!isOpen) return null

  return (
    <div ref={modalRef} onClick={handleOverlayClick} className="fixed inset-0 bg-slate-900/85 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-6 py-8 text-center relative">
          <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors" aria-label="Close">×</button>
          <h2 className="text-2xl font-bold mb-2">Join the Pilot Program</h2>
          <p className="text-sm opacity-90">Free for 30 days • 20% lifetime discount • Limited spots</p>
        </div>
        <div className="p-6">
          {!isSuccess ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Name <span className="text-teal-600">*</span></label>
                  <input type="text" id="pilotName" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors ${errors.name ? 'border-red-500' : 'border-gray-200'}`} placeholder="Your full name" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Email <span className="text-teal-600">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors ${errors.email ? 'border-red-500' : 'border-gray-200'}`} placeholder="you@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">Phone (optional)</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors" placeholder="(555) 123-4567" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Brokerage Name</label>
                  <input type="text" value={formData.brokerage_name} onChange={(e) => setFormData({ ...formData, brokerage_name: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors" placeholder="e.g., Keller Williams" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Team Name</label>
                  <input type="text" value={formData.team_name} onChange={(e) => setFormData({ ...formData, team_name: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors" placeholder="e.g., The Smith Team" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Monthly Leads</label>
                  <select value={formData.monthly_leads} onChange={(e) => setFormData({ ...formData, monthly_leads: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors bg-white">
                    <option value="">Select range...</option>
                    <option value="1-10">1-10 leads</option>
                    <option value="11-50">11-50 leads</option>
                    <option value="51-100">51-100 leads</option>
                    <option value="100+">100+ leads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Current CRM</label>
                  <select value={formData.current_crm} onChange={(e) => setFormData({ ...formData, current_crm: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-600 transition-colors bg-white">
                    <option value="">Select CRM...</option>
                    <option value="follow_up_boss">Follow Up Boss</option>
                    <option value="liondesk">LionDesk</option>
                    <option value="kvcore">kvCORE</option>
                    <option value="other">Other</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70">
                {isSubmitting ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Submitting...</span></>) : (<span>Join the Pilot Program</span>)}
              </button>
              <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">By signing up, you agree to our <Link href="#" className="text-teal-600 hover:underline">Terms of Service</Link> and <Link href="#" className="text-teal-600 hover:underline">Privacy Policy</Link>.</p>
            </form>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">You&apos;re on the list!</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">Thank you for signing up. We&apos;ll reach out within 24 hours.</p>
              <button onClick={handleClose} className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors">Got it!</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [utmParams, setUtmParams] = useState<Record<string, string>>({})
  const firedScrollDepths = useRef<Set<number>>(new Set())

  // Capture & persist UTM params on mount
  useEffect(() => {
    // UTM params initialization
    setUtmParams({})
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll-depth tracking (25 / 50 / 75 / 90)
  useEffect(() => {
    attachScrollMilestoneObservers()
  }, [])

  const openModal = (location: string) => {
    trackCTAClick('join_pilot_' + location, 'Join Pilot', location)
    setIsModalOpen(true)
  }

  const faqs = [
    { question: 'Will this sound like a robot?', answer: 'No. LeadFlow AI is trained specifically on real estate conversations. It uses natural language and adapts based on lead responses. Most leads don\'t realize they\'re talking to AI.' },
    { question: 'What if a lead asks something the AI can\'t answer?', answer: 'The AI handles 90%+ of common real estate questions. For complex questions, it escalates to you immediately with a summary.' },
    { question: 'Is this TCPA compliant?', answer: 'Yes. Built-in TCPA protections: automatic opt-out handling, consent tracking, quiet hours, and message logging.' },
    { question: 'Do I need to be technical?', answer: 'Not at all. Setup takes about 5 minutes—just connect your FUB account and Cal.com calendar.' },
    { question: 'What happens after the pilot?', answer: 'You choose: continue at $49/month (or $39/month with pilot discount), or cancel with no penalties.' },
    { question: 'Can I customize responses?', answer: 'During the pilot, we use proven templates. Post-pilot, you\'ll customize tone and add your own questions.' },
    { question: 'What CRMs do you support?', answer: 'Currently Follow Up Boss. We\'re expanding based on pilot agent feedback.' }
  ]

  const features = [
    { icon: '⚡', title: 'Instant Response (< 30 seconds)', description: 'Every lead gets an immediate text, even at 2 AM.' },
    { icon: '🤖', title: 'Natural AI Conversations', description: 'Trained on thousands of real estate conversations.' },
    { icon: '📱', title: 'SMS-First', description: '94% of texts are read within 3 minutes.' },
    { icon: '📅', title: 'Auto Booking', description: 'Qualified leads book directly on your calendar.' },
    { icon: '📊', title: 'Full Dashboard', description: 'See every conversation and conversion metric.' },
    { icon: '🔒', title: 'TCPA Compliant', description: 'Built-in compliance, opt-out, and consent tracking.' }
  ]

  const testimonials = [
    { quote: 'I used to lose 2-3 leads a week. Since using LeadFlow AI, every lead gets an immediate response. I\'ve already booked 4 appointments.', author: 'Sarah M.', role: 'Independent Agent, Austin TX' },
    { quote: 'My team was drowning in leads. LeadFlow AI qualifies them before they hit our CRM. We\'re only talking to serious buyers.', author: 'Marcus T.', role: 'Team Lead, Phoenix AZ' },
    { quote: 'I was skeptical about AI sounding robotic, but my leads can\'t tell. Conversations feel natural and I\'m booking while with other clients.', author: 'Jennifer L.', role: 'Agent, Miami FL' }
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-center py-3 px-4 text-sm font-semibold">🎯 Limited Pilot Spots: Only 10 remaining. Join today to lock in 20% lifetime pricing.</div>
      <nav className={`sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><span>🚀</span> LeadFlow AI</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-slate-600 hover:text-slate-900 font-medium">Sign In</Link>
            <button onClick={() => openModal('nav')} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md text-sm">Join Pilot</button>
          </div>
        </div>
      </nav>
      <section className="relative bg-gradient-to-br from-slate-800 to-slate-700 text-white py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
        <div className="absolute -top-1/2 -right-10 w-[500px] h-[500px] bg-white/5 rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">Never Lose Another Lead to Slow Response</h1>
          <p className="text-lg sm:text-xl mb-10 opacity-95">LeadFlow AI responds in under 30 seconds—while you&apos;re showing houses or asleep. Qualifies prospects via SMS and books appointments automatically, 24/7.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button onClick={() => openModal('hero')} className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md">Join the Pilot Program (Free for 30 Days)</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white text-slate-800 border-2 border-white hover:bg-transparent hover:text-white font-semibold rounded-md">See How It Works</button>
          </div>
          <div className="text-sm opacity-85 flex flex-wrap justify-center gap-x-6"><span>✓ No setup fees</span><span>✓ Works with Follow Up Boss</span><span>✓ Cancel anytime</span></div>
        </div>
      </section>
      
      {/* Stats Bar - PRD FR-2 Specification */}
      <section className="bg-gray-50 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold text-teal-600">&lt;30s</div>
            <h4 className="text-sm font-semibold text-slate-800">Response Time</h4>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold text-teal-600">78%</div>
            <h4 className="text-sm font-semibold text-slate-800">Deals to First Responder</h4>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold text-teal-600">35%</div>
            <h4 className="text-sm font-semibold text-slate-800">Leads Never Responded To</h4>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold text-teal-600">24/7</div>
            <h4 className="text-sm font-semibold text-slate-800">Always On</h4>
          </div>
        </div>
      </section>
      
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-12">You&apos;re Losing 50% of Your Leads Before You Even See Them</h2>
          <p className="text-lg text-gray-600 text-center mb-10 font-medium">Real estate leads go cold in 5 minutes.<strong className="block mt-4 text-slate-800 text-xl">Sound familiar?</strong></p>
          <ul className="space-y-4 mb-10">
            {['You miss calls while with clients and lose leads', 'Your voicemail fills up during back-to-back showings', 'Leads come at 10 PM, you see them at morning', 'You\'re paying for leads but half never hear back', 'Competitors respond faster—and win the business'].map((item, i) => (
              <li key={i} className="flex items-start gap-3 py-3 border-b border-gray-200 text-slate-800"><span className="text-red-500 font-bold text-xl flex-shrink-0">✕</span><span>{item}</span></li>
            ))}
          </ul>
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-l-4 border-teal-600 p-6 rounded-r-lg font-semibold text-slate-800 text-lg">💰 Every missed lead is thousands in commission.</div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-6">AI That Responds Like You Would—Only Faster</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-14">LeadFlow AI is your 24/7 lead response assistant. Sends SMS in 30 seconds, qualifies prospects, and books appointments on your calendar.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => <FeatureCard key={i} {...feature} />)}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-14">Agents Are Converting More Leads with AI Response</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => <TestimonialCard key={i} {...testimonial} />)}
          </div>
        </div>
      </section>
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-14">Set It Up in 5 Minutes. Let AI Handle the Rest.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-600 to-transparent -z-0" />
            {[{ num: '1', title: 'Connect Your Lead Sources', desc: 'Link LeadFlow AI to Follow Up Boss. New leads flow in automatically.' }, { num: '2', title: 'AI Responds & Qualifies', desc: 'AI sends SMS intro, qualifies budget/timeline/location naturally.' }, { num: '3', title: 'You Close the Deal', desc: 'Qualified leads book on your calendar. You step in when they\'re ready.' }].map((step, i) => (
              <div key={i} className="relative z-10">
                <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">{step.num}</div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">Choose the plan that fits your business. All plans include a 30-day free trial.</p>

          {/* Pilot CTA Banner */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-lg p-6 mb-12 text-center text-white">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-left">
                <div className="font-bold text-lg">🎯 Limited Pilot Program</div>
                <div className="text-sm opacity-90">Join now for 30 days free + 20% lifetime discount</div>
              </div>
              <button onClick={() => openModal('pricing_pilot_banner')} className="px-6 py-3 bg-white text-teal-600 font-semibold rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap">
                Join Pilot Program
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter Tier */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">Starter</h3>
                <p className="text-sm text-gray-500">For solo agents testing the waters</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$49</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>100 SMS/month</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Basic AI responses</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Follow Up Boss integration</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Dashboard & analytics</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>TCPA compliance</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Email support</li>
              </ul>
              <button onClick={() => openModal("pricing_starter")} className="w-full py-3 border-2 border-teal-600 text-teal-600 font-semibold rounded-md hover:bg-teal-50 transition-colors">
                Get Started
              </button>
            </div>

            {/* Pro Tier - Most Popular */}
            <div className="bg-white border-2 border-teal-600 rounded-lg p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              </div>
              <div className="mb-4 pt-2">
                <h3 className="text-lg font-bold text-slate-800">Pro</h3>
                <p className="text-sm text-gray-500">For serious solo agents</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$149</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Unlimited SMS</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Full AI conversations</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Cal.com booking integration</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Advanced analytics</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Priority support</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Custom AI tone</li>
              </ul>
              <button onClick={() => openModal("pricing_pro")} className="w-full py-3 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors">
                Get Started
              </button>
            </div>

            {/* Team Tier */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">Team</h3>
                <p className="text-sm text-gray-500">For small teams (up to 5 agents)</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$399</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Everything in Pro</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>5 agent seats included</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Team dashboard</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Lead routing & assignment</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Performance reporting</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Dedicated account manager</li>
              </ul>
              <button onClick={() => openModal("pricing_team")} className="w-full py-3 border-2 border-teal-600 text-teal-600 font-semibold rounded-md hover:bg-teal-50 transition-colors">
                Get Started
              </button>
            </div>

            {/* Brokerage Tier */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">Brokerage</h3>
                <p className="text-sm text-gray-500">For brokerages & large teams</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$999+</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Everything in Team</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>20+ agent seats</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>White-label option</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Admin dashboard</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Compliance reporting</li>
                <li className="flex gap-2"><span className="text-teal-600 font-bold">✓</span>Custom integrations</li>
              </ul>
              <button onClick={() => openModal("pricing_brokerage")} className="w-full py-3 border-2 border-teal-600 text-teal-600 font-semibold rounded-md hover:bg-teal-50 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">All plans include 30-day free trial. No credit card required to start.</p>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center mb-10">Frequently Asked Questions</h2>
          <div>
            {faqs.map((faq, i) => <FAQItem key={i} question={faq.question} answer={faq.answer} isOpen={openFAQ === i} onClick={() => setOpenFAQ(openFAQ === i ? null : i)} />)}
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-br from-slate-800 to-slate-700 text-white py-20 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Stop Losing Leads. Start Converting More.</h2>
          <p className="text-lg mb-10 opacity-95">Join agents already using LeadFlow AI to respond faster and book more appointments.</p>
          <button onClick={() => openModal("bottom_cta")} className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md">Join the Pilot Program - Free for 30 Days</button>
          <p className="mt-6 text-sm opacity-85">No credit card required. Cancel anytime.</p>
        </div>
      </section>
      <footer className="bg-slate-800 text-white py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-8">
          <div><h4 className="font-bold mb-3">Product</h4><ul className="space-y-1 opacity-75"><li><a href="#how-it-works" className="hover:opacity-100">How It Works</a></li><li><a href="#pricing" className="hover:opacity-100">Pricing</a></li></ul></div>
          <div><h4 className="font-bold mb-3">Company</h4><ul className="space-y-1 opacity-75"><li><a href="#" className="hover:opacity-100">About</a></li><li><a href="#" className="hover:opacity-100">Contact</a></li></ul></div>
          <div><h4 className="font-bold mb-3">Legal</h4><ul className="space-y-1 opacity-75"><li><a href="#" className="hover:opacity-100">Privacy</a></li><li><a href="#" className="hover:opacity-100">Terms</a></li></ul></div>
          <div><h4 className="font-bold mb-3">Resources</h4><ul className="space-y-1 opacity-75"><li><a href="#" className="hover:opacity-100">Docs</a></li><li><a href="#" className="hover:opacity-100">Support</a></li></ul></div>
        </div>
        <div className="border-t border-slate-700 pt-8 text-center text-xs opacity-60">
          <p className="mb-3"><strong>TCPA Compliance:</strong> LeadFlow AI includes TCPA protections. All messages include opt-out instructions. We honor STOP requests automatically.</p>
          <p>© 2026 LeadFlow AI. All rights reserved.</p>
        </div>
      </footer>
      <PilotModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} utmParams={utmParams} />
    </div>
  )
}
