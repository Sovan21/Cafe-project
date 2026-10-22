# Design System

**Project:** Demo Café Website & Real-Time Table Booking  
**Design direction:** Warm, modern, welcoming cafe; simple enough for a small business and polished on mobile.

## 0. Styling implementation constraint

This project uses Tailwind CSS v4.x with Next.js, not Vite. Check `package.json`/lockfile for the exact installed version. Prefer the existing CSS-first Tailwind v4 setup; the standard Next.js integration uses `@tailwindcss/postcss` and a global stylesheet containing `@import "tailwindcss"`. Do not copy Tailwind v3 directives or use `@tailwindcss/vite`. Preserve the current Next.js router and stylesheet paths. Official reference: https://tailwindcss.com/docs/installation/framework-guides/nextjs

## 1. Design principles

- Mobile-first: booking is a primary action and must be easy to complete on a phone.
- Warm and editorial: cafe photography, generous whitespace, strong typography, restrained colors.
- Clarity before decoration: dates, times, seat counts, status, and booking summaries must be easy to scan.
- Consistency: reuse a defined set of tokens and UI patterns.
- Accessibility: readable contrast, keyboard support, visible focus, and status labels that do not rely on color alone.
- Performance: optimize image/video sizes and avoid heavy animation that delays the booking flow.

## 2. Brand placeholders

- Temporary display name: **Demo Café**. Do not invent a real business identity.
- Temporary logo: text wordmark or simple icon; owner can replace later.
- All address, landmark, phone, images, menu items, and prices must be labelled/treated as demo data.
- Do not display bar/alcohol offerings in the prototype unless specifically approved and legally appropriate.

## 3. Color tokens

Use CSS variables or the existing styling-token system. Do not hard-code new colors throughout components.

| Token | Hex | Usage |
|---|---|---|
| `--color-espresso` | `#2D211A` | Main text, headings, dark surfaces |
| `--color-cream` | `#FAF6F0` | Main page background |
| `--color-surface` | `#FFFFFF` | Cards, inputs, menus |
| `--color-caramel` | `#A85D2A` | Accent links and emphasis; verify contrast before using for small text |
| `--color-sage` | `#536B4E` | Positive/available accents where contrast passes |
| `--color-border` | `#E5DCD2` | Dividers and card borders |
| `--color-muted` | `#6B625B` | Secondary text |
| `--color-success` | `#216E4A` | Available/confirmed states with text label |
| `--color-warning` | `#8A5700` | Partially available/pending states with text label |
| `--color-danger` | `#B42318` | Validation errors, unavailable/cancelled states |

Use espresso text on cream/surface backgrounds for body copy. Check WCAG contrast for any text/background pairing before release. Color is never the only signal for availability.

## 4. Typography

- Body: system sans-serif stack or the font already bundled in the project.
- Headings: a restrained serif or the existing display font if one is already installed; do not introduce an external font dependency without a reason.
- Use a clear type scale: page title, section heading, card title, body, helper/caption text.
- Keep body text comfortably readable on mobile. Avoid all-caps for long labels.

## 5. Layout and spacing

- Use a consistent spacing scale (for example 4, 8, 12, 16, 24, 32, 48, 64 px).
- Main content max width around 1120–1200 px on large screens.
- Mobile gutters around 16–20 px; increase gutters on tablet/desktop.
- Cards use consistent border radius, border, padding, and shadows (subtle, not excessive).
- Forms stack vertically on narrow screens. On desktop, use columns only when they improve scanning.

## 6. Public single-page website sections

1. **Header/navigation:** wordmark, Menu, Gallery, Location, and a prominent “Book a Table” action. Collapse sensibly on mobile.
2. **Hero:** one strong cafe image or placeholder, short headline, short supporting text, primary booking CTA.
3. **About:** brief introduction with demo label until the real story is supplied.
4. **Menu highlights:** category tabs or sections; item name, short description, price in INR, optional image. Do not make a large menu hard to scan on phones.
5. **Gallery:** responsive image grid and accessible video playback controls.
6. **Live availability / booking:** date, start time, duration, guests, desired table count/auto-select, available tables and free-seat counts, customer details, booking summary, final submit.
7. **Location/contact:** placeholder address, landmark, click-to-call, WhatsApp chat link, and map link.
8. **Footer:** cafe details and “Demo content” note while in prototype mode.

## 7. Booking interaction design

- Use a guided but compact flow; preserve selected date/time if the user changes guest count.
- Show cafe timezone or local time clearly if ambiguity is possible.
- Before submit, show a summary of party size, duration, selected/requested tables, estimated seating allocation, and booking time.
- In `shared_seating` mode, clearly label the count as “seats available” and mark a partially occupied table. Do not imply a private table reservation if other parties can share it.
- In `exclusive_table` mode, a table with any overlapping active reservation is unavailable for the overlapping interval, even if physical chairs remain empty.
- Availability is provisional until server confirmation. If another booking wins the race, keep form details and show updated choices rather than a generic crash.
- Provide a visible realtime state such as “Live availability” and a stale/reconnecting state if the subscription drops.
- On success show booking reference. On email failure say that the booking was created but the notification could not be sent; do not show a false email-success message.

## 8. Table status vocabulary

Use text labels and icons, not color alone:
- **Available:** all capacity is available for the selected window.
- **Partially available:** some seats remain in shared-seating mode.
- **Booked / unavailable:** no bookable capacity for the selected window.
- **Out of service:** owner temporarily disabled the table.
- **Past / closed:** the chosen window is outside valid business hours.

Always show the selected time window next to availability so customers do not mistake it for an all-day status.

## 9. Admin dashboard

- Sidebar or compact top navigation for Overview, Bookings, Tables & Chairs, Menu, Cafe Settings, and Notification Logs.
- Dashboard cards: total active tables, total physical chairs, selected-window seats remaining, and upcoming reservations.
- Inventory view: table code, chair capacity, active/out-of-service state, overlapping guests/seats, remaining seats for the selected time window.
- Booking list with date/time, duration, guest count, table assignment, status, and email notification status.
- Use confirmation dialogs for cancellation and changes that could affect future bookings.
- Keep owner email and customer contact details inside the authenticated admin area only.

## 10. Reusable components

Suggested components (follow existing project patterns):
- `Button`, `Input`, `Select`, `DateTimeFields`, `DurationSelect`
- `SectionHeading`, `MenuItemCard`, `GalleryGrid`
- `AvailabilitySummary`, `TableAvailabilityCard`, `SeatCountBadge`
- `BookingForm`, `BookingSummary`, `BookingConfirmation`
- `AdminStatCard`, `BookingTable`, `InventoryTableEditor`, `NotificationStatus`
- `LoadingState`, `EmptyState`, `ErrorState`, `Toast/Alert`

## 11. Responsive and accessibility checklist

- No horizontal scrolling at 320 px viewport width.
- Form fields have visible labels and useful validation text.
- Buttons and interactive cards are keyboard accessible with visible focus.
- Modal/dialog focus is managed and Escape behavior is deliberate.
- Status is announced accessibly when booking or availability changes.
- Images include useful alt text; decorative images have empty alt text.
- Video has controls and does not autoplay audio.
- Respect reduced-motion preferences.
