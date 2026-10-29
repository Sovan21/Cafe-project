# Design System

**Project:** L'Aura Cafe & Artisanal Roastery  
**Design Direction:** Ultra-premium, editorial dark luxury aesthetic. Warm, moody espresso tones, glowing amber/gold accents, Neumorphic glassmorphism, and artisanal coffeehouse elegance. Highly polished across mobile, tablet, and desktop viewports.

---

## 1. Visual Aesthetics & Design Philosophy

- **Dark Luxury Atmosphere**: Atmospheric dark roasted espresso backgrounds (`#140e0a` on public site, `#1c140f` in admin portal) evoke the intimate, moody ambiance of an ultra-premium European roastery. The public site base `#140e0a` is carefully calibrated to be just a breath softer than pitch black (`#110b08`) to preserve dramatic contrast while preventing stark ocular glare.
- **Warm Radiant Accents**: Radiant gold and burnished amber highlights (`#d4af37`, `#e5b869`, `#f59e0b`) draw attention to primary actions, interactive controls, and availability badges.
- **Neumorphism & Glassmorphism**: Multi-layered depth achieved through soft inner highlights, dual ambient drop shadows, and subtle glass borders (`rgba(212, 175, 55, 0.15)`).
- **Rich Editorial Photography**: High-resolution imagery of handcrafted espresso beverages, pour-over drippers, flaky artisanal pastries, and ambient seating.
- **Dedicated Table Exclusivity**: 100% private dining. Shared seating between strangers is completely eliminated.
- **Micro-Animations & Delighters**: Floating steam effects, subtle hover elevations, smooth modal transitions, analog clock dial interactions, and celebratory confetti bursts on booking confirmation.

---

## 2. Core Color Palette & Design Tokens

| Token | Hex / Value | Description & Purpose |
|---|---|---|
| `--color-bg-base` | `#140e0a` | Deep Espresso Obsidian — Main public site background |
| `--color-bg-admin` | `#1c140f` | Warm Velvet Mocha — Admin management workspace background |
| `--color-surface-card` | `#201610` | Tactile Dark Bean — Public card surfaces and interactive tiles |
| `--color-surface-elevated`| `#1a120c` | Elevated surfaces, raised panels, and modal containers |
| `--color-gold-accent` | `#d4af37` | Burnished Gold — Brand highlights, active tabs, CTA buttons |
| `--color-gold-light` | `#e5b869` | Warm Honey Gold — Hover states and glowing accents |
| `--color-cream-text` | `#faf6f0` | Warm Ivory Cream — Headings and primary text |
| `--color-caramel-muted` | `#d1c7bd` | Soft Latte Cream — Body copy and helper text |
| `--color-cafe-muted` | `#8c827a` | Muted Ash — Secondary labels, timestamps, table IDs |
| `--color-border-glass` | `rgba(212, 175, 55, 0.15)` | Subtle gold-tinted translucent border for glass cards |
| `--color-success` | `#10b981` | Emerald Green — Available tables, confirmed reservations |
| `--color-danger` | `#f43f5e` | Rose Crimson — Reserved tables, error alerts, cancellations |
| `--color-warning` | `#f59e0b` | Warm Amber — Notice banners, grace period reminders |

---

## 3. Typography Hierarchy

The typography pairs an editorial high-fashion serif with a clean, highly legible geometric sans-serif:

- **Display Headings (`font-display`)**: `Playfair Display`, serif. Used for hero headlines, section titles, table names, and brand wordmarks.
- **Body & Controls (`font-sans`)**: `Plus Jakarta Sans` / `Inter`, sans-serif. Used for body paragraphs, buttons, form inputs, navigation items, and modal text.
- **Data & Timestamps (`font-mono`)**: JetBrains Mono / System Monospace. Used for booking references (`BK-XXXX-XXXX`), 12h/24h time intervals, and table ID badges (`T01`, `T02`).

### Type Scale
- **Hero Title**: `text-4xl sm:text-6xl lg:text-7xl font-bold font-display text-[#faf6f0] tracking-tight`
- **Section Headings**: `text-2xl sm:text-4xl lg:text-5xl font-bold font-display text-[#faf6f0]`
- **Card Titles**: `text-lg sm:text-xl font-bold font-display text-[#faf6f0]`
- **Body Text**: `text-sm sm:text-base text-cafe-200 font-normal leading-relaxed`
- **Captions & Metadata**: `text-xs sm:text-sm text-cafe-400 font-mono`

---

## 4. Custom Styling Classes & Utilities

Defined in `src/app/globals.css` using Tailwind CSS v4.3.3:

```css
/* Glassmorphic Neumorphic Card */
.glass-card {
  background: rgba(26, 18, 12, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 175, 55, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Elevated Neumorphic Surface */
.neu-raised {
  background: linear-gradient(145deg, #1f150e, #160e09);
  box-shadow: 6px 6px 16px #0b0705, -6px -6px 16px #271b13;
}

/* Inset Neumorphic Container (Inputs & Filter Trays) */
.neu-inset {
  background: #140d09;
  box-shadow: inset 4px 4px 10px #090503, inset -4px -4px 10px #21150f;
}

/* Gold Gradient Action Button */
.btn-gold {
  background: linear-gradient(135deg, #d4af37 0%, #b89025 100%);
  color: #110b08;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.35);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-gold:hover {
  background: linear-gradient(135deg, #e5b869 0%, #c49a2a 100%);
  box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
  transform: translateY(-1px);
}
```

---

## 5. Website Structure & Public Sections

1. **Sticky Header & Brand Navigation**:
   - Brand Wordmark: "L'Aura Cafe & Artisanal Roastery" with steam logo.
   - Navigation links: Menu, Experience, Tables, Location, Admin.
   - Primary Header CTA: Gold "Book a Table" button that smoothly scrolls to the reservation section.
   - Mobile Hamburger Menu: Accessible full-screen overlay with blur and touch-optimized navigation links.
   - Live Sync Indicator: Real-time badge showing Supabase connection and multi-tab synchronization status.

2. **Hero Section**:
   - Atmospheric high-res background photography with rich vignette gradients.
   - Compelling artisanal headline: "Where Artisanal Roast Meets Timeless Ambience".
   - Dual Call-to-Actions: "Reserve a Table" (gold primary) and "Explore Our Roastery" (glass secondary).
   - Quick Highlights: Single-origin espresso, daily handcrafted pastries, and guaranteed private seating.

3. **Menu Highlights**:
   - Category filtering: Artisanal Coffee, Special Brews, Fresh Bakery, Gourmet Bites.
   - High-resolution dish photos, descriptions, and INR prices.
   - Dietary tags (Vegetarian, Vegan, Gluten-Free).

4. **Live Table Availability & Map**:
   - **Filter Bar**: Date picker (Today/Tomorrow quick toggles), Custom Time Picker, Party Size selector (1 to 12 guests), and Duration selector (30 to 180 mins).
   - **Table Cards**: Display table name, chair capacity, shape, ambient description, and live status.
   - **Visual Chair Indicator**: Circular chair representation showing total capacity in green (free) or orange (occupied).
   - **Dedicated Table Policy**: No shared seating. Overlapping bookings make the entire table reserved.

5. **Booking Experience Modal**:
   - Triggered when clicking "Reserve Table" on any available table card.
   - Form fields: Customer Full Name, Email Address, Contact Phone, Special Requests.
   - Custom Clock Picker: Analog dial and digital input with 15-minute quick steps.
   - Interactive Summary: Date, time interval, duration, table code, and guest count.
   - Confirmation Screen: Animated checkmark, booking reference code (`BK-XXXX-XXXX`), confetti burst, and email delivery status.

6. **Location & Roastery Hours**:
   - Physical address: 42 Roastery Lane, Indiranagar, Bengaluru.
   - Clickable `tel:` and `mailto:` links with accessible labels.
   - Interactive Google Map link and WhatsApp chat integration.
   - Dynamic operating hours display.

7. **Footer**:
   - Dynamic copyright year (`new Date().getFullYear()`).
   - Social media links (Instagram, Facebook).
   - Direct link to Admin Portal.

---

## 6. Table Status & Seating Vocabulary

All availability states are communicated via text, icons, and contrast-compliant colors:

- **Available** (`#10b981`, Emerald): Table is 100% available for the selected time window.
- **Reserved** (`#f43f5e`, Rose): Table is booked by another party during the requested time window. Displays reservation time range (e.g. `Reserved: 6:00 PM to 7:30 PM`).
- **Inactive / Maintenance** (`#737373`, Neutral): Table is temporarily out of service for routine maintenance or sanitation.
- **Capacity Mismatch** (`#f43f5e`, Rose): Table capacity is smaller than the requested guest party size.

---

## 7. Responsive Design & Accessibility (a11y) Standards

- **Zero Horizontal Scrolling**: Maximum content containers with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` and responsive flex/grid wrappers prevent horizontal overflow at all screen sizes down to 320px.
- **Accessible Touch Targets**: All buttons, navigation links, and inputs maintain a minimum touch target size of 44x44px.
- **Contrast Ratios**: All text pairings meet WCAG AA standards (minimum 4.5:1 for body copy and 3:1 for large display text).
- **Keyboard Navigation**: Visible focus rings (`focus-visible:ring-2 focus-visible:ring-gold-accent`) on all interactive controls.
- **Accessible Modals**: Keyboard `Escape` listener, background click dismissal, scroll locking on `body`, and proper `aria-modal="true"`.
