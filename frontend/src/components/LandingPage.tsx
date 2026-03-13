import * as React from 'react'
import { useLandingPageABTest } from '@/hooks/useABTest'
import { useEventTracking } from '@/hooks/useEventTracking'
import { PostHogEvents } from '@/lib/analytics-events'
import { ArrowRight, CheckCircle, Zap, Clock, Shield, HeartPulse, Link2, MessageSquare, Trophy } from 'lucide-react'

interface LandingPageProps {
  onGetStarted?: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const { variant, variantKey, isLoading, trackVariantEvent } = useLandingPageABTest()
  const { track, trackLead, trackConversion, trackPageView, trackFeature } = useEventTracking({
    context: 'landing_page',
    defaultProperties: { variant: variantKey }
  })
  const [email, setEmail] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [pilotSpotsRemaining] = React.useState(3) // Update dynamically from API

  // Track page view on mount
  React.useEffect(() => {
    if (!isLoading) {
      trackPageView({
        url: window.location.href,
        referrer: document.referrer,
        variant: variantKey
      })
      trackVariantEvent('landing_page_viewed', {
        url: window.location.href,
        referrer: document.referrer
      })
    }
  }, [isLoading, variantKey, trackPageView, trackVariantEvent])

  const handleCTAClick = () => {
    track(PostHogEvents.CTA_CLICKED, { 
      cta_location: 'hero',
      cta_text: variant.ctaText 
    })
    trackVariantEvent('cta_clicked', { 
      cta_location: 'hero',
      cta_text: variant.ctaText 
    })
    
    if (onGetStarted) {
      onGetStarted()
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    
    // Track lead capture with new event tracking
    trackLead({
      email,
      source: 'landing_page',
      variant: variantKey
    })
    
    // Track email capture via A/B test
    trackVariantEvent('email_captured', {
      variant: variantKey,
      email_domain: email.split('@')[1]
    })

    // Save email to session storage for pre-fill in onboarding
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('leadflow_signup_email', email)
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Track conversion with new event tracking
    trackConversion({
      conversion_type: 'lead_capture',
      conversion_value: 0,
      variant: variantKey
    })

    setIsSubmitting(false)
    
    if (onGetStarted) {
      onGetStarted()
    }
  }

  const handleFeatureClick = (featureName: string) => {
    trackFeature({ feature_name: featureName, feature_category: 'landing_page' })
    trackVariantEvent('feature_clicked', { feature_name: featureName })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Scarcity Banner */}
      {pilotSpotsRemaining > 0 && pilotSpotsRemaining <= 5 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 text-center text-sm font-medium">
          ⚡ Limited Pilot Program: Only {pilotSpotsRemaining} spots remaining • Free 30-day trial
        </div>
      )}
      
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">LeadFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#health"
              onClick={() => {
                track(PostHogEvents.NAV_LINK_CLICKED, { link: 'health' })
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <HeartPulse className="h-4 w-4" />
              Health
            </a>
            <button 
              onClick={() => {
                track(PostHogEvents.NAV_LOGIN_CLICKED)
                trackVariantEvent('nav_login_clicked')
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </button>
            <button 
              onClick={handleCTAClick}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container px-4 md:px-6 py-12 lg:py-20">
        <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
          {/* A/B Tested Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
              {variant.headline}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {variant.subheadline}
            </p>
          </div>

          {/* Email Capture Form */}
          <form onSubmit={handleEmailSubmit} className="w-full max-w-md space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <>
                    {variant.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Free 14-day trial. No credit card required.
            </p>
          </form>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-green-500" />
              <span>TCPA Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>&lt; 30sec Response</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Follow Up Boss Certified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 md:px-6 py-12 lg:py-20 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Top Agents Choose LeadFlow</h2>
            <p className="text-muted-foreground">Everything you need to convert leads into clients</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div 
              className="bg-background p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('instant_response')}
            >
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Instant AI Response</h3>
              <p className="text-muted-foreground text-sm">
                Our AI responds to leads within seconds, ensuring you never miss an opportunity while competitors take hours.
              </p>
            </div>

            <div 
              className="bg-background p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('smart_scheduling')}
            >
              <Clock className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground text-sm">
                Integrated with Cal.com to automatically book appointments that fit your calendar. No back-and-forth needed.
              </p>
            </div>

            <div 
              className="bg-background p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('follow_up_boss')}
            >
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Follow Up Boss Sync</h3>
              <p className="text-muted-foreground text-sm">
                Seamlessly integrates with your Follow Up Boss CRM. All lead data stays synchronized automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container px-4 md:px-6 py-12 lg:py-20" data-testid="how-it-works-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in minutes, not hours</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div 
              className="relative bg-background p-6 rounded-lg border hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('how_it_works_step_1')}
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <Link2 className="h-10 w-10 text-primary mb-4 mt-2" />
              <h3 className="font-semibold text-lg mb-2">Connect Your CRM</h3>
              <p className="text-muted-foreground text-sm">
                Link your Follow Up Boss account in under 2 minutes. New leads automatically flow into our system—no manual data entry required.
              </p>
            </div>

            {/* Step 2 */}
            <div 
              className="relative bg-background p-6 rounded-lg border hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('how_it_works_step_2')}
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <MessageSquare className="h-10 w-10 text-primary mb-4 mt-2" />
              <h3 className="font-semibold text-lg mb-2">AI Responds Instantly</h3>
              <p className="text-muted-foreground text-sm">
                When a lead comes in, our AI sends a personalized SMS in under 30 seconds—qualifying their needs and answering common questions.
              </p>
            </div>

            {/* Step 3 */}
            <div 
              className="relative bg-background p-6 rounded-lg border hover:shadow-lg transition-shadow"
              onClick={() => handleFeatureClick('how_it_works_step_3')}
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <Trophy className="h-10 w-10 text-primary mb-4 mt-2" />
              <h3 className="font-semibold text-lg mb-2">You Close the Deal</h3>
              <p className="text-muted-foreground text-sm">
                Qualified leads book appointments directly on your calendar. Hot leads are flagged for immediate follow-up. You step in at the perfect moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container px-4 md:px-6 py-12 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Trusted by Industry Leaders</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <blockquote className="bg-muted p-6 rounded-lg">
              <p className="text-muted-foreground mb-4">
                "LeadFlow helped me increase my conversion rate by 340%. The AI handles all my initial follow-ups perfectly."
              </p>
              <footer className="text-sm font-medium">
                — Sarah M., Top Producer 2024
              </footer>
            </blockquote>
            <blockquote className="bg-muted p-6 rounded-lg">
              <p className="text-muted-foreground mb-4">
                "I was skeptical about AI, but LeadFlow books 15+ appointments per week for me. Game changer."
              </p>
              <footer className="text-sm font-medium">
                — Michael R., Luxury Agent
              </footer>
            </blockquote>
            <blockquote className="bg-muted p-6 rounded-lg">
              <p className="text-muted-foreground mb-4">
                "The Cal.com integration is seamless. My calendar fills itself while I focus on showings."
              </p>
              <footer className="text-sm font-medium">
                — Jennifer L., Team Lead
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 md:px-6 py-12 lg:py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Never Miss a Lead Again?</h2>
          <p className="text-primary-foreground/80 text-lg">
            Join thousands of agents who've transformed their business with AI-powered follow-up.
          </p>
          <button
            onClick={handleCTAClick}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-12 px-8 bg-background text-foreground hover:bg-background/90"
          >
            {variant.ctaText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
          <p className="text-sm text-primary-foreground/60">
            Start your free 14-day trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">LeadFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 LeadFlow. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <button onClick={() => {
                track(PostHogEvents.FOOTER_PRIVACY_CLICKED)
                trackVariantEvent('footer_privacy_clicked')
              }}>Privacy</button>
              <button onClick={() => {
                track(PostHogEvents.FOOTER_TERMS_CLICKED)
                trackVariantEvent('footer_terms_clicked')
              }}>Terms</button>
              <button onClick={() => {
                track(PostHogEvents.FOOTER_SUPPORT_CLICKED)
                trackVariantEvent('footer_support_clicked')
              }}>Support</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
