# Pricing Card Component Specification

## Component: PricingCard

### Props Interface

```typescript
interface PricingCardProps {
  tier: {
    id: string;           // 'starter' | 'pro' | 'team' | 'brokerage'
    name: string;         // Display name
    description: string;  // Short tagline
    monthlyPrice: number; // e.g., 49
    annualPrice: number;  // e.g., 470 (49 * 0.8 * 12)
  };
  features: {
    category: string;
    items: {
      label: string;
      included: boolean | string; // true/false or "100/mo" etc.
    }[];
  }[];
  cta: {
    text: string;
    href: string;
    variant: 'primary' | 'secondary' | 'outline';
  };
  isFeatured?: boolean;   // Pro tier gets highlight
  isEnterprise?: boolean; // Brokerage gets dark theme
  billingInterval: 'monthly' | 'annual';
}
```

### Visual States

#### 1. Standard Card (Starter, Team)

**Container:**
```
className="
  relative flex flex-col
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  rounded-2xl
  p-6 md:p-8
  shadow-sm
  hover:shadow-md hover:border-slate-300
  transition-all duration-200
"
```

**Structure:**
```
<PricingCard>
  ├─ Header
  │   ├─ Tier Name (text-xl font-semibold)
  │   └─ Description (text-sm text-slate-500)
  ├─ Price Block
  │   ├─ Currency ($)
  │   ├─ Amount (text-4xl font-bold)
 │   ├─ Interval (/month)
  │   └─ Billing note (Billed monthly/annually)
  ├─ Feature List
  │   └─ FeatureItem[]
  │       ├─ Icon (check/x)
  │       └─ Label
  └─ CTA Button
```

#### 2. Featured Card (Pro Tier)

**Container:**
```
className="
  relative flex flex-col
  bg-gradient-to-b from-emerald-50/50 to-white
  dark:from-emerald-900/20 dark:to-slate-800
  border-2 border-emerald-500
  rounded-2xl
  p-6 md:p-8
  shadow-lg shadow-emerald-500/10
  hover:shadow-xl hover:shadow-emerald-500/20
  transform hover:-translate-y-1
  transition-all duration-200
"
```

**Badge:**
```
className="
  absolute -top-3 left-1/2 -translate-x-1/2
  px-3 py-1
  bg-emerald-500
  text-white text-xs font-semibold
  rounded-full
"
```

#### 3. Enterprise Card (Brokerage)

**Container:**
```
className="
  relative flex flex-col
  bg-slate-900
  border border-slate-700
  rounded-2xl
  p-6 md:p-8
  shadow-lg
  hover:bg-slate-800
  transition-colors duration-200
"
```

**Text Colors:**
- Tier name: `text-white`
- Description: `text-slate-400`
- Price: `text-white`
- Features: `text-slate-300`

**CTA:**
```
className="
  w-full py-3 px-4
  border-2 border-emerald-500
  text-emerald-500 font-semibold
  rounded-lg
  hover:bg-emerald-500 hover:text-white
  transition-colors
"
```

### Feature List Item

**Included Feature:**
```
className="flex items-center gap-3"
├─ <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" />
└─ <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
```

**Excluded Feature:**
```
className="flex items-center gap-3"
├─ <XIcon className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
└─ <span className="text-sm text-slate-400 dark:text-slate-500">{label}</span>
```

**Numeric Feature:**
```
className="flex items-center gap-3"
├─ <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" />
└─ <span className="text-sm text-slate-600 dark:text-slate-300">{value} {label}</span>
// e.g., "100 SMS/month"
```

### Price Display

```typescript
function PriceDisplay({ 
  monthlyPrice, 
  annualPrice, 
  interval 
}: PriceProps) {
  const price = interval === 'monthly' ? monthlyPrice : Math.round(annualPrice / 12);
  const fullPrice = interval === 'monthly' ? monthlyPrice : annualPrice;
  
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
          ${price}
        </span>
        <span className="text-lg text-slate-500">/month</span>
      </div>
      {interval === 'annual' && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Billed ${fullPrice}/year (save 20%)
        </p>
      )}
    </div>
  );
}
```

### Billing Toggle Component

```typescript
function BillingToggle({ 
  interval, 
  onChange 
}: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          "px-6 py-2 rounded-md font-medium transition-all",
          interval === 'monthly'
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('annual')}
        className={cn(
          "px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2",
          interval === 'annual'
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        Annual
        <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
          Save 20%
        </span>
      </button>
    </div>
  );
}
```

### Data Structure

```typescript
const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for testing or solo agents',
    monthlyPrice: 49,
    annualPrice: 470, // 49 * 0.8 * 12
    cta: { text: 'Get Started', href: '/signup?plan=starter', variant: 'secondary' },
    isFeatured: false,
    features: [
      { label: 'SMS Messages', value: '100/month', included: true },
      { label: 'AI Lead Response', included: true },
      { label: 'Dashboard Access', included: true },
      { label: 'FUB Integration', included: true },
      { label: 'Basic Analytics', included: true },
      { label: 'Standard Support', included: true },
      { label: 'Full AI Context', included: false },
      { label: 'Cal.com Booking', included: false },
      { label: 'Priority Support', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Best for serious solo agents',
    monthlyPrice: 149,
    annualPrice: 1430, // 149 * 0.8 * 12
    cta: { text: 'Start Free Trial', href: '/signup?plan=pro', variant: 'primary' },
    isFeatured: true,
    features: [
      { label: 'SMS Messages', value: 'Unlimited', included: true },
      { label: 'AI Lead Response', included: true },
      { label: 'Dashboard Access', included: true },
      { label: 'FUB Integration', included: true },
      { label: 'Full AI with Context', included: true },
      { label: 'Cal.com Integration', included: true },
      { label: 'Auto-Booking', included: true },
      { label: 'Advanced Analytics', included: true },
      { label: 'Priority Support', included: true },
    ]
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For small teams (2-5 agents)',
    monthlyPrice: 399,
    annualPrice: 3830, // 399 * 0.8 * 12
    cta: { text: 'Start Free Trial', href: '/signup?plan=team', variant: 'primary' },
    isFeatured: false,
    features: [
      { label: 'Agents Included', value: '5', included: true },
      { label: 'Unlimited SMS', included: true },
      { label: 'Team Dashboard', included: true },
      { label: 'Lead Routing', included: true },
      { label: 'Full AI Features', included: true },
      { label: 'Cal.com Integration', included: true },
      { label: 'Advanced Analytics', included: true },
      { label: 'Priority Support', included: true },
      { label: 'Custom AI Training', included: true },
    ]
  },
  {
    id: 'brokerage',
    name: 'Brokerage',
    description: 'For growing brokerages',
    monthlyPrice: 999,
    annualPrice: 9590, // Base calculation, actual is custom
    cta: { text: 'Contact Sales', href: 'mailto:sales@leadflow.ai', variant: 'outline' },
    isFeatured: false,
    isEnterprise: true,
    features: [
      { label: 'Agents Included', value: '20+', included: true },
      { label: 'Everything in Team', included: true },
      { label: 'White-Label Options', included: true },
      { label: 'Admin Dashboard', included: true },
      { label: 'Compliance Reporting', included: true },
      { label: 'Custom Integrations', included: true },
      { label: 'Dedicated Account Manager', included: true },
      { label: 'SLA Guarantee', value: '99.9%', included: true },
      { label: 'Custom Pricing', value: 'Available', included: true },
    ]
  },
];
```

### Usage Example

```tsx
// PricingSection.tsx
export function PricingSection() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  
  return (
    <section className="py-20 md:py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Start free. Scale when you're ready.
          </p>
          <div className="mt-6">
            <BillingToggle interval={interval} onChange={setInterval} />
          </div>
        </div>
        
        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              features={tier.features}
              cta={tier.cta}
              isFeatured={tier.isFeatured}
              isEnterprise={tier.isEnterprise}
              billingInterval={interval}
            />
          ))}
        </div>
        
        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-500" />
            14-day free trial
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-500" />
            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}
```

### Responsive Breakpoints

```css
/* Mobile: 1 column */
@media (max-width: 767px) {
  .pricing-grid { grid-template-columns: 1fr; }
  .pricing-card { max-width: 400px; margin: 0 auto; }
  .price-amount { font-size: 2.25rem; } /* text-4xl */
}

/* Tablet: 2x2 grid */
@media (min-width: 768px) and (max-width: 1023px) {
  .pricing-grid { grid-template-columns: repeat(2, 1fr); }
  .price-amount { font-size: 2.5rem; }
}

/* Desktop: 4 columns */
@media (min-width: 1024px) {
  .pricing-grid { grid-template-columns: repeat(4, 1fr); }
  .price-amount { font-size: 3rem; } /* text-5xl */
}
```

### Animation Specs

**Card Entrance:**
```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pricing-card {
  animation: card-enter 0.4s ease-out forwards;
  animation-delay: calc(var(--index) * 100ms);
}
```

**Price Transition:**
```css
.price-amount {
  transition: opacity 200ms ease, transform 200ms ease;
}

.price-updating {
  opacity: 0;
  transform: translateY(-10px);
}
```

### Accessibility

```tsx
// ARIA labels and roles
<article 
  aria-labelledby={`${tier.id}-heading`}
  className="pricing-card"
>
  <h3 id={`${tier.id}-heading`} className="sr-only">
    {tier.name} plan at ${price} per month
  </h3>
  
  <ul aria-label={`${tier.name} plan features`}>
    {features.map((feature) => (
      <li key={feature.label}>
        <span aria-label={feature.included ? 'Included' : 'Not included'}>
          {feature.included ? '✓' : '—'}
        </span>
        {feature.label}
      </li>
    ))}
  </ul>
  
  <Button
    aria-label={`${tier.cta.text} with ${tier.name} plan`}
    onClick={handleCtaClick}
  >
    {tier.cta.text}
  </Button>
</article>
```

---

**End of Component Specification**
