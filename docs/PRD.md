# Product Requirements Document (PRD)

**Project:** L'Aura Cafe & Artisanal Roastery  
**Version:** 2.0 (Production Release)  
**Status:** Implemented & Verified  
**Primary Goal:** Deliver an ultra-premium, mobile-first artisanal cafe web application with real-time table availability, 100% dedicated table reservations, secure customer and owner email notifications, and an authenticated admin management dashboard.

---

## 1. Product Overview

L'Aura Cafe & Artisanal Roastery is a high-end coffeehouse and roastery website featuring an interactive real-time table reservation system. The platform pairs a warm, luxurious dark aesthetic with an automated availability engine, custom analog/digital clock picker, instant booking confirmation, and an administrative control panel.

All reservations strictly enforce a **Dedicated Table Policy**—every booking guarantees 100% private dining for the party. Shared seating between strangers is completely eliminated.

---

## 2. Core User Personas

### 2.1 The Customer (Diner & Coffee Enthusiast)
- Browses artisanal roasts, gourmet food items, and ambient cafe photography.
- Selects a target date, arrival time, party size, and visit duration.
- Views instant table availability with visual chair indicators.
- Selects an available table, enters contact details, and submits the reservation.
- Receives immediate on-screen confirmation with a unique booking reference (`BK-XXXX-XXXX`), confetti celebration, and an automated email confirmation.

### 2.2 The Cafe Owner / Manager (Admin)
- Accesses a protected admin portal via secure email/password authentication.
- Monitors live occupancy, upcoming bookings, and historical reservation records.
- Adds, edits, or marks physical tables as inactive/under maintenance.
- Creates manual phone/walk-in bookings with instant conflict checks.
- Cancels bookings or updates customer statuses (`confirmed`, `cancelled`, `completed`).
- Configures cafe operating hours, cleaning buffers, contact info, and notification settings.
- Inspects transactional email delivery audit logs (`email_logs`).

---

## 3. Scope of Features & Requirements

### 3.1 Public Experience & Landing Page
- **Hero & Roastery Showcase**: High-resolution atmospheric photography, artisanal roastery introduction, and quick call-to-action buttons.
- **Interactive Menu Highlights**: Categorized dishes (Artisanal Coffee, Special Brews, Fresh Bakery, Gourmet Bites) with pricing in INR (₹) and dietary tags.
- **Atmospheric Photo Gallery**: High-resolution gallery showcasing artisanal brewing, coffee beans, and interior ambience.
- **Location, Hours & Socials**: Interactive Google Maps link, clickable `tel:` and `mailto:` links, WhatsApp chat link, and operating hours.
- **Mobile Navigation Menu**: Smooth glassmorphic slide-out navigation overlay for mobile devices.
- **Dynamic Copyright & Footer**: Auto-updating copyright year with links to admin login and social profiles.

### 3.2 Real-Time Availability Engine
- **Filter Controls**:
  - Date Picker (Today & Tomorrow quick toggles + native calendar).
  - Time Picker (Custom analog clock dial + digital time selector with 15-minute intervals).
  - Duration Selector (30, 45, 60, 90, 120, 180 minutes).
  - Guest Party Size (1 to 12 guests).
- **Dedicated Table Policy**:
  - Every reservation books the complete table privately for the customer party.
  - A table is marked as **Reserved** if any active booking overlaps with `[requested_start, requested_end + cleaning_buffer]`.
  - Shared seating between separate parties is strictly disabled across the entire platform.
- **Visual Table & Chair Layout**:
  - Live table cards showing table name, shape, description, and capacity.
  - Interactive chair dots indicating capacity (green = free, orange = occupied in table animation, neutral = maintenance).
- **Zero Customer PII Exposure**:
  - Public availability engine queries `public_booked_slots` / `get_public_booked_slots`.
  - Anonymous visitors cannot inspect customer names, phone numbers, or email addresses.

### 3.3 Booking Creation & Confirmation Flow
- **Interactive Booking Modal**:
  - Validates full name, email format, and optional phone number.
  - Pre-flight availability check against the database to prevent simultaneous booking conflicts.
  - Calls `book_table_atomic` PostgreSQL function with deterministic row locks.
  - Displays instant visual celebration (confetti blast + animated checkmark).
  - Displays collision-resistant booking reference code (`BK-XXXX-XXXX`).
- **Post-Commit Notification Pipeline**:
  - Asynchronously dispatches customer confirmation and owner notification emails via server-side Nodemailer Gmail SMTP route (`/api/send-email`).
  - Separates booking success from email success: If SMTP fails or is unconfigured, the booking remains safely confirmed in the database.

### 3.4 Authenticated Admin Dashboard
- **Security & Authorization**:
  - Secure login using Supabase Auth (email/password).
  - Server-side role verification via `admin_users` table and `is_admin()` SQL security definer function.
  - Anonymous visitors cannot query admin settings, customer records, or email logs.
- **Live Overview & Metrics**:
  - Total active tables, total physical chairs, today's confirmed reservations, and upcoming bookings.
  - Real-time connection badge showing Supabase WebSocket and BroadcastChannel status.
- **Booking Management**:
  - Filter bookings by date and status (`confirmed`, `cancelled`, `completed`).
  - Search by customer name, email, or booking reference.
  - Manual booking modal for phone and walk-in reservations with atomic overlap prevention.
  - One-click cancellation with confirmation modal and automatic seat release.
- **Table & Capacity Inventory**:
  - Add new tables with custom names, shapes, and chair capacities.
  - Toggle maintenance/inactive status to temporarily remove tables from public availability.
- **Cafe Settings**:
  - Configure cafe name, tagline, address, phone, and social links.
  - Configure opening time, closing time, default duration, and turnover cleaning buffer (minutes).
  - Displays confirmed Dedicated Table Reservation policy badge.
  - Configure owner notification email (stored privately, never exposed to public visitors).
- **Notification Logs Audit**:
  - Real-time log table showing email recipient, subject, status (`sent`, `failed`), retry count, and provider message IDs.

---

## 4. Acceptance Criteria & Invariants

| ID | Category | Requirement / Invariant | Status |
|---|---|---|---|
| **AC-01** | Seating Policy | 100% Dedicated Table Policy. No shared seating between separate parties. Overlapping requests lock the entire table. | Verified |
| **AC-02** | Concurrency | Simultaneous booking requests for the same table cannot overbook. Enforced atomically via `book_table_atomic`. | Verified |
| **AC-03** | Data Privacy | Anonymous users and public API calls cannot access customer personal details (names, emails, phone numbers). | Verified |
| **AC-04** | Owner Email Privacy | Public visitors cannot read the owner's notification email address. Only verified admins can read/configure it. | Verified |
| **AC-05** | Operating Hours | Bookings outside operating hours or extending past closing time (including overnight post-midnight) are strictly rejected. | Verified |
| **AC-06** | Realtime Sync | Changes to bookings on one device/tab immediately update availability on other devices/tabs without page reloads. | Verified |
| **AC-07** | Auto-Completion | Confirmed bookings past their grace period (`end_time + 15 mins`) automatically transition to `completed` and free the table. | Verified |
| **AC-08** | Email Delivery | Transactional emails are dispatched server-side via `/api/send-email` with rate limiting (10 req/min/IP) and origin validation. | Verified |
| **AC-09** | Responsiveness | Zero horizontal scroll on any viewport width from 320px to 4K desktops. Fully touch-optimized navigation and forms. | Verified |
| **AC-10** | Master SQL Integrity | All database structure is maintained in `supabase-fresh-install.sql` in strict dependency order with English-only comments. | Verified |
