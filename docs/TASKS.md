# Project Tasks

**Project:** L'Aura Cafe & Artisanal Roastery  
**Status at document creation:** Production Hardened & Aligned  
**Rule:** Do not mark a task complete until its acceptance condition has been implemented and verified. Update this file after each meaningful work session.

## Status legend

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed and verified
- `[!]` Blocked / needs a decision

Priority: **P0** = launch-blocking; **P1** = needed for MVP; **P2** = polish/future.

---

## Phase 0 — Inspect the current prototype

- [x] **0.1 · P0** Inspect the current repository, `package.json`, folder layout, existing UI, environment config, and deployment status. Do not rewrite before understanding what already works.
- [x] **0.2 · P0** Compare the current implementation against `PRD.md`; note existing features, gaps, and conflicting assumptions in `MEMORY.md`.
- [x] **0.3 · P0** Inspect `package.json`/lockfile to confirm Next.js and Tailwind CSS v4 exact versions, identify App Router vs Pages Router and JavaScript vs TypeScript, inspect the existing PostCSS/global CSS setup, and locate the Node.js launcher that runs `next dev`. Do not add Vite or replace the launcher.
- [x] **0.4 · P1** Confirm seating policy: owner confirmed 100% dedicated table reservations (exclusive table policy).

---

## Phase 1 — Project configuration and data model

- [x] **1.1 · P0** Ensure `.gitignore` excludes `.env`, credentials, private customer exports, and local build artifacts.
- [x] **1.2 · P0** Create a safe `.env.example` with variable names and dummy values only.
- [x] **1.3 · P0** Create/version single master SQL script `supabase-fresh-install.sql` containing all 12 sections in strict dependency order.
- [x] **1.4 · P0** Add constraints, foreign keys, useful indexes, and status/capacity checks.
- [x] **1.5 · P0** Enable RLS and write separate public-read and owner-only policies for every API-exposed table.
- [x] **1.6 · P1** Seed authentic cafe settings, tables with various capacities, menu items, and initial data using `ON CONFLICT (id) DO NOTHING`.

---

## Phase 2 — Owner authentication and inventory

- [x] **2.1 · P0** Configure Supabase Auth for the owner; require password sign-in (removed Magic Link OTP).
- [x] **2.2 · P1** Build protected admin route/layout and a clear signed-out state.
- [x] **2.3 · P0** Implement add/edit/deactivate/maintenance table operations.
- [x] **2.4 · P0** Allow the owner to set chair capacity per table and view total physical table/chair counts.
- [x] **2.5 · P1** Add cafe settings for opening hours, timezone, default duration, cleaning buffer, seating policy, and private owner notification email.
- [x] **2.6 · P1** Prevent unsafe capacity reductions or table deactivation when existing future bookings would become invalid; show a clear warning.

---

## Phase 3 — Availability and atomic booking engine

- [x] **3.1 · P0** Implement a trusted `get_public_booked_slots` query/function for a selected date without leaking customer PII.
- [x] **3.2 · P0** Apply opening hours, `Asia/Kolkata` timezone, duration validation, `[start, end)` overlap rules, and cleaning buffer consistently.
- [x] **3.3 · P0** Enforce 100% Dedicated Table Policy: any overlapping active booking reserves the complete table.
- [x] **3.4 · P0** Completely remove shared seating calculation from availability engine and UI.
- [x] **3.5 · P0** Implement table capacity verification (`party_size <= table.capacity`).
- [x] **3.6 · P0** Implement an atomic database operation (`book_table_atomic`) that locks candidate tables in deterministic order, rechecks capacity, and inserts booking in one transaction.
- [x] **3.7 · P0** Add collision-resistant booking reference generation (`BK-XXXX-XXXX`) and idempotency protection.
- [x] **3.8 · P0** Implement cancellation/status updates that free capacity correctly and emit availability events.
- [x] **3.9 · P0** Implement `auto_complete_expired_bookings` to free table capacity 15 minutes after booking end time.

---

## Phase 4 — Customer website and realtime availability

- [x] **4.1 · P1** Build responsive single-page layout with hero, roastery about, menu, gallery, location/contact, and footer.
- [x] **4.2 · P1** Implement luxury dark aesthetic (`#110b08`), Neumorphic glass cards, and Playfair Display typography.
- [x] **4.3 · P0** Build booking modal for date, custom clock time picker, duration, guests, name, email, and phone.
- [x] **4.4 · P0** Show table-by-table chair capacity, occupied/free status, and availability for the selected time window.
- [x] **4.5 · P0** Show clear booking summary, celebratory confetti burst, and handle conflict responses without losing form data.
- [x] **4.6 · P0** Subscribe to Supabase Realtime `bookings` channel and browser `BroadcastChannel('laura_cafe_realtime_sync')`.
- [x] **4.7 · P1** Implement click-to-call, `mailto:` link, WhatsApp deep link, and Google Maps link.
- [x] **4.8 · P1** Add loading, empty, error, success, and realtime connection badge.

---

## Phase 5 — Email notifications

- [x] **5.1 · P0** Configure server-side Nodemailer Gmail SMTP route handler at `/api/send-email` with rate limiting and origin checks.
- [x] **5.2 · P0** Implement customer confirmation HTML template with booking reference, cafe details, date/time, duration, guest count, and assigned table.
- [x] **5.3 · P0** Implement owner alert email with customer contact and all booking details.
- [x] **5.4 · P0** Implement two-phase atomic notification claims (`claim_notification_dispatch` & `record_notification_result`) and log outcomes in `email_logs`.
- [x] **5.5 · P1** Add safe retry capability for transient email errors without creating duplicate bookings.
- [x] **5.6 · P0** Truthfully report email delivery status separately from booking success.

---

## Phase 6 — Testing, security, and polish

- [x] **6.1 · P0** Test party size larger than table capacity.
- [x] **6.2 · P0** Test dedicated table policy: any overlapping booking makes the whole table unavailable.
- [x] **6.3 · P0** Test back-to-back bookings and the configured cleaning buffer.
- [x] **6.4 · P0** Test past dates, closed hours, invalid duration, invalid email, inactive table, and out-of-service table.
- [x] **6.5 · P0** Send concurrent overlapping booking requests; verify overbooking is prevented via atomic locks.
- [x] **6.6 · P0** Test customer cancellation/admin cancellation and capacity recalculation.
- [x] **6.7 · P0** Test email failure, duplicate submit, timeout, and retry claims.
- [x] **6.8 · P0** Test RLS: anonymous visitor cannot read booking PII or modify owner settings.
- [x] **6.9 · P0** Test CSP headers, anti-clickjacking, and origin validation on `/api/send-email`.
- [x] **6.10 · P1** Test responsive layouts, keyboard navigation, focus, labels, status announcements, and zero horizontal scrolling.
- [x] **6.11 · P0** Run automated tests (267/267 passing in `test-validation.mjs`) and Next.js production build.

---

## Phase 7 — Demo deployment

- [ ] **7.1 · P0** Deploy frontend to Netlify from the intended Git branch.
- [ ] **7.2 · P0** Apply Supabase master script `supabase-fresh-install.sql` to the production database project.
- [ ] **7.3 · P0** Configure Netlify environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- [ ] **7.4 · P0** Test the public website from a signed-out browser and the admin route from an authorized owner account.
- [ ] **7.5 · P1** Verify transactional emails delivered to real test inboxes.

---

## Phase 8 — Customer privacy & admin hardening (Completed 2026-10-24)

- [x] **8.1 · P0** Eliminate public `from('bookings').select('*')` on app mount in `CafeContext.jsx`.
- [x] **8.2 · P0** Remove fallback direct select on `bookings` in `fetchPublicBookedSlots` to enforce zero customer PII leakage.
- [x] **8.3 · P0** Purge cached customer reservations and email logs from browser `localStorage` in cloud mode.
- [x] **8.4 · P0** Sanitize multi-tab and Supabase Realtime broadcast payloads to transmit strictly anonymized table slot metadata.
- [x] **8.5 · P0** Implement `fetchAdminBookings()` and `clearAdminBookings()` restricted strictly to authenticated admin sessions.
- [x] **8.6 · P0** Completely remove Magic Link OTP authentication option from `AdminDashboard.jsx`; require password sign-in.
- [x] **8.7 · P0** Generate and verify idempotent Supabase SQL migration enabling RLS on `bookings` and revoking `anon`/`PUBLIC` select.
- [x] **8.8 · P1** Add persistent repository rule `.agents/rules/coding-style.md` enforcing mandatory documentation updates (`MEMORY.md` & `TASKS.md`) after every change, master SQL file sync, and concise English-only comments.
- [x] **8.9 · P0** Verify 267/267 automated tests passing in `test-validation.mjs` and Next.js Turbopack build passing in 3.3s.

---

## Phase 9 — Documentation Realignment & Complete Removal of Shared Seating (Completed 2026-10-24)

- [x] **9.1 · P0** Completely remove `shared_seating` from codebase:
  - `AdminDashboard.jsx`: Replaced shared seating option with dedicated table reservation badge.
  - `CafeContext.jsx`: Removed `shared_seating` availability and booking conflict branches.
  - `LiveTableMap.jsx`: Removed `isPartiallyAvailable` states and "Shared (x Free)" badges.
  - `defaultData.js`: Cleaned up comments to reflect dedicated table policy.
- [x] **9.2 · P0** Fully update `docs/DESIGN.md`: Documented the real `#110b08` dark luxury aesthetic, Neumorphic glass cards, Playfair Display & Plus Jakarta Sans typography, custom clock time picker, confetti celebration, and dedicated table policy.
- [x] **9.3 · P0** Fully update `docs/ARCHITECTURE.md`: Documented Next.js 16.4.2 App Router, Turbopack, Tailwind CSS v4.3.3, Nodemailer Gmail SMTP, atomic `book_table_atomic`, zero PII views, and hybrid Realtime sync.
- [x] **9.4 · P0** Fully update `docs/PRD.md`: Aligned with current production-grade implementation and completely removed all mentions of `shared_seating`.
- [x] **9.5 · P0** Fully update `docs/RULES.md` and `.agents/rules/coding-style.md`: Set absolute highest priority on **Zero Client Secret Exposure (ক্লায়েন্টে কোনো সিক্রেট কি বা পাসওয়ার্ড এক্সপোজ না করা)**.
- [x] **9.6 · P0** Clean up obsolete files: Safely removed `supabase-sync-fix.sql` and `public/sw.js`.
- [x] **9.7 · P0** Validate test suite: 267/267 tests pass in `test-validation.mjs`.

---

## Phase 10 — Precision Dual Palette Calibration (Public #140e0a & Admin #1c140f) (Completed 2026-10-24)

- [x] **10.1 · P1** Calibrate public site base dark background to `#140e0a` (precisely 1% softer than original `#110b08`) across `globals.css`, `layout.jsx`, and `not-found.jsx`.
- [x] **10.2 · P1** Retain warm velvet mocha palette (`#1c140f` / `#241a13`) in the admin panel (`app/admin/page.jsx`, `AdminDashboard.jsx`, and `EmailCenterDrawer.jsx`) as requested.
- [x] **10.3 · P1** Adjust public elevated panels (`#1a120c`), cards (`#201610`), nav (`#18110c`), and trays (`#18110b`).
- [x] **10.4 · P1** Update public gradients across `Hero.jsx`, `Footer.jsx`, `Navbar.jsx`, `MenuSection.jsx`, `AmbianceSection.jsx`, `BookingModal.jsx`, and `ClockTimePicker.jsx`.
- [x] **10.5 · P1** Synchronize `docs/DESIGN.md` color tokens with the dual palette.
- [x] **10.6 · P0** Validate test suite (267/267 tests passing) and Next.js Turbopack build.
