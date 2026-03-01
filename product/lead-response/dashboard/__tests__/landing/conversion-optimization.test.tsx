import { render, screen, fireEvent } from '@testing-library/react'
import LandingPage from '@/app/page'
import { useAnalytics } from '@/lib/analytics'

// Mock the analytics hook
jest.mock('@/lib/analytics', () => ({
  useAnalytics: jest.fn(),
  PostHogEvents: {
    PAGE_VIEW: 'page_view',
    FUNNEL_SIGNUP_STARTED: 'funnel_signup_started',
    FEATURE_USED: 'feature_used',
  }
}))

describe('LandingPage - Conversion Optimization', () => {
  const mockTrack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAnalytics as jest.Mock).mockReturnValue({ track: mockTrack })
  })

  describe('Hero Section', () => {
    it('renders main headline with value proposition', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Never Lose Another Lead to/i)).toBeInTheDocument()
      expect(screen.getByText(/Slow Response/i)).toBeInTheDocument()
    })

    it('renders subheadline explaining the product', () => {
      render(<LandingPage />)
      expect(screen.getByText(/responds to your inbound leads in under 30 seconds/i)).toBeInTheDocument()
    })

    it('renders primary CTA button', () => {
      render(<LandingPage />)
      const primaryCTA = screen.getByRole('link', { name: /Join the Pilot Program/i })
      expect(primaryCTA).toBeInTheDocument()
    })

    it('renders secondary CTA button', () => {
      render(<LandingPage />)
      const secondaryCTA = screen.getByRole('button', { name: /See How It Works/i })
      expect(secondaryCTA).toBeInTheDocument()
    })

    it('tracks page view on mount', () => {
      render(<LandingPage />)
      expect(mockTrack).toHaveBeenCalledWith('page_view', {
        page_type: 'landing',
        page_name: 'home',
      })
    })

    it('tracks primary CTA click', () => {
      render(<LandingPage />)
      const primaryCTA = screen.getByRole('link', { name: /Join the Pilot Program/i })
      fireEvent.click(primaryCTA)
      expect(mockTrack).toHaveBeenCalledWith('funnel_signup_started', expect.any(Object))
    })
  })

  describe('Trust Signals', () => {
    it('displays TCPA compliance badge', () => {
      render(<LandingPage />)
      expect(screen.getByText(/TCPA Compliant/i)).toBeInTheDocument()
    })

    it('displays response time guarantee', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Responds in < 30 seconds/i)).toBeInTheDocument()
    })

    it('displays free trial information', () => {
      render(<LandingPage />)
      expect(screen.getByText(/30-day free pilot/i)).toBeInTheDocument()
    })

    it('shows no setup fees text', () => {
      render(<LandingPage />)
      expect(screen.getByText(/No setup fees/i)).toBeInTheDocument()
    })

    it('shows cancel anytime text', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Cancel anytime/i)).toBeInTheDocument()
    })
  })

  describe('Problem Statement Section', () => {
    it('renders problem headline with statistic', () => {
      render(<LandingPage />)
      expect(screen.getByText(/You.re Losing 50% of Your Leads/i)).toBeInTheDocument()
    })

    it('lists pain points', () => {
      render(<LandingPage />)
      expect(screen.getByText(/You miss calls while with clients/i)).toBeInTheDocument()
      expect(screen.getByText(/Your voicemail box fills up/i)).toBeInTheDocument()
      expect(screen.getByText(/Leads come in at 10 PM/i)).toBeInTheDocument()
    })
  })

  describe('Solution Features Section', () => {
    it('renders all 6 feature cards', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Instant Response/i)).toBeInTheDocument()
      expect(screen.getByText(/Natural AI Conversations/i)).toBeInTheDocument()
      expect(screen.getByText(/SMS-First/i)).toBeInTheDocument()
      expect(screen.getByText(/Automatic Appointment Booking/i)).toBeInTheDocument()
      expect(screen.getByText(/Full Visibility Dashboard/i)).toBeInTheDocument()
      expect(screen.getByText(/TCPA-Compliant by Design/i)).toBeInTheDocument()
    })

    it('renders feature descriptions', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Every lead gets an immediate text, even at 2 AM/i)).toBeInTheDocument()
      expect(screen.getByText(/94% of text messages are read within 3 minutes/i)).toBeInTheDocument()
    })
  })

  describe('Social Proof Section', () => {
    it('renders stats section', () => {
      render(<LandingPage />)
      expect(screen.getByText(/21x/i)).toBeInTheDocument()
      expect(screen.getByText(/40%/i)).toBeInTheDocument()
      expect(screen.getByText(/24\/7/i)).toBeInTheDocument()
    })

    it('renders testimonial cards', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Sarah M./i)).toBeInTheDocument()
      expect(screen.getByText(/Marcus T./i)).toBeInTheDocument()
      expect(screen.getByText(/Jennifer L./i)).toBeInTheDocument()
    })

    it('renders trusted by logos section', () => {
      render(<LandingPage />)
      expect(screen.getByText(/eXp Realty/i)).toBeInTheDocument()
      expect(screen.getByText(/Keller Williams/i)).toBeInTheDocument()
      expect(screen.getByText(/RE\/MAX/i)).toBeInTheDocument()
    })
  })

  describe('How It Works Section', () => {
    it('renders 3-step process', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Connect Your Lead Sources/i)).toBeInTheDocument()
      expect(screen.getByText(/AI Responds & Qualifies/i)).toBeInTheDocument()
      expect(screen.getByText(/You Close the Deal/i)).toBeInTheDocument()
    })

    it('shows step numbers', () => {
      render(<LandingPage />)
      // Check for step indicators
      const steps = screen.getAllByText(/^[123]$/)
      expect(steps).toHaveLength(3)
    })
  })

  describe('Pricing Section', () => {
    it('renders pricing headline', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Join Our Pilot Program/i)).toBeInTheDocument()
    })

    it('displays FREE prominently', () => {
      render(<LandingPage />)
      expect(screen.getByText(/^FREE$/i)).toBeInTheDocument()
    })

    it('shows post-pilot pricing', () => {
      render(<LandingPage />)
      expect(screen.getByText(/\$49\/month/i)).toBeInTheDocument()
    })

    it('lists all included features', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Unlimited AI lead responses/i)).toBeInTheDocument()
      expect(screen.getByText(/Follow Up Boss integration/i)).toBeInTheDocument()
      expect(screen.getByText(/TCPA compliance built-in/i)).toBeInTheDocument()
    })

    it('shows pilot benefits', () => {
      render(<LandingPage />)
      expect(screen.getByText(/20% lifetime discount/i)).toBeInTheDocument()
      expect(screen.getByText(/Priority support/i)).toBeInTheDocument()
    })

    it('shows risk reversal text', () => {
      render(<LandingPage />)
      expect(screen.getByText(/No credit card required for pilot/i)).toBeInTheDocument()
    })
  })

  describe('FAQ Section', () => {
    it('renders FAQ heading', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument()
    })

    it('renders all FAQ questions', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Will this sound like a robot?/i)).toBeInTheDocument()
      expect(screen.getByText(/Is this TCPA compliant?/i)).toBeInTheDocument()
      expect(screen.getByText(/Do I need to be technical to set this up?/i)).toBeInTheDocument()
    })
  })

  describe('Final CTA Section', () => {
    it('renders final CTA headline', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Stop Losing Leads. Start Converting More./i)).toBeInTheDocument()
    })

    it('renders final CTA button', () => {
      render(<LandingPage />)
      const finalCTA = screen.getByRole('link', { name: /Join the Pilot Program - Free for 30 Days/i })
      expect(finalCTA).toBeInTheDocument()
    })
  })

  describe('Urgency Elements', () => {
    it('displays urgency banner at top', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Limited Pilot Spots/i)).toBeInTheDocument()
    })

    it('shows remaining spots count', () => {
      render(<LandingPage />)
      expect(screen.getByText(/7 pilot spots remaining/i)).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('renders TCPA compliance notice', () => {
      render(<LandingPage />)
      expect(screen.getByText(/TCPA Compliance Notice/i)).toBeInTheDocument()
    })

    it('renders results disclaimer', () => {
      render(<LandingPage />)
      expect(screen.getByText(/Results Disclaimer/i)).toBeInTheDocument()
    })

    it('renders footer navigation links', () => {
      render(<LandingPage />)
      expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument()
    })
  })
})
