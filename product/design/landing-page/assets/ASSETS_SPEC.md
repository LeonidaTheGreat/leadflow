# Assets Specification — LeadFlow AI Landing Page

**Document ID:** DES-LAND-ASSETS-001  
**Version:** 1.0  
**Date:** March 2, 2026

---

## Logo Assets

### Primary Logo

**Filename:** `leadflow-logo.svg`  
**Format:** SVG (vector)  
**Dimensions:** Scalable, reference 200×40px  
**Colors:** 
- Icon: #6366f1 (Indigo)
- Text: #111827 (Dark gray)

**Variants Needed:**
1. `leadflow-logo.svg` - Full color, horizontal
2. `leadflow-logo-white.svg` - White version (for dark backgrounds)
3. `leadflow-logo-icon.svg` - Icon only (for favicon, mobile)

**Usage:**
- Navigation: 32px height
- Hero section: 40px height
- Footer: 28px height

---

## Icons

### Heroicons v2 (Recommended)

**Library:** https://heroicons.com/  
**License:** MIT (free to use)  
**Format:** SVG

**Required Icons:**

**Navigation & Actions:**
- `ChevronRightIcon` (outline) - CTA arrows
- `Bars3Icon` (outline) - Mobile menu
- `XMarkIcon` (outline) - Close menu

**Features:**
- `BoltIcon` (outline) - Instant Response
- `CheckBadgeIcon` (outline) - Smart Qualification
- `CalendarIcon` (outline) - Auto-Booking
- `ArrowPathIcon` (outline) - Follow-Up

**General:**
- `CheckIcon` (solid) - Checkmarks in lists
- `CheckCircleIcon` (solid) - Success state
- `ExclamationCircleIcon` (solid) - Error state

**Size Guide:**
- Small: 16px (inline text)
- Base: 20px (buttons, bullets)
- Medium: 24px (feature cards)
- Large: 32px (hero features)
- XL: 48px (section features)

**Color:**
- Primary: #6366f1 (Indigo)
- Success: #10b981 (Green)
- Error: #ef4444 (Red)
- Neutral: Inherit from parent

---

## Images

### Hero Image (Dashboard Screenshot)

**Filename:** `hero-dashboard.png` (and `.webp`)  
**Dimensions:** 1800×1013px (16:9 aspect ratio)  
**Format:** 
- WebP (primary): ~200KB
- PNG (fallback): ~500KB

**Content:**
- LeadFlow AI dashboard screenshot
- Show: Lead list, conversation thread, stats
- No sensitive/real data
- High-quality UI (retina-ready)

**Treatment:**
- Border-radius: 16px
- Box-shadow: 0 20px 25px rgba(0,0,0,0.1)
- Subtle glow effect (optional)

**Responsive Sizes:**
```
hero-dashboard-mobile.webp:  750×422px  (~100KB)
hero-dashboard-tablet.webp:  1200×675px (~150KB)
hero-dashboard-desktop.webp: 1800×1013px (~200KB)
```

---

### Feature Images (4 needed)

**1. Instant Response Feature**
- **Filename:** `feature-instant-response.png`
- **Dimensions:** 800×600px (4:3 aspect ratio)
- **Content:** SMS conversation thread showing instant response
- **Treatment:** Phone mockup or messaging interface

**2. Smart Qualification Feature**
- **Filename:** `feature-qualification.png`
- **Dimensions:** 800×600px
- **Content:** Lead qualification form or AI analysis

**3. Auto-Booking Feature**
- **Filename:** `feature-booking.png`
- **Dimensions:** 800×600px
- **Content:** Calendar interface with booked appointments

**4. Follow-Up Feature**
- **Filename:** `feature-follow-up.png`
- **Dimensions:** 800×600px
- **Content:** Automated sequence visualization

**Format:** WebP + PNG fallback  
**Optimization:** ~100KB per image

---

### Background Images

**Gradient Backgrounds (CSS):**
```css
/* Hero gradient */
background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);

/* Dark section gradient */
background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
```

**Pattern/Texture (Optional):**
- **Filename:** `bg-pattern.svg`
- **Type:** Subtle grid or dots
- **Opacity:** 0.05 (very subtle)
- **Color:** White or black
- **Size:** Tile-able (500×500px)

---

## Favicon Package

### Standard Favicons

**Sizes Needed:**
- `favicon.ico` - 16×16, 32×32, 48×48 (multi-size ICO)
- `favicon-16x16.png` - 16×16
- `favicon-32x32.png` - 32×32
- `apple-touch-icon.png` - 180×180
- `android-chrome-192x192.png` - 192×192
- `android-chrome-512x512.png` - 512×512

**Source:**
- Use LeadFlow logo icon (⚡ symbol)
- Background: #6366f1 (Indigo)
- Icon: #ffffff (White)
- Border-radius: 25% (rounded square)

**Generator:** Use https://realfavicongenerator.net/

---

## Social Media Assets

### Open Graph Images

**Filename:** `og-image.png`  
**Dimensions:** 1200×630px  
**Format:** PNG or JPEG (< 1MB)

**Content:**
- LeadFlow AI logo
- Headline: "AI That Responds to Leads in 30 Seconds"
- Visual: Dashboard screenshot or illustration
- Background: Brand gradient

**Meta Tags:**
```html
<meta property="og:image" content="/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### Twitter Card

**Filename:** `twitter-card.png`  
**Dimensions:** 1200×600px  
**Format:** PNG or JPEG

**Meta Tags:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="/twitter-card.png" />
```

---

## Illustrations (Optional)

### Custom Illustrations vs. Stock

**Option 1: Custom (Recommended)**
- Commission from designer/illustrator
- Match brand style (modern, clean, tech-forward)
- Cost: $200-500 per illustration

**Option 2: Stock (Budget Option)**
- **Source:** undraw.co (free, customizable)
- **Style:** Line art, flat design
- **Color:** Customize to #6366f1 (Indigo)

**Needed Illustrations:**
1. Real estate agent showing house (hero alternative)
2. SMS conversation on phone (features)
3. Calendar with appointments (features)
4. Happy customer with thumbs up (social proof)

---

## Animation Assets

### Lottie Animations (Optional)

**Use Cases:**
- Loading spinner
- Success checkmark animation
- Feature demonstrations

**Source:** https://lottiefiles.com/  
**Format:** JSON (Lottie)  
**Implementation:** lottie-web library

**Recommended:**
- `loading-spinner.json` - 40×40px
- `success-checkmark.json` - 64×64px
- `sending-message.json` - 120×120px

---

## Font Files

### Inter Font (Variable)

**Source:** https://fonts.google.com/specimen/Inter  
**Format:** WOFF2 (primary), WOFF (fallback)

**Weights Needed:**
- 400 (Regular) - Body text
- 500 (Medium) - Emphasis
- 600 (Semi-bold) - Subheadings, buttons
- 700 (Bold) - Headings
- 800 (Extra-bold) - Hero headline

**Loading:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Or self-host:**
```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/fonts/inter-variable.woff2') format('woff2');
}
```

---

## Asset Optimization

### Images

**Compression Tools:**
- **Squoosh:** https://squoosh.app/ (WebP conversion)
- **TinyPNG:** https://tinypng.com/ (PNG/JPEG compression)
- **ImageOptim:** https://imageoptim.com/ (batch processing)

**Target Sizes:**
- Hero image: < 200KB
- Feature images: < 100KB each
- Icons: < 5KB each
- Total page images: < 1MB

### Formats

**Use WebP with fallbacks:**
```html
<picture>
  <source srcset="hero-dashboard.webp" type="image/webp">
  <img src="hero-dashboard.png" alt="LeadFlow AI Dashboard">
</picture>
```

### Lazy Loading

**Below-the-fold images:**
```html
<img 
  src="feature-1.webp" 
  loading="lazy" 
  alt="Instant Response Feature"
>
```

---

## CDN Structure

### Recommended CDN Organization

```
/images/
  /hero/
    hero-dashboard.webp
    hero-dashboard.png
    hero-dashboard-mobile.webp
  /features/
    feature-instant-response.webp
    feature-qualification.webp
    feature-booking.webp
    feature-follow-up.webp
  /social/
    og-image.png
    twitter-card.png

/icons/
  leadflow-logo.svg
  leadflow-logo-white.svg
  leadflow-logo-icon.svg

/fonts/
  inter-variable.woff2
  inter-variable.woff

/favicons/
  favicon.ico
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png
  android-chrome-192x192.png
  android-chrome-512x512.png
```

---

## Placeholder Content

### During Development

**Images:**
- **Hero:** https://via.placeholder.com/1800x1013/6366f1/ffffff?text=Dashboard
- **Features:** https://via.placeholder.com/800x600/f3f4f6/6b7280?text=Feature

**Or use:**
- **Unsplash:** https://source.unsplash.com/1800x1013/?real-estate,technology
- **Lorem Picsum:** https://picsum.photos/1800/1013

---

## Asset Checklist

### Pre-Launch

**Required:**
- [ ] Logo SVG (3 variants)
- [ ] Hero dashboard screenshot (optimized)
- [ ] Favicon package (all sizes)
- [ ] Open Graph image
- [ ] Twitter Card image

**Recommended:**
- [ ] 4 feature images
- [ ] Custom illustrations
- [ ] Heroicons integrated
- [ ] Self-hosted fonts

**Optional:**
- [ ] Lottie animations
- [ ] Background patterns
- [ ] Video demo

---

## Asset Delivery

### For Developers

**Package Structure:**
```
assets/
├── README.md (this file)
├── images/
│   ├── hero/
│   ├── features/
│   └── social/
├── icons/
├── fonts/
└── favicons/
```

**Delivery Method:**
- ZIP file or
- Google Drive folder or
- Git LFS (Large File Storage)

---

**Assets Status:** Specifications complete  
**Next Step:** Asset creation/sourcing  
**Estimated Time:** 2-3 days (with designer)
