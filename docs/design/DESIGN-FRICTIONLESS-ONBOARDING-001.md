# Design Spec: Self-Serve Frictionless Onboarding Flow

## Overview
Design specifications for the frictionless onboarding flow that enables new real estate agents to move from landing-page visitor to first clear product value in under 2 minutes, with signup completed in under 60 seconds.

**Target Metrics:**
- Signup completion: <60 seconds
- Time to first value: <2 minutes  
- No credit card required

**PRD Reference:** `/Users/clawdbot/projects/leadflow/docs/PRD-FRICTIONLESS-ONBOARDING-001.md`

---

## Design Principles

This design removes all friction. Every element serves the goal of getting new users to first value in <2 minutes.

- **Maximum clarity**: Users understand next steps at all times
- **Minimal decisions**: Reduce choice paralysis (no plan selection in trial flow)
- **Immediate momentum**: Quick wins create motivation
- **Sample data credibility**: Real-looking demo leads build confidence
- **Progress visibility**: Clear progress through setup wizard

---

## Part 1: Trial Signup Entry

### Entry Point: /signup?mode=trial

#### Layout
- Full-width gradient background: `from-slate-900 via-slate-800 to-slate-900`
- Centered card container, max-width 420px
- Vertical centering on screen

#### Visual Structure

**Header:**
- Logo + brand name (minimal)
- "Already have an account? Sign in" link (top-right)

**Form Card:**
- White card on dark background
- 3 input fields: email, password, name (optional)
- Prominent CTA button: "Create My Free Account"
- Supportive copy: "Free 14 days · No credit card · Cancel anytime"
- Login link at bottom

#### Component Specifications

**Email Input:**
- Label: "Email address"
- Placeholder: "you@example.com"
- Validation: Real-time, show error below if invalid
- Error color: `text-red-600 dark:text-red-400`

**Password Input:**
- Label: "Password"
- Placeholder: "Min 8 characters"
- Eye icon toggle (right side) to show/hide
- Min length: 8 characters
- Validation: Real-time feedback

**Name Input (Optional):**
- Label: "Your name (optional)"
- Placeholder: "Your name"
- Subtext: "(optional)"

**Submit Button:**
- Full width
- Text: "Create My Free Account"
- Icon: Arrow right on right side
- Background: emerald-500 hover:emerald-600
- Loading state: Spinner + "Creating account..."

**Success Message:**
- Brief confirmation: "Account created! Redirecting..."
- Then redirect to `/dashboard/onboarding` 

#### Responsive Behavior
- **Mobile (<640px)**: Full-screen card, inputs stack, button full width
- **Desktop (≥640px)**: Centered with max-width

---

## Part 2: First-Session Dashboard

### Auto-Load on First Login

#### Key Elements

**1. Trial Welcome Banner (Top of Dashboard)**
```
┌─────────────────────────────────────────────────────────────┐
│  🎉 Welcome to your 14-day free trial!                  [→] │
│  You're minutes away from never missing a lead again.    13  │
│                                                         days  │
│                                                          left │
└─────────────────────────────────────────────────────────────┘
```

- Background: Gradient `from-emerald-500/10 to-amber-500/10`
- Border: `border border-emerald-500/20`
- Padding: `p-4`
- Layout: `flex items-center justify-between`
- Days remaining on right side with emerald accent color
- Purpose: Establish urgency and excitement

**2. Stats Cards (Immediate Feedback)**

4 cards in a row:
- **Total Leads**: "12" (large number)
- **New Leads**: "8"
- **Responded**: "3"
- **Qualified**: "2"

Layout: `grid grid-cols-4 gap-4`
Card style: `bg-white dark:bg-slate-900 border rounded-lg p-4`

**3. Sample Lead Feed**

List of 3-5 pre-seeded sample leads with:
- Avatar (initials in circle, emerald background)
- Name + brief context
- Lead message preview
- Time received ("2m ago", "15m ago", etc.)
- "View" action link

Each lead shows realistic real estate inquiry language:
- "Interested in 123 Main St"
- "First-time buyer looking in Austin area"
- "Pre-approved and ready to move"

**Sample Data Badge** (top-right of feed):
- Text: "Sample Data"
- Style: `bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-1 rounded`

**4. Setup Wizard Callout**

Card promoting setup:
```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Complete Setup (2 min)                                  │
│                                                             │
│  [●────◌────◌]  Step 1 of 3: Connect Follow Up Boss   [→] │
│                                                             │
│  Connect your CRM to automatically import leads and sync    │
│  conversations.                                             │
└─────────────────────────────────────────────────────────────┘
```

- Progress bar shows current step
- CTA arrow on right launches wizard
- Subtitle explains benefit

---

## Part 3: Guided Setup Wizard

### Modal Overlay (3 Steps, 2 min total)

#### Layout
- Full-screen overlay: `bg-slate-900/80 backdrop-blur-sm`
- Centered card: `max-w-xl w-full mx-4`
- Fixed header with close button
- Progress indicator at top

#### Step 1: Connect Follow Up Boss

**Header:**
- Icon: Plug icon (16x16, emerald-500)
- Title: "Connect Follow Up Boss"
- Subtitle: "Link your FUB account to automatically import leads and keep conversations in sync."

**Form Field:**
- Label: "FUB API Key"
- Input: Password-style (masked)
- Help text: "[?] Find your API key in FUB → Settings → API"
- Link color: `text-emerald-500 hover:text-emerald-600`

**Validation:**
- Real-time check against FUB API
- Show spinner while checking
- Success message: "✓ Connected to Follow Up Boss. Webhook configured automatically."
- Error message with troubleshooting link

**Buttons:**
- Secondary: "Skip for now" (outline style)
- Primary: "Continue →" (emerald, full width)

#### Step 2: Configure SMS

**Header:**
- Icon: Message icon
- Title: "Configure SMS Messaging"
- Subtitle: "Set up your phone number for AI-powered text responses."

**Content:**

**Phone Number Dropdown:**
- Label: "Select Phone Number"
- Placeholder: "+1 (555) 123-4567"
- Option to "[+] Provision new number"

**Test SMS:**
- Label: "Send Test SMS"
- Input: Recipient phone number (pre-filled with user's number)
- Button: "Send Test Message"
- Success: "✓ Test message sent! Check your phone."

**Buttons:**
- Secondary: "← Back"
- Primary: "Continue →"

#### Step 3: See It In Action (Aha Simulator)

**Header:**
- Icon: Sparkles (✨)
- Title: "See LeadFlow In Action"
- Subtitle: "Watch the AI respond to a simulated lead in real-time."

**Simulation Display:**

1. **Lead Notification:**
   - Badge: "🔔 New Lead: David Martinez"
   - Message: "Hi, I'm interested in the property on Oak Street..."
   - Style: `bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3`

2. **AI Processing Animation:**
   - Text: "🤖 AI is drafting a response..."
   - Progress bar fills over ~1.5 seconds
   - Style: `bg-slate-200 dark:bg-slate-700 h-1 rounded-full`

3. **Success State:**
   - Checkmark: "✅ AI Response Sent (1.2s)"
   - Full response text in emerald bubble:
     ```
     "Hi David! Thanks for reaching out about Oak Street. 
     I'd be happy to help! Are you available for a showing 
     this Saturday at 2pm?"
     ```

4. **Explanation Box:**
   ```
   📊 What just happened?
   
   • Analyzed lead intent and urgency
   • Drafted personalized response in 1.2 seconds
   • Included calendar link for easy booking
   • Logged to your CRM automatically
   ```
   - Style: `bg-slate-50 dark:bg-slate-800/50 border rounded-lg p-4`

**Buttons:**
- Secondary: "← Back"
- Primary: "Go to Dashboard →" (completes onboarding, redirects to `/dashboard`)

---

## Part 4: Completion State

### Onboarding Complete

After Step 3, redirect to dashboard with:
- Confetti animation (optional, subtle)
- Wizard closes
- Toast notification: "Setup complete! Your trial is live."
- Dashboard shows with setup card replaced by next action

---

## Part 5: Trial State Visibility

### Trial Badge (Dashboard Header)

```
🎉 Trial: 12 days left
```

- Position: Top-right header area
- Background: `bg-amber-100 dark:bg-amber-900/30`
- Text: `text-amber-700 dark:text-amber-400 text-sm font-medium`
- Border: `border border-amber-200 dark:border-amber-800`
- Padding: `px-3 py-1`
- Border radius: `rounded-full`

**Urgency Progression:**
- ">7 days": Amber theme (informational)
- "3-7 days": Orange theme (getting urgent)
- "<3 days": Red theme (final push)

---

## Part 6: Animation & Micro-interactions

### Page Transitions

**Signup → Dashboard:**
- Signup form fades out (150ms ease-out)
- Dashboard content fades in (300ms ease-in)
- Stats cards stagger in with slight upward motion (100-200ms stagger)

**Wizard Steps:**
- Current step slides left, fades out (150ms)
- New step slides right, fades in (200ms)
- Progress bar fills smoothly (300ms ease-out)

### Aha Simulator

**Lead Notification:** Slides down (200ms), slight bounce

**Progress Bar:** Fills smoothly over 1.5s with `transition-all`

**Success Checkmark:** Scales in with spring animation (1.2 spring ease)

**Response Text:** Types in character by character (30ms per char) or fades in (faster alternative)

### Hover States

**Buttons:** Scale 1.02, shadow increase, 200ms ease

**Cards:** Subtle lift (-2px), shadow increase, 200ms ease

**Lead Items:** Background shift to slate-50, arrow slides in right

---

## Part 7: Responsive Design

### Mobile (<640px)

**Signup Form:**
- Full-screen card
- Inputs stack vertically
- Button full width

**Dashboard:**
- Sidebar becomes hamburger menu
- Stats cards 2x2 grid
- Lead feed full width
- Trial banner stays at top

**Wizard:**
- Full-screen modal (no left/right margin)
- Padding: `p-4`
- Progress indicator simplified to 3 dots instead of bar
- Buttons: Stack vertically below content

### Tablet (640-1024px)

**Stats Cards:** 2x2 grid layout

**Wizard:** Slightly reduced max-width, `max-w-lg`

### Desktop (>1024px)

**Stats Cards:** 4-column full width

**Wizard:** `max-w-xl` centered

---

## Part 8: Accessibility

### Focus Management

- All interactive elements have visible focus ring: `ring-2 ring-emerald-500 ring-offset-2`
- Tab order follows visual flow (top-to-bottom, left-to-right)
- Wizard modal traps focus within card

### Screen Reader Support

- Form labels use `<label>` with `for` attribute
- Error messages linked via `aria-describedby`
- Progress step announced via `aria-live="polite"`
- Wizard modal marked with `role="dialog"` and `aria-modal="true"`
- Button text includes action: "Continue →" instead of just "Next"

### Reduced Motion

- Respect `prefers-reduced-motion: reduce`
- Disable animations for users with this preference
- Keep essential transitions (fade) but remove scale/translate effects

### Color Contrast

- All text meets WCAG AA standards (4.5:1 for small text, 3:1 for large)
- Error colors work for colorblind users (red + icon)
- Don't rely on color alone to communicate state

---

## Part 9: Implementation Notes for Dev

### Files to Create/Modify

1. **`/app/signup/page.tsx`** - Trial signup page (already exists, update with this spec)
2. **`/app/dashboard/page.tsx`** - Add trial banner and setup wizard trigger
3. **`/app/onboarding/page.tsx`** - Main wizard container
4. **`/app/onboarding/steps/`** - Three step components:
   - `fub-connect.tsx`
   - `sms-configure.tsx`
   - `aha-simulator.tsx`
5. **`/components/dashboard/TrialBanner.tsx`** - Reusable trial banner component
6. **`/components/dashboard/SampleLeadFeed.tsx`** - Sample data component
7. **`/components/onboarding/WizardContainer.tsx`** - Modal wrapper
8. **`/lib/onboarding/wizard-state.ts`** - Progress/state management

### Design System Usage

- **Colors**: Use design token exports from `globals.css`
- **Typography**: Font sizes from Tailwind scale (text-sm, text-base, text-lg, text-2xl)
- **Spacing**: 4px grid (gap-2, p-4, mt-6)
- **Components**: Use shadcn/ui Button, Input, Card components where available
- **Icons**: Lucide React icons (Plug, MessageSquare, Sparkles, Check, Eye, EyeOff, Bell, AlertCircle)

### Event Tracking

Track these events in analytics:
- `trial_signup_started` - Form mounted
- `trial_signup_completed` - Account created
- `dashboard_first_paint` - Dashboard loaded
- `sample_data_rendered` - Lead feed visible
- `wizard_step_completed` (step_name: "fub_connect" | "sms_config" | "aha_simulator")
- `aha_simulation_completed` - AI response displayed
- `onboarding_completed` - All steps done

### Performance Targets

- Signup page load: <1s
- Dashboard first paint: <1.5s
- Sample data render: <500ms
- Aha simulator response: <15s (triggers AI call)
- Total time signup → first value: <2 minutes

---

## Part 10: Success Criteria

✅ Signup completes in <60 seconds
✅ First value visible (sample leads + aha moment) in <2 minutes
✅ No credit card requested at any point
✅ Clear progress indication throughout
✅ All text is scannable and action-oriented
✅ Mobile-responsive and touch-friendly
✅ Accessible to screen readers and keyboard navigation
✅ Loading states and errors handled gracefully

---

## Appendix: Sample Lead Data

Three pre-seeded demo leads for first dashboard view:

**Lead 1:**
- Name: Sarah Johnson
- Avatar: "SJ" (initials)
- Context: "Interested in 123 Main St"
- Time: "2m ago"
- Message: "Hi, I saw your listing and would love to schedule a showing this weekend. What times work for you?"

**Lead 2:**
- Name: Michael Chen
- Avatar: "MC"
- Context: "Looking in Austin area"
- Time: "15m ago"
- Message: "What's the asking price? I'm pre-approved and ready to move within 30 days."

**Lead 3:**
- Name: Emily Rodriguez
- Avatar: "ER"
- Context: "First-time buyer"
- Time: "32m ago"
- Message: "Hello! I'm new to this process and wondering what I need to do to get started."

All marked with amber "Sample Data" badge.

---

**Design Spec Complete**

This spec defines layouts, components, interactions, and accessibility requirements for the frictionless onboarding flow. Use as reference for dev implementation.