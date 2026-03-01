# LeadFlow AI — Agent Onboarding Wireframes

**Design System:** shadcn/ui + Tailwind CSS  
**Platform:** Mobile-first (iPhone 12+), responsive to desktop  
**Theme:** Dark mode (default), light mode (fallback)  
**Status:** ✅ Complete  
**Date:** 2026-02-26  
**Task ID:** 90687cbc-5809-4381-8dba-3689161167de  

---

## 🎯 User Journey Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  STEP 1     │───→│  STEP 2     │───→│  STEP 3     │
│  Signup/    │    │  Profile    │    │  Cal.com    │
│  Login      │    │  Setup      │    │  Connect    │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  STEP 6     │←───│  STEP 5     │←───│  STEP 4     │
│  Go Live    │    │  Phone #    │    │  FUB API    │
│  Confirm    │    │  Assign     │    │  Credentials│
└─────────────┘    └─────────────┘    └─────────────┘
```

**Flow Characteristics:**
- Progressive disclosure (one step at a time)
- Skip option on optional integrations (Steps 3, 4)
- Persistent progress indicator
- Auto-save draft state
- Back navigation available on all steps

---

## Step 1: Signup / Login Screen

### Purpose
Entry point for new agents. Clear value proposition with simple account creation or login for returning users.

### Mobile Layout (320px–568px)
- Logo: LeadFlow with tagline "AI Real Estate Agent"
- Headline: "Create Your Account"
- Subheadline: "Start closing more deals with AI-powered leads"
- Email input with real-time availability check
- Password input with strength meter
- Confirm password field
- Primary CTA: "Create Account →"
- OAuth: "Continue with Google"
- Sign in link for existing users
- Terms and Privacy links

### Desktop Layout (1025px+)
- Two-column layout
- Left: Hero with illustration, testimonial card
- Right: Signup form (same as mobile but wider)

### Components & Specs

**Email Input**
- Real-time availability check (debounced 500ms)
- Validation: email format regex
- Inline error: "Email already registered" or "Invalid email format"
- Success state: Green checkmark + "Available"

**Password Input**
- Min 8 characters
- Strength meter: Weak (red) / Medium (amber) / Strong (emerald)
- Requirements list: "At least 8 characters"
- Toggle visibility (eye icon)

**Confirm Password**
- Real-time match validation
- Error: "Passwords do not match"

**Primary CTA Button**
- State: Enabled when all fields valid
- Loading: Spinner + "Creating Account..."
- Success: Checkmark + redirect

---

## Step 2: Profile Setup (Name, Photo, Territory)

### Purpose
Capture agent identity and service area for personalized AI responses.

### Mobile Layout
- Progress: "Step 2 of 6 [██░░░░░░░░] 33%"
- Headline: "Set Up Your Profile"
- Photo upload (circular, optional but recommended)
- First Name (required)
- Last Name (required)
- Territory / State dropdown (required, all 50 states)
- Primary Market/City (required)
- License Number (optional)
- Continue button
- Back navigation

### Desktop Layout
- Two-column with photo on left, form fields on right
- Drag & drop support for photo upload

### Components & Specs

**Photo Upload**
- Circular crop preview (128px diameter)
- Supported formats: JPG, PNG, WebP
- Max size: 5MB
- Default: Generic avatar placeholder
- Drag & drop support (desktop)

**State Selector**
- Dropdown with all 50 US states
- Auto-detect from IP (optional enhancement)
- Required field

**Primary Market**
- Free text input with autocomplete
- Common markets pre-populated
- Multiple markets allowed (comma-separated)

---

## Step 3: Cal.com Integration / Connect

### Purpose
Connect agent's calendar for automated appointment booking from AI responses.

### Mobile Layout
- Progress: "Step 3 of 6 [███░░░░░░░] 50%"
- Headline: "Connect Your Calendar"
- Subheadline: "Let AI book appointments automatically"
- Cal.com logo and branding
- Booking link input field
- "Verify Link" button
- "Create Free Account" external link
- Info: Why Cal.com (free tier, automatic scheduling, syncs with Google/Outlook)
- Primary CTA: "Connect Calendar →"
- Skip option (optional step)
- Back navigation

### Desktop Layout
- Two-column: Branding/Info on left, form on right
- Connection status indicator

### Components & Specs

**Link Verification**
- HEAD request to validate URL accessibility
- Format validation: must be valid URL with cal.com domain
- Success: Green checkmark + "Link verified"
- Error: Red X + "Unable to reach this link"

**Cal.com Branding**
- Logo display (64px height)
- Clear explanation of integration value

**Skip Option**
- Clearly marked as optional
- Can connect later in settings
- Does not block onboarding progress

---

## Step 4: FUB (Follow Up Boss) API Credentials

### Purpose
Connect to Follow Up Boss CRM for lead synchronization and history tracking.

### Mobile Layout
- Progress: "Step 4 of 6 [████░░░░░░] 66%"
- Headline: "Connect Your CRM"
- Subheadline: "Sync leads with Follow Up Boss"
- FUB logo and branding
- API Key input (masked, secure)
- Help tooltip: "Where to find this: Settings → API → Keys"
- "Test Connection" button
- Connection status: "Connected to FUB: Account: Sarah Martinez"
- Skip option for non-FUB users
- Continue button
- Back navigation

### Desktop Layout
- Two-column: Branding/Info on left, credentials form on right
- Expandable help section with step-by-step instructions

### Components & Specs

**API Key Input**
- Masked input (dots for security)
- Show/hide toggle button
- Validation: Minimum length check

**Connection Test**
- Button to verify credentials
- Loading state while testing
- Success: Account name display
- Error: "Invalid API key" message

**Help Section**
- Expandable accordion with instructions
- Step-by-step guide with screenshots
- Link to FUB documentation

---

## Step 5: Phone Number Assignment

### Purpose
Assign a dedicated phone number for AI SMS responses. Critical for two-way communication.

### Mobile Layout
- Progress: "Step 5 of 6 [█████░░░░░] 83%"
- Headline: "Get Your AI Number"
- Subheadline: "Dedicated number for lead responses"
- Large phone number display: "+1 (305) 555-0123"
- "Get New Number" refresh button
- Number features list: SMS Enabled, Local Area Code Match, 2-way messaging
- Forward calls to: input field
- "Send Test SMS" button with confirmation message
- Pricing: "$5/month (waived during pilot)"
- Continue button
- Back navigation

### Desktop Layout
- Centered large number display
- Feature cards in grid layout
- Clear pricing disclosure section

### Components & Specs

**Number Display**
- Large, prominent display (32px font)
- E.164 format: +1 (XXX) XXX-XXXX
- Refresh button to request new number
- Area code preference based on territory

**Call Forwarding**
- Input for personal phone number
- Verification via SMS code
- Default to agent's phone from Step 2

**Test SMS**
- Sends sample message to forwarding number
- Confirms end-to-end delivery
- Shows delivery status

**Pricing Disclosure**
- Clear monthly cost
- Pilot promotion (waived fee)
- No hidden fees messaging

---

## Step 6: Go Live Confirmation

### Purpose
Final review and activation. Agent confirms all settings and goes live.

### Mobile Layout
- Progress: "Step 6 of 6 ✅ [██████░░░░] 100%"
- Celebration headline: "You're Ready to Go!"
- Subheadline: "Review and activate your AI assistant"
- Checkmark illustration: "All Systems Go"
- "YOUR SETUP" summary section:
  - Profile: Sarah Martinez, Miami Beach, Florida [Edit]
  - Calendar: ✓ Connected to Cal.com [Edit]
  - CRM: ✓ Connected to FUB [Edit]
  - Phone: +1 (305) 555-0123 [Edit]
- "What's Next?" checklist:
  1. Share your new number with lead sources
  2. AI starts responding within 2 minutes
  3. Track conversions in your dashboard
- Primary CTA: "🚀 GO LIVE →"
- "Make Changes" back option

### Desktop Layout (Final Celebration Screen)
- Centered celebration layout
- Configuration cards in grid (3 columns)
- Clear next steps with icons
- Large, prominent GO LIVE button

### Components & Specs

**Setup Summary Cards**
- Each integration shown as a card
- Status indicator (✓ or ⚠️)
- Quick edit links
- Collapsed/expandable details

**Go Live Button**
- Large, prominent (primary emerald-500)
- Confirmation modal on click
- "Are you sure?" safety check
- Redirect to dashboard on confirm

**Post-Activation Screen**
- Success message: "You're Live!"
- Quick tips for first use
- Link to dashboard
- Contact support option

---

## Responsive Behavior

### Mobile (320px–568px)
- Single column layout
- Full-width cards and inputs
- Bottom progress indicator
- Sticky primary CTA at bottom
- Touch-friendly (44px minimum tap targets)

### Tablet (569px–1024px)
- Two-column layout where appropriate
- Side-by-side form fields
- Larger spacing
- Persistent progress bar at top

### Desktop (1025px+)
- Maximum content width: 1200px
- Hero sections with illustrations
- Multi-column feature grids
- Hover states on interactive elements
- Keyboard navigation fully supported

---

## Interaction States

### Form Validation
- Real-time validation on blur
- Inline error messages below fields
- Success indicators (green checkmarks)
- Disabled submit until all required fields valid

### Button States
- Idle: Normal styling
- Hover: Slight elevation, shadow
- Active/Pressed: Darker shade
- Loading: Spinner replaces text
- Disabled: 50% opacity, cursor not-allowed
- Success: Checkmark animation

### Progress Indicator
- Smooth transitions between steps
- Percentage updates with animation
- Step labels on hover (desktop)

### Skip Options
- Gray secondary styling
- Confirmation on skip ("Are you sure?")
- Reminder to complete later

---

## Accessibility Notes

- All inputs have associated labels
- Focus rings on all interactive elements (emerald-500, 2px)
- WCAG AA color contrast compliance
- Screen reader announcements for validation
- Keyboard-only navigation support
- ARIA labels for icon-only buttons
- Error announcements via aria-live

---

## Technical Notes

### State Management
- Form data persisted to localStorage
- Recovery on browser refresh
- Clear data on successful completion

### API Integrations
- Real-time email availability check
- Cal.com URL verification endpoint
- FUB API validation endpoint
- Phone number provisioning via Twilio

### Error Handling
- Graceful degradation for optional steps
- Retry logic for failed API calls
- User-friendly error messages
- Support contact on persistent errors

---

## Completion Summary

**Status:** ✅ Wireframes Complete  
**Coverage:** All 6 onboarding steps  
**Platforms:** Mobile and Desktop  
**User Journey:** Documented with flow diagram  
**Components:** Specified with states and validation  
**Accessibility:** WCAG AA compliant  

---

*Document created: 2026-02-26*  
*Task: Onboarding UI - Wireframes Completion Check*  
*Unblocks: Onboarding UI Form Components (ID: 2040c777-e7c4-4fba-ab7a-6e75a5608b02)*
