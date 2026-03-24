/**
 * Landing Page Conversion Cleanup — Tests
 *
 * Use case: feat-landing-page-conversion-cleanup
 *
 * ACs verified:
 *   1. No "API Endpoints" section in landing DOM
 *   2. "How It Works" section with exactly 3 steps
 *   3. Pricing CTAs link to /signup?plan=starter|pro|team
 *   4. Testimonial social proof section present
 *   5. GA4 CTA click tracking wired for hero, pricing, testimonial
 *   6. Responsive layout — no horizontal overflow (overflow-x-hidden)
 */

import * as fs from 'fs'
import * as path from 'path'

// ─── Read source files once ─────────────────────────────────────────────────

const PAGE_PATH = path.resolve(__dirname, '../app/page.tsx')
const GA4_PATH = path.resolve(__dirname, '../lib/analytics/ga4.ts')
const pageSource = fs.readFileSync(PAGE_PATH, 'utf-8')
const ga4Source = fs.readFileSync(GA4_PATH, 'utf-8')

// ─── AC-1: No API Endpoints section ────────────────────────────────────────

describe('AC-1: No API Endpoints section', () => {
  it('does not contain an "API Endpoints" heading in the landing page', () => {
    expect(pageSource).not.toMatch(/API\s+Endpoints/i)
  })

  it('does not contain an api-endpoints test id', () => {
    expect(pageSource).not.toMatch(/data-testid=["']api-endpoints["']/i)
  })
})

// ─── AC-2: How It Works — exactly 3 steps ──────────────────────────────────

describe('AC-2: How It Works section', () => {
  it('contains a "How It Works" heading', () => {
    expect(pageSource).toMatch(/How It Works/)
  })

  it('has an id="how-it-works" section', () => {
    expect(pageSource).toMatch(/id=["']how-it-works["']/)
  })

  it('renders exactly 3 HowItWorksStep components', () => {
    const stepMatches = pageSource.match(/<HowItWorksStep/g)
    expect(stepMatches).toHaveLength(3)
  })

  it('steps are numbered 1, 2, 3', () => {
    expect(pageSource).toMatch(/step=\{1\}/)
    expect(pageSource).toMatch(/step=\{2\}/)
    expect(pageSource).toMatch(/step=\{3\}/)
  })

  it('each step has a title and description', () => {
    // Verify all 3 steps have title= and description= props
    const stepRegex = /<HowItWorksStep[^/]*title="[^"]+"\s+description="[^"]+"/g
    const matches = pageSource.match(stepRegex)
    expect(matches).toHaveLength(3)
  })
})

// ─── AC-3: Pricing CTAs → /signup?plan=starter|pro|team ────────────────────

describe('AC-3: Pricing CTAs aligned to /signup?plan=', () => {
  it('PricingCard primary CTA uses /signup?plan=${planSlug} template', () => {
    // The PricingCard component constructs href dynamically via planSlug
    expect(pageSource).toMatch(/href=\{`\/signup\?plan=\$\{planSlug\}`\}/)
  })

  it('planSlug is derived from name.toLowerCase()', () => {
    expect(pageSource).toMatch(/const planSlug = name\.toLowerCase\(\)/)
  })

  it('renders Starter, Pro, and Team pricing cards with correct names', () => {
    expect(pageSource).toContain('name="Starter"')
    expect(pageSource).toContain('name="Pro"')
    expect(pageSource).toContain('name="Team"')
  })

  it('Starter card links to /signup?plan=starter (via testimonial CTA as well)', () => {
    // The testimonial CTA also explicitly links to /signup?plan=starter
    expect(pageSource).toContain('/signup?plan=starter')
  })
})

// ─── AC-4: Testimonial social proof section ────────────────────────────────

describe('AC-4: Testimonial social proof section', () => {
  it('contains a testimonials section with data-testid', () => {
    expect(pageSource).toMatch(/data-testid=["']testimonials["']/)
  })

  it('contains "What Agents Are Saying" heading', () => {
    expect(pageSource).toMatch(/What Agents Are Saying/)
  })

  it('renders 3 TestimonialCard components', () => {
    const cardMatches = pageSource.match(/<TestimonialCard/g)
    expect(cardMatches).toHaveLength(3)
  })

  it('each testimonial has quote, name, and role props', () => {
    const testimonialRegex = /<TestimonialCard\s+quote="[^"]+"\s+name="[^"]+"\s+role="[^"]+"/g
    const matches = pageSource.match(testimonialRegex)
    expect(matches).toHaveLength(3)
  })

  it('testimonial section has a CTA button', () => {
    // There should be a CTA link inside the testimonials section
    expect(pageSource).toContain('get_started_testimonial')
  })
})

// ─── AC-5: GA4 CTA click tracking wired ────────────────────────────────────

describe('AC-5: GA4 CTA click tracking', () => {
  it('imports trackCTAClick from ga4 analytics', () => {
    expect(pageSource).toMatch(/import.*trackCTAClick.*from.*ga4/)
  })

  it('tracks hero CTA click (see_how_it_works)', () => {
    expect(pageSource).toMatch(/trackCTAClick\(\s*['"]see_how_it_works['"]/)
  })

  it('tracks pricing CTA clicks via planSlug', () => {
    expect(pageSource).toMatch(/trackCTAClick\(\s*`pricing_\$\{planSlug\}`/)
  })

  it('tracks testimonial CTA click', () => {
    expect(pageSource).toMatch(/trackCTAClick\(\s*['"]get_started_testimonial['"]/)
  })

  it('ga4.ts includes get_started_testimonial in CTAId type', () => {
    expect(ga4Source).toContain("'get_started_testimonial'")
  })

  it('ga4.ts includes testimonial in Section type', () => {
    expect(ga4Source).toContain("'testimonial'")
  })
})

// ─── AC-6: Responsive — no horizontal overflow ─────────────────────────────

describe('AC-6: Responsive layout — no overflow', () => {
  it('root container has overflow-x-hidden', () => {
    expect(pageSource).toMatch(/overflow-x-hidden/)
  })

  it('all grid layouts use responsive cols (grid-cols-1 md:grid-cols-*)', () => {
    // Every grid should start at grid-cols-1 for mobile
    const gridDeclarations = pageSource.match(/grid\s+grid-cols-\d/g)
    expect(gridDeclarations).not.toBeNull()
    gridDeclarations!.forEach((decl) => {
      expect(decl).toContain('grid-cols-1')
    })
  })

  it('containers use px-4 for mobile padding', () => {
    const containerMatches = pageSource.match(/container\s+mx-auto\s+px-4/g)
    expect(containerMatches).not.toBeNull()
    expect(containerMatches!.length).toBeGreaterThanOrEqual(4)
  })
})

// ─── Section order validation ───────────────────────────────────────────────

describe('Section order', () => {
  it('renders sections in correct order: hero → how-it-works → features → testimonials → pricing → footer', () => {
    const heroIdx = pageSource.indexOf('Hero')
    const howIdx = pageSource.indexOf('How It Works')
    const featuresIdx = pageSource.indexOf('id="features"')
    const testimonialsIdx = pageSource.indexOf('id="testimonials"')
    const pricingIdx = pageSource.indexOf('id="pricing"')
    const footerIdx = pageSource.indexOf('<footer')

    expect(heroIdx).toBeLessThan(howIdx)
    expect(howIdx).toBeLessThan(featuresIdx)
    expect(featuresIdx).toBeLessThan(testimonialsIdx)
    expect(testimonialsIdx).toBeLessThan(pricingIdx)
    expect(pricingIdx).toBeLessThan(footerIdx)
  })
})
