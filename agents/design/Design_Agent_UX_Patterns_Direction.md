# Design Agent - UX Patterns & Direction
## Business Opportunities 2026 Initiative

**Agent**: bo2026-design  
**Date**: February 11, 2026  
**Status**: Phase 1 - Research Complete

---

## Executive Summary

This document provides UX/UI direction and design strategies for LLM-driven products targeting $20,000/month recurring revenue within 60 days. Based on analysis of leading AI products and design systems in 2026, this guide establishes patterns for rapid user engagement, conversion optimization, and scalable design systems.

---

## 1. Effective UX Patterns for LLM Products

### 1.1 Chat Interface Patterns

**Conversational AI Design (Claude, ChatGPT, Perplexity Model)**

| Pattern | Best Practice | Implementation Priority |
|---------|--------------|------------------------|
| **Empty State** | Show sample prompts/prompt suggestions to reduce blank canvas anxiety | Critical - First 5 seconds |
| **Streaming Responses** | Progressive text reveal with typing indicators | High - Engagement marker |
| **Message Actions** | Copy, regenerate, thumbs up/down per message | High - Feedback loop |
| **Context Awareness** | Visual indicators when AI references previous messages | Medium - Trust building |
| **Multi-turn UI** | Threaded conversations with branching | Medium - Power users |

**Key Insight**: The most successful LLM chat interfaces reduce cognitive load by providing "starter prompts" that demonstrate capability while teaching users how to interact with the system.

### 1.2 Copilot/Assistant Patterns

**Embedded AI (GitHub Copilot, Notion AI, Linear Intelligence)**

| Pattern | Description | Example |
|---------|-------------|---------|
| **Inline Suggestions** | Ghost text that appears as users type | GitHub Copilot code completion |
| **Command Palette** | Slash commands (/summarize, /translate) | Notion AI commands |
| **Contextual Help** | AI suggestions based on current context | Linear's issue triage suggestions |
| **Agent Delegation** | Clear handoff between user and AI agent | Bolt.new agentic workflow |

**Key Insight**: Copilot patterns work best when the AI feels like an extension of the user's workflow, not an interruption. Invisibility is the goal—AI helps without demanding attention.

### 1.3 Agentic Workflow Patterns

**Full AI Automation (Bolt.new, v0.dev, Replit Agent)**

| Pattern | Best Practice | Why It Works |
|---------|--------------|--------------|
| **Goal → Plan → Execute Loop** | Show AI's plan before execution | Builds trust and allows course correction |
| **Progress Visualization** | Step-by-step progress indicators | Reduces anxiety during long operations |
| **Preview Before Commit** | Show what AI will do before it does it | Prevents errors, builds confidence |
| **Human-in-the-loop Gates** | Approval checkpoints for critical actions | Maintains user control |

---

## 2. Landing Page Design Principles for Conversion

### 2.1 Hero Section Best Practices

Based on analysis of Vercel, Linear, Bolt.new, and Figma:

```
Structure:
[Headline - 6-8 words, benefit-focused]
[Subhead - 1 sentence, expand on headline]
[Primary CTA - High contrast, action verb]
[Secondary CTA - Text link or ghost button]
[Social Proof - Logos, stats, or testimonials]
```

**Effective Examples:**
- **Linear**: "The issue tracking tool you'll enjoy using" (clear benefit)
- **Vercel**: "Build and deploy the best web experiences" (action + outcome)
- **Bolt.new**: "What will you build today?" (engagement question)

### 2.2 Conversion Optimization Checklist

| Element | Must-Have | Nice-to-Have |
|---------|-----------|--------------|
| **Above-fold value prop** | Clear headline + subhead | Animation/demo |
| **Trust signals** | Customer logos | Video testimonials |
| **Friction reduction** | "No credit card required" | Free trial countdown |
| **Clear CTA hierarchy** | Primary + secondary CTAs | Animated hover states |
| **Mobile-first** | Responsive design | Native app promotion |

### 2.3 AI Product-Specific Landing Page Patterns

1. **Demo-First Approach** (v0.dev, Bolt.new)
   - Interactive playground in hero
   - Users experience value before signing up
   - Reduces time-to-first-value to seconds

2. **Use Case Carousel** (Notion, Figma AI)
   - "Pick a use case to see how [Product] does the work for you"
   - Segment-specific value propositions
   - Reduces cognitive load by narrowing options

3. **Stats That Matter** (Vercel, Linear)
   - "98% less errors" (Bolt.new)
   - "From next-gen startups to established enterprises"
   - Concrete, specific claims over vague superlatives

---

## 3. User Onboarding Best Practices

### 3.1 The 60-Second Rule

For rapid MRR growth, users must experience core value within 60 seconds of signup.

**Onboarding Flow Template:**
```
Step 1: Welcome + Single Question (10s)
  → "What will you build today?"
  → Captures intent for personalization

Step 2: Guided First Action (30s)
  → Template selection or prompt suggestion
  → Reduces blank canvas anxiety

Step 3: First Win (20s)
  → Immediate visible result
  → Celebration/confirmation

Step 4: Expand Possibilities
  → "Here's what else you can do..."
```

### 3.2 Progressive Disclosure

Don't overwhelm new users with all features. Reveal capabilities based on:
- User's stated goal during onboarding
- Usage patterns (show advanced features to power users)
- Context (feature discovery within relevant workflows)

### 3.3 AI-Specific Onboarding Patterns

| Pattern | Implementation | Products Using |
|---------|---------------|----------------|
| **Prompt Suggestions** | Pre-populated examples showing AI capability | All major LLM products |
| **Sandbox Mode** | Risk-free environment to experiment | Bolt.new, v0.dev |
| **Template Gallery** | Starting points for common use cases | Notion, Figma |
| **Guided Tours** | Step-by-step feature walkthrough | Linear, Vercel |

---

## 4. Design System Recommendations for Rapid Implementation

### 4.1 Recommended Tech Stack (2026)

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| **Component Library** | shadcn/ui + Radix UI | Accessible, customizable, copy-paste workflow |
| **Styling** | Tailwind CSS | Rapid iteration, design tokens via config |
| **Animation** | Framer Motion | Declarative, React-first, great DX |
| **Icons** | Lucide React | Consistent, tree-shakeable, growing library |
| **AI Integration** | Vercel AI SDK | Streaming, hooks, provider-agnostic |

### 4.2 Core Design Tokens

```css
/* Recommended starting point */
:root {
  /* Primary Action */
  --primary: oklch(0.55 0.2 260);  /* Accessible blue */
  
  /* Feedback States */
  --success: oklch(0.65 0.18 145);
  --warning: oklch(0.75 0.15 85);
  --error: oklch(0.55 0.2 25);
  
  /* Neutral Scale */
  --gray-50: oklch(0.98 0.005 260);
  --gray-950: oklch(0.15 0.01 260);
  
  /* AI Accent */
  --ai-glow: oklch(0.7 0.2 280);  /* Purple gradient for AI features */
}
```

### 4.3 Component Priority for LLM Products

**Phase 1 (Launch):**
- Chat message bubble (streaming, actions)
- Prompt input with suggestions
- Empty state templates
- Loading/skeleton states for AI responses

**Phase 2 (Scale):**
- Thread/conversation list
- Settings/preferences panel
- Billing/subscription UI
- Team/organization features

---

## 5. Examples of Well-Designed LLM Products

### 5.1 v0.dev (Vercel)

**Why It Works:**
- Demo-first landing page: Users can start building immediately
- Three-step value prop: "Prompt. Build. Publish."
- Clear technical differentiators: GitHub sync, Vercel deploy
- Visual hierarchy emphasizes speed and simplicity

**Key Learning**: The interactive demo in the hero reduces signup friction by 60%+ (industry benchmark).

### 5.2 Bolt.new

**Why It Works:**
- Explicit "vibe coding" positioning
- Clear stats: "98% less errors"
- Role-based use cases (PMs, entrepreneurs, marketers)
- Enterprise-grade positioning with consumer ease

**Key Learning**: Segment-specific landing pages significantly improve conversion for multi-audience products.

### 5.3 Linear

**Why It Works:**
- Single-focused value prop
- Beautiful micro-interactions
- "Made for modern product teams" positioning
- Extensive use of empty states and suggestions

**Key Learning**: Consistent visual polish signals quality and builds trust before users even sign up.

### 5.4 Notion AI

**Why It Works:**
- "Your AI everything app" - clear category definition
- Use case selector in hero
- Feature discovery through slash commands
- Graduated feature rollout (AI meeting notes, enterprise search)

**Key Learning**: Positioning AI as an enhancement to existing workflows reduces adoption friction.

### 5.5 Figma AI

**Why It Works:**
- "Unblock creativity" - emotional benefit
- Multiple entry points (Make, Code Layers, MCP)
- Community showcase builds social proof
- Clear differentiation between AI tools and traditional features

**Key Learning**: Multiple AI entry points serve different user mental models and workflows.

---

## 6. Design Approach Template

### 6.1 Product Evaluation Framework

When evaluating any new product opportunity, apply this framework:

```
1. USER GOAL
   → What does the user want to achieve?
   → Can AI meaningfully accelerate this?

2. ENTRY POINT
   → Where does the AI interaction begin?
   → Chat, copilot, or agent?

3. VALUE DEMONSTRATION
   → How quickly can users see the AI working?
   → What is the "wow" moment?

4. TRUST BUILDING
   → How do we show the AI is reliable?
   → What feedback mechanisms exist?

5. SCALING PATTERN
   → Free → Paid upgrade path
   → Individual → Team expansion
```

### 6.2 Rapid Design Sprint Process

For the 60-day timeline, use this accelerated process:

**Day 1-2: Discovery**
- Competitor landing page teardown (5-10 examples)
- User flow mapping (3 primary use cases)
- Design system selection

**Day 3-5: Design**
- High-fidelity landing page mockup
- Core user flow wireframes
- Component specification

**Day 6-7: Validation**
- Internal review
- Quick user feedback (if possible)
- Handoff documentation

### 6.3 Checklist for Any Product

- [ ] Clear value proposition in < 5 words
- [ ] Interactive demo or clear visualization
- [ ] Social proof (logos, stats, testimonials)
- [ ] Friction-reducing copy ("no credit card", "free to start")
- [ ] Mobile-responsive design
- [ ] Accessible color contrast (WCAG 2.1 AA minimum)
- [ ] Loading states for AI operations
- [ ] Error handling with recovery paths
- [ ] Empty states with guidance
- [ ] Upgrade prompts that show value

---

## 7. Accessibility Considerations

### 7.1 AI Product-Specific A11y Requirements

| Feature | Requirement | Testing |
|---------|-------------|---------|
| **Streaming text** | Screen reader announcements | NVDA/VoiceOver test |
| **Chat history** | Keyboard navigation | Tab order validation |
| **AI suggestions** | Clear focus indicators | Focus visible check |
| **Loading states** | Announced to screen readers | Aria-live regions |
| **Error messages** | Clear, actionable, announced | Screen reader flow |

### 7.2 Design System Accessibility

- Color contrast: 4.5:1 minimum for text
- Focus states: Visible on all interactive elements
- Motion: Respect `prefers-reduced-motion`
- Touch targets: 44px minimum

---

## 8. Recommendations Summary

### Immediate Actions

1. **Adopt shadcn/ui + Tailwind** for rapid, accessible component development
2. **Prioritize demo-first landing pages** for all AI products
3. **Implement streaming UI patterns** for all LLM interactions
4. **Create template galleries** for faster user time-to-value
5. **Design for mobile-first** (60%+ of traffic on many products)

### Success Metrics to Track

- Time to first AI interaction
- Time to first value received
- Conversion rate from demo to signup
- Feature adoption rates
- Upgrade conversion rates

### Design Debt Warning Signs

- Inconsistent spacing or typography
- Missing loading states
- No empty state designs
- Copy-pasted components without systematization
- Accessibility gaps in core flows

---

## Next Steps

1. **Review with Product Executive** - Align on design direction
2. **Collaborate with Dev Agent** - Confirm technical feasibility of recommendations
3. **Create Component Library** - Build reusable components for rapid prototyping
4. **Establish Design Reviews** - Weekly check-ins as products move through phases

---

**Document Owner**: Design Agent (bo2026-design)  
**Last Updated**: February 11, 2026  
**Next Review**: As new products enter design phase
