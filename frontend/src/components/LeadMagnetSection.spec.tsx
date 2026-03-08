/**
 * LeadMagnetSection — Component Spec for Dev Agent
 *
 * This file is a DESIGN SPEC / SKELETON — not production code.
 * Dev agent: implement this component based on the spec below.
 * Reference: agents/design/LEAD-MAGNET-DESIGN-SPEC.md
 *
 * TASK: feat-lead-magnet-email-capture
 */

/**
 * COMPONENT: LeadMagnetSection
 *
 * PURPOSE:
 *   Full-bleed landing page section offering the "5-Minute AI Lead Response Playbook"
 *   PDF as a lead magnet in exchange for email capture.
 *
 * PLACEMENT IN LandingPage.tsx:
 *   After <Features> section, before <SocialProof> section.
 *
 * VISUAL DESIGN:
 *   - Background: gradient from-sky-50 via-blue-50 to-emerald-50 (dark: slate-900 → slate-800)
 *   - Border: border-y border-sky-100 (dark: border-slate-700)
 *   - Layout: two-column on md+, single-column on mobile
 *   - Left col (md only): PDF mockup illustration (pure CSS div, no image)
 *   - Right col: eyebrow label, headline, subheadline, bullets, form, trust line
 *
 * INTERNAL STATE:
 *   - email: string
 *   - status: 'idle' | 'loading' | 'success' | 'error'
 *   - errorMessage: string | null
 *
 * FORM BEHAVIOR:
 *   - Validate email format client-side before calling API
 *   - Call POST /api/lead-capture with { email, source: 'landing-page', utm_* }
 *   - On success: show success state (animate in), fire lead_magnet_success GA4 event
 *   - On error: show inline error, fire lead_magnet_error GA4 event
 *   - On duplicate email: API returns success → show success state
 *
 * UTM CAPTURE:
 *   - Read from window.location.search on submit
 *   - Keys: utm_source, utm_medium, utm_campaign
 *
 * GA4 EVENTS (use existing useEventTracking hook):
 *   - lead_magnet_view      → fire via IntersectionObserver on section enter
 *   - lead_magnet_submit    → fire on form submit attempt
 *   - lead_magnet_success   → fire on successful API response
 *   - lead_magnet_error     → fire on validation or API error
 *
 * COPY (exact strings):
 *   eyebrow:     "FREE RESOURCE"
 *   headline:    "Not ready to start yet? Get the free playbook."
 *   subheadline: "The 5-Minute AI Lead Response Playbook — how top agents never miss a lead (and convert 3× more)."
 *   bullets:     [
 *                  "The exact framework top-producing agents use to respond first",
 *                  "Why 5 minutes is the make-or-break window (with data)",
 *                  "How AI handles it automatically — so you never miss a lead"
 *                ]
 *   input placeholder: "Enter your email address"
 *   button:      "Send Me the Playbook"
 *   trust line:  "No spam. Unsubscribe anytime. Delivered in 60 seconds."
 *   success h:   "Check your inbox!"
 *   success sub: "We just sent your playbook."
 *   success cta: "See how LeadFlow works →"
 *
 * PDF MOCKUP (pure CSS — no image):
 *   - div: w-36 h-44 rounded-lg shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300
 *   - background: bg-gradient-to-b from-sky-700 to-sky-900
 *   - Contains: title text + LeadFlow brand line with Zap icon
 *   - Title: "THE 5-MINUTE AI LEAD RESPONSE PLAYBOOK"
 *   - Brand: "LeadFlow" + <Zap className="h-3 w-3" />
 *
 * SUCCESS STATE:
 *   - Replace form + bullets region with success message
 *   - Animate: animate-in fade-in slide-in-from-bottom-4 duration-500
 *   - Show CheckCircle icon (h-12 w-12 text-emerald-500)
 *   - Include soft upsell link to trigger onGetStarted / sign up
 *
 * ERROR STATE:
 *   - Inline, below input
 *   - Input border: border-destructive
 *   - Error text: text-xs text-destructive mt-1 flex items-center gap-1
 *   - Icon: AlertCircle h-3.5 w-3.5
 *
 * ACCESSIBILITY:
 *   - aria-live="polite" on success/error region
 *   - Focus management: focus first element of success state after transition
 *   - Keyboard: form fully operable without mouse
 *
 * RESPONSIVE:
 *   - Mobile (< 768px): stacked layout, PDF mockup centered below bullets
 *   - Desktop (≥ 768px): two-column grid, PDF mockup in left column
 *   - Button: full-width on mobile (w-full), auto on desktop
 *   - Min touch targets: h-11 (44px) for input and button
 */

// Dev agent: implement the real component here.
// File location: frontend/src/components/LeadMagnetSection.tsx (rename, remove .spec)

export {}
