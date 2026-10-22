# Project Memory

**Project:** Demo Café Website & Real-Time Table Booking  
**Last updated:** 2026-10-16  
**Purpose:** Persistent handoff notes for the next coding session or AI coding assistant. Update this file when the actual codebase, decisions, or test results change.

## 1. Current status

- The six project context documents have been drafted for this cafe-booking prototype.
- The user's existing prototype repository/source code has **not yet been inspected in this conversation**.
- Therefore, no implementation, build, database migration, deployment, or email test is claimed to be complete.
- A user-provided local launcher snippet directly invokes `node_modules/next/dist/bin/next dev --hostname 0.0.0.0`; therefore the local app uses Next.js. The exact Next.js version, router type, launcher filename, package scripts, and Tailwind patch version still need inspection.

## 2. Project goal

Build a simple single-page cafe website plus an owner dashboard. Cafe name, landmark, address, contact, menu, and images are dummy placeholders initially. Booking, table/chair capacity, real-time availability, and customer/owner email notification must be real backend functionality.

## 3. Confirmed user requirements

- Cafe name, address, landmark, menu, and other public details can be dummy data for the prototype.
- Customer-facing single-page website with menu and cafe photos/videos.
- Owner can configure total number of tables and chair capacity per table.
- Website tracks table and chair availability in real time for a selected date/time.
- Booking asks for date, start time, duration, number of guests, and number of tables desired (or provides a useful auto-selection path).
- On successful booking, email goes to both customer and owner.
- Owner email should include which table(s), for what time/duration, and how many guests.
- Prototype should be deployed on Netlify or another suitable option; GitHub is used for code/version control. No custom domain is required immediately.
- Dummy bookings/data are fine for testing, but the booking backend and email flow must function.
- Need to estimate maintenance/subscription and operating costs later; do not invent exact cost before choosing actual services and usage.

## 4. Current technical facts and proposal

- Frontend/dev framework: Next.js. Evidence: the provided Node.js launcher spawns `node_modules/next/dist/bin/next dev --hostname 0.0.0.0`. This script is a wrapper around Next.js development mode, not Vite and not an Express API server.
- Launcher behavior: detects a local IPv4 address and rewrites `0.0.0.0` in stdout for display. Preserve it unless a specific change is requested. Exact filename and package script still need verification.
- Styling: Tailwind CSS v4.x. Exact minor/patch version must be checked in `package.json` and the lockfile. Do not use Vite integration; for Next.js, inspect the PostCSS/global CSS configuration and use Tailwind v4 conventions.
- Router and language: not yet verified. Inspect the existing files to determine App Router vs Pages Router and JavaScript vs TypeScript; do not migrate without approval.
- Database/Auth/Realtime: intended stack is Supabase PostgreSQL, Supabase Auth, and Realtime. Existing connection/schema are not yet verified.
- Booking creation: trusted server-side function + transactional PostgreSQL RPC; never rely on client-side availability checks alone.
- Notifications: server-side Gmail SMTP integration with Nodemailer and database audit logging.
- Hosting: Netlify is the preferred prototype target; GitHub is used for source control. Supabase remains the shared backend/data service.
- Source control: GitHub.
- Tailwind CSS v4 reference: https://tailwindcss.com/docs/installation/framework-guides/nextjs

## 5. Important design decisions / assumptions

1. Prototype default seating mode is `shared_seating` to demonstrate real remaining-chair counts. The owner can switch to `exclusive_table`. Confirm the actual business rule before launch; sharing tables between unrelated parties changes the customer experience.
2. In shared mode, availability is based on `chair_capacity - overlapping seats_allocated` per table. In exclusive mode, any overlapping active booking blocks the whole table.
3. Multiple tables can be assigned to one group; the customer may request a table count or choose auto-select. Allocation must validate combined capacity.
4. Reservation intervals are `[start_at, end_at)`, stored in UTC and interpreted in `Asia/Kolkata` for the prototype. The cleaning buffer is configurable and must have explicitly documented semantics.
5. Booking record status and email delivery status are separate. Email failure does not erase a successfully committed booking.
6. Realtime messages contain only safe availability-change signals; the client re-fetches availability and never receives customer booking PII through public subscriptions.
7. No payment system is in the MVP.
8. Demo content must be visibly marked. Do not imply the cafe is a real business or that unconfirmed bar-related services/licenses exist.

## 6. Critical risks to keep visible

- **Concurrent booking race:** two customers may attempt to reserve the same seats at the same time. Prevent this in a database transaction with table-row locking and a recheck, not only in the UI.
- **Data exposure:** booking rows contain names, emails, and phone numbers. RLS and server-side authorization must be tested before deployment.
- **Email failure:** bookings and email sends are separate operations; preserve bookings and log notification errors.
- **Realtime staleness:** a websocket notification is only a signal. Always re-run a trusted availability query; show reconnect/stale state when needed.
- **Unknown existing stack:** do not overwrite an existing working prototype just to match the proposed folder structure.

## 7. Next steps

1. Get the existing project ZIP or repository/link and inspect `package.json`, the Next.js version/router, Tailwind v4/PostCSS config, exact launcher filename and npm scripts, current UI, backend status, and database schema.
2. Update this file with a baseline: working features, broken features, known errors, actual stack, and deployment status.
3. Compare actual functionality against the checklist in `TASKS.md`; keep the task statuses honest.
4. Implement or repair the database schema and RLS before public booking deployment.
5. Build/verify atomic capacity allocation, real-time re-query, and both email notification paths.
6. Test two browser sessions and deliberately test simultaneous conflicting requests.
7. Deploy a demo and record its URL and actual test results here.

## 8. Session handoff record

- **Date:** 2026-10-17
- **Changed files:**
  - `package.json` (Upgraded to Next.js 16.4.2, React 19.3.1, added `nodemailer`, set `start` to `next start`, added `test` script)
  - `next.config.js` (Moved `allowedDevOrigins` from `experimental` to top-level for Next.js 16 compatibility)
  - `.gitignore` (Added `.next/`, `node_modules/`, `.env*` with explicit `!.env.example`)
  - `.env.example` (Updated with Gmail SMTP templates `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CAFE_OWNER_EMAIL`, and Supabase variables; removed PIN variables)
  - `src/utils/validation.js` (Created comprehensive, reusable validation suite for name, email, 10-digit Indian mobile, guest count, operating hours)
  - `src/constants/defaultData.js` (Completely eradicated `section` and unwanted categories: Private Booth, Sunset, Balcony; standardized to Kolkata, India, ₹ currency, Asia/Kolkata timezone)
  - `src/components/LiveTableMap.jsx` (Removed `table.section` and `Layers` icon; displaying table ID and clean capacity)
  - `src/components/BookingModal.jsx` (Removed `table.section`, added full multi-step validation checks, 10-digit Indian phone input constraint, replaced Bangladesh demo placeholder with Indian demo name)
  - `src/components/AdminDashboard.jsx` (Migrated 100% to Supabase Auth with session persistence and server-controlled role validation; purged PIN fallback, added Magic Link OTP and sign-out)
  - `src/context/CafeContext.jsx` (Integrated field validation in `createBooking`, collision-resistant booking IDs `BK-...`, dual email dispatch to both customer and owner, honest failure reporting on database error, removed `section` in `addTable`)
  - `app/api/send-email/route.js` (Canonical email dispatch endpoint using Nodemailer Gmail SMTP, in-memory rate limiting, truthful reporting, and full HTML sanitization; deleted redundant `netlify/functions/send-email.mjs`)
  - `src/components/EmailCenterDrawer.jsx` (Removed all Resend references, updated badge to dynamic status, updated footer label to Gmail SMTP)
  - `supabase-schema.sql` (Hardened `is_admin()` SQL helper to reject untrusted user_metadata and strictly verify server-controlled app_metadata and admin_users allowlist; dropped `section` column; secured RLS policies and `book_table_atomic`)
  - `test-validation.mjs` (Automated 42-point test suite for validation rules, concurrency overlap with buffer, booking IDs, HTML sanitization, and admin authorization security)
- **Implemented:**
  - Complete Next.js 16.4.2 + React 19.3.1 upgrade with Turbopack support.
  - Complete elimination of unwanted seating categories ('Private Booth', 'Sunset', 'Balcony') across the entire codebase.
  - Complete migration from Resend to Google/Gmail SMTP using Nodemailer (0 Resend references remain).
  - Single canonical email route (`app/api/send-email/route.js`); eliminated duplicate `netlify/functions/send-email.mjs`.
  - Client-side, server-side, and database-level validation for Indian phone numbers (10 digits starting with 6-9), Unicode names, email syntax, guest counts, and operating hours.
  - Concurrency safety with row-level locking (`FOR UPDATE`) and cleaning buffer enforcement in atomic booking DB RPC.
  - Hardened Supabase Auth admin gate with server-controlled role verification; eliminated PIN login and all exposed PIN variables.
  - Collision-resistant unique booking identifier generation.
  - All 20 UI/UX website audit improvements verified (no horizontal scrolling, working links, mobile hamburger nav, custom 404, dynamic copyright year, clickable tel/mailto, logo link, accessible touch targets, clear error/success feedback).
- **Tests run and results:**
  - `npm test`: 42 Passed, 0 Failed.
  - `npm run build`: Compiled successfully with Turbopack in 933ms, zero warnings, zero errors.
  - `grep_search`: 0 occurrences of 'Private Booth', 'Sunset', 'Balcony' across the entire project.
  - `grep_search`: 0 occurrences of 'resend' across the entire project.
  - `grep_search`: 0 occurrences of 'ADMIN_PIN' in project code.
- **Next steps for deployment:**
  - Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `CAFE_OWNER_EMAIL` in `.env.local` / Netlify environment variables.
  - Create Supabase project, execute `supabase-schema.sql` in the SQL Editor, and populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

