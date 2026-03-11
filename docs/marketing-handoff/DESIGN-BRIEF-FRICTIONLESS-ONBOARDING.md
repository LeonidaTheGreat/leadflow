# Content Brief: Design Team — Frictionless Onboarding Flow

**Use Case:** feat-frictionless-onboarding-flow  
**PRD:** PRD-FRICTIONLESS-ONBOARDING-001  
**Handoff From:** Marketing  
**Status:** Ready for Design

---

## Overview

Design the visual experience for the Self-Serve Frictionless Onboarding Flow. The goal is to get users from landing page to their first AI response in under 2 minutes with zero friction.

**Key Design Principles:**
1. **Speed** — Every screen should feel fast and lightweight
2. **Clarity** — No ambiguity about what to do next
3. **Confidence** — Build trust at every step
4. **Celebration** — Make the aha moment feel special

---

## 1. Landing Page Design Requirements

### 1.1 Hero Section

**Layout:**
- Full-width, above the fold
- Two-column on desktop (copy left, visual right)
- Single column, stacked on mobile

**Visual Elements:**
- Clean, minimal background (white or very light gray)
- Subtle gradient or abstract pattern (optional)
- Hero image/illustration: AI responding to leads (speed/visualization)

**Typography:**
- H1: Large, bold, max 60 characters
- Subheadline: 16-18px, readable line height (1.6)
- CTA: High contrast, prominent

**Trust Elements:**
- Small icons/text below CTA: "🔒 SSL secured · No CC required · Cancel anytime"
- Optional: "78% of deals go to first responder" stat badge

**Mobile Considerations:**
- CTA button: Full width, min 48px height
- Text size: Minimum 16px to prevent zoom
- Touch targets: Minimum 44x44px

---

### 1.2 Trust Bar

**Placement:** Below hero or sticky at bottom
**Elements:**
- 4 trust signals with icons
- Horizontal on desktop, 2x2 grid on mobile
- Subtle background color to differentiate

---

### 1.3 CTA Button States

**Default State:**
- Primary brand color (suggested: blue #007bff or green #28a745)
- White text, bold
- Subtle shadow
- Hover: Slightly darker, lift shadow

**Loading State:**
- Spinner icon (inline, left of text)
- Disabled appearance
- Text: "Creating your account..."

**Success State:**
- Green checkmark icon
- Text: "Success! Redirecting..."
- Brief celebration animation (optional)

---

## 2. Signup Page Design (`/signup/trial`)

### 2.1 Layout

**Desktop:**
- Centered card, max-width 480px
- Logo top-left (clickable to home)
- No navigation menu (focused flow)
- Clean background (subtle pattern optional)

**Mobile:**
- Full-width card with padding
- Logo centered at top
- Keyboard-aware layout (input scrolls into view)

### 2.2 Form Design

**Fields:**
- Email: Large input, clear label, placeholder text
- Password: Same + show/hide toggle (eye icon)
- Helper text below password: "Must be at least 8 characters"

**Validation:**
- Inline validation (green checkmark when valid)
- Error states: Red border + icon + message below
- Don't show error until blur or submit

**Submit Button:**
- Full width on mobile
- Large touch target (min 48px height)
- Clear loading state

### 2.3 Error Display

**Duplicate Email:**
- Friendly message with inline link
- Don't clear the form

**Network Error:**
- Toast notification or inline banner
- Retry button

### 2.4 Success Transition

- Brief success message
- Auto-redirect after 1-2 seconds
- Optional: Progress bar showing redirect

---

## 3. Dashboard First Visit

### 3.1 Sample Leads Display

**Leads List:**
- 3 sample leads pre-populated
- Each lead card shows:
  - Name (e.g., "Sarah M.")
  - Source badge (Zillow, Realtor.com, Facebook Ad)
  - Masked phone: "+1 (***) ***-1234"
  - AI Draft preview (truncated)
  - Timestamp (3 min ago, 12 min ago, 1 hr ago)

**Sample Badge:**
- Small, subtle "Sample" label on each lead
- Gray background, non-intrusive
- Distinguishes from real leads

### 3.2 Sample Leads Banner

**Design:**
- Yellow/orange background (warning/info style)
- Icon: ℹ️ or 💡
- Text: "These are sample leads to show you how LeadFlow works. Connect FUB to see your real leads."
- Dismiss button: X or "Got it"
- Dismissible per session

### 3.3 Trial Countdown Banner

**Placement:** Top of every dashboard page (sticky)
**Design:**
- Background: Light blue (days 1-10), orange (days 11-13), red (day 14)
- Icon: ⏱ or ⚠️ or 🔴
- Text: "X days left in your free trial"
- CTA button: "Upgrade Now" (right-aligned)
- Dismissible: X button (per session only)

---

## 4. Guided Setup Wizard

### 4.1 Container Design

**Overlay Style:**
- Full-screen modal/overlay
- Dark semi-transparent backdrop (focus attention)
- Centered card, max-width 600px
- Cannot be closed without completing or skipping

**Progress Indicator:**
- Horizontal stepper at top
- 3 steps: Connect FUB → Verify SMS → See It Work
- Current step: Filled/active color
- Completed steps: Checkmark + green
- Future steps: Gray/outline

**Mobile:**
- Full-screen, no backdrop (native app feel)
- Stepper: Simplified dots or "Step 1 of 3"
- Large tap targets

### 4.2 Step 1: Connect FUB

**Layout:**
- FUB logo/icon at top
- Title: "Connect Follow Up Boss"
- Description: One sentence explaining why
- Input field: API key
- Help link: "Where do I find my FUB API key?"
- Primary CTA: "Connect FUB"
- Skip link: Small, secondary

**Help Tooltip:**
- Triggered by help link click
- 3-step visual guide (icons or mini screenshots)
- Dismissible

**Success State:**
- Green checkmark animation
- "Connected — X leads synced"
- "Continue →" button

**Error State:**
- Red border on input
- Error icon + message below
- Shake animation (subtle)

### 4.3 Step 2: Verify SMS

**Layout:**
- Phone icon at top
- Title: "Verify Your Phone Number"
- Description: Explain this is the number leads will see
- Phone input with country code
- "Send Test SMS" button

**After Send:**
- Show confirmation input (4 digits)
- Show actual SMS content that was sent
- "Verify Code" button
- Resend option (with countdown timer)

**Success State:**
- Green checkmark
- "SMS verified — you're ready to respond to leads"
- "Continue →" button

### 4.4 Step 3: Aha Moment Simulator

**Layout:**
- Split view or chat interface
- Left/Top: "Incoming Lead" section
- Right/Bottom: "AI Response" section

**Animation Sequence:**
1. Show "Incoming Lead" header
2. Lead message types in (character by character, 300ms per group)
3. Show "AI is generating response..." with spinner
4. Show elapsed seconds counter
5. AI response types in (character by character)
6. Success state with checkmark and timing

**Timing Display:**
- Large: "Responded in Xs ⚡"
- Subtext: "That's 99% faster than industry average"

**Success CTA:**
- "Go to Dashboard →" (primary, prominent)

**Failure State:**
- Friendly message: "Simulator timed out — your system is still ready"
- Subtext: "This was just a demo. Your real AI is configured."
- "Continue to Dashboard →" button

---

## 5. Visual Style Guide

### 5.1 Color Palette

**Primary:**
- Brand Blue: #007bff (buttons, links, active states)
- Brand Blue Dark: #0056b3 (hover)

**Success:**
- Green: #28a745
- Green Light: #d4edda (backgrounds)

**Warning/Countdown:**
- Yellow: #ffc107 (days 1-10 banner)
- Orange: #fd7e14 (days 11-13 banner)
- Red: #dc3545 (day 14 banner, errors)

**Neutral:**
- Dark Text: #1a1a1a (headlines)
- Body Text: #4a4a4a
- Muted Text: #6a6a6a
- Borders: #e9ecef
- Background: #f8f9fa

### 5.2 Typography

**Font Family:**
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

**Sizes:**
- H1: 28-32px, bold
- H2: 24px, semibold
- H3: 20px, semibold
- Body: 16px, regular
- Small: 14px, regular
- Micro: 12px, regular

### 5.3 Spacing

**Base unit:** 8px

**Common values:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### 5.4 Border Radius

- Buttons: 6px
- Inputs: 6px
- Cards: 8px
- Modals: 12px

### 5.5 Shadows

**Cards:**
- `0 2px 8px rgba(0,0,0,0.1)`

**Modals:**
- `0 4px 20px rgba(0,0,0,0.15)`

**Buttons (hover):**
- `0 4px 12px rgba(0,123,255,0.3)`

---

## 6. Animation Guidelines

### 6.1 Page Transitions

**Signup → Dashboard:**
- Fade out signup page
- Brief loading indicator (optional)
- Fade in dashboard
- Total: < 500ms

### 6.2 Wizard Transitions

**Step Advancement:**
- Slide current step left (out)
- Slide new step in from right
- Duration: 300ms
- Easing: ease-in-out

### 6.3 Success States

**Checkmark Animation:**
- Draw checkmark stroke (SVG animation)
- Scale up slightly
- Duration: 400ms

**Confetti (Optional):**
- On aha moment completion
- Subtle, brief (1 second max)
- Don't block interaction

### 6.4 Typing Animation

**Simulator:**
- Character-by-character reveal
- 30-50ms per character
- Cursor blink during typing

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | < 640px | Single column, full-width buttons, stacked layout |
| Tablet | 640-1024px | Two columns where appropriate |
| Desktop | > 1024px | Full layout, max-width containers |

**Mobile-Specific:**
- Touch targets: Minimum 44x44px
- Font size: Minimum 16px for inputs
- Wizard: Full-screen, no modal backdrop
- Bottom sheet for actions (optional)

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Color Contrast:**
- All text: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio

**Focus States:**
- Visible focus ring on all interactive elements
- Color: Brand blue with 2px offset

**Screen Readers:**
- All images have alt text
- Form labels associated with inputs
- Error messages announced (aria-live)
- Success states announced

**Keyboard Navigation:**
- All interactive elements reachable via Tab
- Logical tab order
- Escape key closes modals
- Enter/Space activates buttons

### 8.2 Reduced Motion

**Respect `prefers-reduced-motion`:**
- Disable slide animations
- Disable confetti
- Keep fade transitions (subtle)
- Instant step changes

---

## 9. Asset Requirements

### 9.1 Icons Needed

**UI Icons:**
- Checkmark (success states)
- X/close (dismiss, errors)
- Eye/eye-slash (password toggle)
- Info/question circle (help)
- Warning triangle (errors)
- Clock/countdown (trial banner)
- SMS/phone (SMS step)
- Database/connect (FUB step)
- Robot/AI (simulator step)
- Arrow right (CTAs)
- Spinner/loader (loading states)

**Source:** Use Lucide, Heroicons, or similar consistent set

### 9.2 Logos Needed

- LeadFlow logo (header)
- Follow Up Boss logo (wizard step 1)
- Twilio logo (optional, SMS step)

### 9.3 Illustrations (Optional)

- Hero illustration: AI + speed + leads
- Empty state: Friendly "no leads yet"
- Success celebration: Aha moment completion

---

## 10. Deliverables Checklist

**For Design Handoff:**
- [ ] Landing page mockup (desktop + mobile)
- [ ] Signup page mockup (desktop + mobile)
- [ ] Dashboard first visit mockup (with sample leads)
- [ ] Trial banner variations (3 colors)
- [ ] Wizard overlay mockup (all 3 steps)
- [ ] Wizard success/error states
- [ ] Simulator animation storyboard
- [ ] Upgrade page mockup (expired trial)
- [ ] Design system/component specs
- [ ] Asset exports (icons, logos)

**Specs to Include:**
- [ ] All colors (hex values)
- [ ] All typography (sizes, weights, line heights)
- [ ] All spacing values
- [ ] All animation timings
- [ ] Responsive behavior notes

---

## Questions?

Contact Marketing team for copy clarifications.
Reference PRD for functional requirements.

---

*Document Version: 1.0*  
*Last Updated: 2026-03-11*  
*Next: Dev Handoff*
