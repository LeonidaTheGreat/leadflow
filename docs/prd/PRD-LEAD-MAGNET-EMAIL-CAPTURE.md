# PRD: Lead Magnet / Email Capture on Landing Page

**ID:** PRD-LEAD-MAGNET-EMAIL-CAPTURE  
**Status:** approved  
**Version:** 1.0  
**Author:** Product Manager  
**Created:** 2026-03-07  
**Project:** LeadFlow AI (leadflow)  
**Use Case:** feat-lead-magnet-email-capture  

---

## 1. Problem Statement

The LeadFlow marketing landing page (`leadflow-ai-five.vercel.app`) currently presents visitors with a binary choice: sign up (paid) or leave. Visitors who are interested but not ready to commit have no middle option — there is no nurture path for visitors in the awareness or consideration stage.

**Impact:** High-intent real estate agent visitors bounce without any capture mechanism, permanently lost from the funnel. Given pilot stage and zero MRR pressure, every qualified prospect matters.

---

## 2. Goal

Add a lead magnet with email capture on the landing page to:
- Convert non-signup-ready visitors into nurture leads
- Build an email list of interested real estate agents
- Create an automated nurture sequence that moves leads toward trial/signup
- Measure top-of-funnel intent independently of free trial starts

**North Star Metric:** Email captures per week → conversion to trial within 30 days

---

## 3. Users

**Primary:** Real estate agents visiting the landing page who are curious but not ready to sign up  
**Secondary:** Brokerage managers researching AI tools for their team  
**Tertiary:** Stojan (operator) — needs email list visibility and analytics

---

## 4. Lead Magnet Options (Ranked)

| # | Lead Magnet | Effort | Appeal |
|---|-------------|--------|--------|
| 1 | **"The 5-Minute AI Lead Response Playbook" (PDF guide)** | Low | High |
| 2 | Free SMS response audit ("See how AI would respond to your last 5 leads") | Med | High |
| 3 | "AI Lead Conversion Cheat Sheet" (quick-reference card) | Low | Med |

**Recommended:** Option 1 — PDF guide. Concrete, downloadable, positions LeadFlow as the expert.

**Guide content:** "How Top Real Estate Agents Respond to Leads in Under 5 Minutes — and Convert 3x More" — practical tips that naturally lead to "or let AI do it automatically."

---

## 5. Feature Requirements

### 5.1 Email Capture Form (Landing Page)

**Placement:** Between the Hero section and Pricing section — high visibility without interrupting conversion flow.

**Section design (from Design agent):**
- Headline: *"Not ready to start yet? Get the free playbook."*
- Subheadline: *"The 5-Minute AI Lead Response Playbook — how top agents never miss a lead"*
- Email input field + CTA button ("Send Me the Playbook")
- Trust line: *"No spam. Unsubscribe anytime. Sent to your inbox in 60 seconds."*
- Optional: first name field (helps personalization)

**Behavior:**
- On submit: validate email format, call `/api/lead-capture` endpoint
- Success state: replace form with "🎉 Check your inbox! We just sent your playbook." (no redirect)
- Error state: inline error message, do not lose entered data
- Duplicate email: silently succeed (don't reveal email already exists)

### 5.2 API Endpoint: `/api/lead-capture`

**Method:** POST  
**Path:** `/api/lead-capture`  
**Body:**
```json
{
  "email": "agent@realty.com",
  "firstName": "Sarah",       // optional
  "source": "landing-page",
  "utmSource": "...",         // optional, from cookie/URL param
  "utmMedium": "...",
  "utmCampaign": "..."
}
```

**Response (success):**
```json
{ "success": true, "message": "Playbook sent!" }
```

**Response (error):**
```json
{ "success": false, "error": "Invalid email" }
```

**Backend actions:**
1. Validate email (format check)
2. Upsert into `pilot_signups` table: `email`, `first_name`, `source='lead_magnet'`, `utm_*`, `created_at`
3. Trigger welcome/delivery email via email provider (see §5.3)
4. Return success

### 5.3 Email Delivery

**Trigger:** Immediately on capture (synchronous or fast async)

**Email sequence:**
1. **Email 1 (Instant):** Playbook delivery
   - Subject: "Your AI Lead Response Playbook is here 🏡"
   - Body: brief intro + PDF download link (or inline content if no PDF hosting)
   - CTA: "Try LeadFlow Free" → signup URL

2. **Email 2 (Day 3):** Social proof nudge
   - Subject: "What happens when you respond to a lead in 5 minutes vs. 5 hours"
   - Body: stat-driven story + LeadFlow as solution
   - CTA: "See how LeadFlow works" → landing page / demo video

3. **Email 3 (Day 7):** Urgency / pilot offer
   - Subject: "Pilot spots are almost full — here's your invite"
   - Body: limited pilot framing, personal from Stojan
   - CTA: "Claim your free pilot spot" → signup

**Email provider:** Use whichever is already configured (check `SUPABASE_URL` / env for existing email setup). If none, use Resend (free tier, easy API, recommended). Dev agent to configure.

### 5.4 Supabase Storage

Store captures in `pilot_signups` table (already exists):

| Column | Value |
|--------|-------|
| `email` | captured email |
| `first_name` | optional, from form |
| `source` | `'lead_magnet'` |
| `utm_source` | from URL params |
| `utm_medium` | from URL params |
| `utm_campaign` | from URL params |
| `created_at` | server timestamp |
| `status` | `'nurture'` (new value) |

If `pilot_signups` schema doesn't have `source` or `status` columns, dev to add via migration.

### 5.5 Analytics Events

Fire these GA4 events (if GA4 already configured via UTM tracking UC):
- `lead_magnet_view` — when section is visible (IntersectionObserver)
- `lead_magnet_submit` — on form submit attempt
- `lead_magnet_success` — on successful capture
- `lead_magnet_error` — on validation/API error

---

## 6. Acceptance Criteria

### AC-1: Form Renders on Landing Page
- **Given** a visitor loads the landing page  
- **When** they scroll past the hero section  
- **Then** they see the email capture section with headline, subheadline, email input, and CTA button  

### AC-2: Successful Capture
- **Given** a visitor enters a valid email and submits  
- **When** the form submits  
- **Then** the form is replaced with a success message within 3 seconds, and the record appears in `pilot_signups` with `source = 'lead_magnet'`  

### AC-3: Invalid Email Rejected
- **Given** a visitor enters an invalid email (e.g. "notanemail")  
- **When** they click the CTA  
- **Then** an inline error message appears; the API is not called  

### AC-4: Delivery Email Sent
- **Given** a successful capture  
- **When** the record is saved  
- **Then** a welcome/playbook email arrives in the captured inbox within 60 seconds  

### AC-5: Duplicate Email Handled Gracefully
- **Given** an email already in `pilot_signups`  
- **When** submitted again  
- **Then** success state shows (no error exposed to user), no duplicate row created  

### AC-6: UTM Parameters Captured
- **Given** a visitor arrives via `?utm_source=google&utm_medium=cpc`  
- **When** they submit the form  
- **Then** `utm_source` and `utm_medium` are stored in the `pilot_signups` record  

### AC-7: Mobile Responsive
- **Given** a visitor on a mobile device (375px viewport)  
- **When** the section loads  
- **Then** the form is fully usable without horizontal scroll, input and button are appropriately sized  

---

## 7. Out of Scope (v1)

- In-app nurture dashboard for Stojan (later)
- A/B testing of lead magnet copy (later)
- CRM sync (FUB) for lead magnet captures — these are not real estate leads
- Multi-step capture form (name + phone + email)
- Pop-up / exit-intent variant (later)
- Actual PDF design (Marketing agent to draft; plain-text email acceptable for v1)

---

## 8. Workflow

**product → marketing → design → dev → qc**

| Stage | Responsible | Deliverable |
|-------|------------|-------------|
| product | PM | This PRD ✅ |
| marketing | Marketing agent | Playbook content (guide text), 3-email sequence copy |
| design | Design agent | Section UI design, form component spec |
| dev | Dev agent | `/api/lead-capture` endpoint, form component, email delivery, `pilot_signups` migration |
| qc | QC agent | E2E tests covering all 7 ACs |

---

## 9. Success Metrics (30-Day)

| Metric | Target |
|--------|--------|
| Email captures | 20+ in first 30 days |
| Capture → trial conversion | ≥ 10% |
| Email open rate (Email 1) | ≥ 50% |
| Email click rate (Email 1) | ≥ 20% |

---

## 10. Dependencies

- `pilot_signups` table exists (confirmed) — may need `source` and `status` columns
- Landing page deployed on Vercel (`leadflow-ai-five.vercel.app`) — confirmed
- Email provider configured or Resend API key added to Vercel env vars
- UTM parameter capture (UC: `feat-utm-capture-marketing-attribution`) — complementary, not blocking
