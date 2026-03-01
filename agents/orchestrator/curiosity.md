---
title: Curiosity Prompts - LeadFlow Orchestrator
author: Stojan
date: 2026-02-23
tags: [curiosity, leadflow, real-estate]
project: leadflow-ai
---

# LeadFlow Orchestrator - Curiosity Prompts

## Daily Prompts (Real Estate Market)

### Market Intelligence
1. **What are agents complaining about today?**
   - Check Facebook real estate groups
   - Check Reddit r/realtors
   - Check agent forums
   - Opportunity: Their pain = our feature

2. **Which competitor just launched something?**
   - Verse.ai updates
   - Structurely changes
   - FUB new features
   - Threat or opportunity?

3. **What integration would make us sticky?**
   - Agents use what tools daily?
   - What would they hate to lose?
   - What makes switching hard?

## Weekly Prompts (Product)

### Pilot Feedback
1. **Are pilots happy with response quality?**
   - Response time <30 seconds?
   - AI sounds natural?
   - Leads converting?

2. **What feature would 10x conversion?**
   - Faster response?
   - Better AI?
   - More integrations?
   - Easier setup?

3. **What's the biggest friction in onboarding?**
   - FUB connection?
   - SMS setup?
   - AI training?
   - Dashboard confusing?

### Technical
1. **What's our weakest integration point?**
   - FUB webhook reliability?
   - Twilio delivery rate?
   - AI response latency?
   - Dashboard load time?

2. **What could break at scale?**
   - Rate limits?
   - Database performance?
   - AI token costs?
   - Webhook timeouts?

## Monthly Prompts (Template Improvements)

### Learnings to Share
1. **What have we learned about real estate AI?**
   - What prompts work best?
   - What agent types prefer?
   - What compliance matters?

2. **Which agent patterns worked best?**
   - Dev workflow?
   - Marketing approach?
   - QC process?

3. **What would we do differently?**
   - Architecture?
   - Integrations first?
   - Pilot selection?

### Proposals to Template
If compelling answers:
- Write: `proposals/template-improvement-{YYYY-MM-DD}-{n}.md`
- Focus: Real estate domain knowledge
- Share: What other projects should know

## LeadFlow-Specific Proposals

### Example 1: FUB Webhook Patterns
```markdown
## What We Learned
FUB webhook signature verification is critical.
Without it: Duplicate leads, missed events.
With it: Reliable lead flow.

## Recommendation
Add FUB webhook verification to template dev/SKILLS.md
```

### Example 2: SMS Compliance
```markdown
## What We Learned
TCPA opt-out language must be exact.
Variation: Legal risk.
Standard template: Safety.

## Recommendation
Add SMS compliance templates to qc/SKILLS.md
```

### Example 3: Real Estate Prompts
```markdown
## What We Learned
AI prompts need location awareness.
"What's your budget?" → Bad
"What's your budget for [location]?" → Good

## Recommendation
Add real estate prompt patterns to template
```

## Review Schedule

| Review Type | Frequency | Output |
|-------------|-----------|--------|
| Market pulse | Daily | Notes on opportunities |
| Pilot health | Weekly | Status + blockers |
| Template learnings | Monthly | Proposals to template |

---

*Curiosity drives product-market fit*
