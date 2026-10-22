# Project Tasks

**Project:** Demo Café Website & Real-Time Table Booking  
**Status at document creation:** Planning / needs repository inspection  
**Rule:** Do not mark a task complete until its acceptance condition has been implemented and verified. Update this file after each meaningful work session.

## Status legend

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed and verified
- `[!]` Blocked / needs a decision

Priority: **P0** = launch-blocking; **P1** = needed for MVP; **P2** = polish/future.

## Phase 0 — Inspect the current prototype

- [x] **0.1 · P0** Inspect the current repository, `package.json`, folder layout, existing UI, environment config, and deployment status. Do not rewrite before understanding what already works.
- [x] **0.2 · P0** Compare the current implementation against `PRD.md`; note existing features, gaps, and conflicting assumptions in `MEMORY.md`.
- [x] **0.3 · P0** Inspect `package.json`/lockfile to confirm Next.js and Tailwind CSS v4 exact versions, identify App Router vs Pages Router and JavaScript vs TypeScript, inspect the existing PostCSS/global CSS setup, and locate the Node.js launcher that runs `next dev`. Do not add Vite or replace the launcher.
- [x] **0.4 · P1** Confirm whether the prototype should default to shared seating (current assumption) and what table-count choice the customer needs.

**Exit condition:** Existing project and its status are understood; no working code was replaced unnecessarily.

## Phase 1 — Project configuration and data model

- [x] **1.1 · P0** Ensure `.gitignore` excludes `.env`, credentials, private customer exports, and local build artifacts.
- [x] **1.2 · P0** Create a safe `.env.example` with variable names and dummy values only.
- [x] **1.3 · P0** Create/version SQL migrations for `cafe_settings`, `cafe_tables`, `menu_categories`, `menu_items`, `bookings`, `booking_tables`, `availability_events`, and `email_logs` (adapt names to current schema if already present).
- [x] **1.4 · P0** Add constraints, foreign keys, useful indexes, and status/capacity checks.
- [x] **1.5 · P0** Enable RLS and write separate public-read and owner-only policies for every API-exposed table.
- [x] **1.6 · P1** Seed clearly fictional cafe settings, tables of different capacities, menu items, and safe demo bookings.

**Exit condition:** Migrations run cleanly and security policies are tested as anonymous and owner users.

## Phase 2 — Owner authentication and inventory

- [x] **2.1 · P0** Configure Supabase Auth for the owner; do not create public admin registration.
- [x] **2.2 · P1** Build protected admin route/layout and a clear signed-out state.
- [x] **2.3 · P0** Implement add/edit/deactivate/out-of-service table operations.
- [x] **2.4 · P0** Allow the owner to set chair capacity per table and see total physical table/chair counts.
- [x] **2.5 · P1** Add cafe settings for opening hours, timezone, allowed duration, cleaning buffer, seating mode, and owner email.
- [x] **2.6 · P1** Prevent unsafe capacity reductions or table deactivation when existing future bookings would become invalid; show a clear warning.

**Exit condition:** Owner changes inventory/settings without editing source code; unauthorized users cannot perform these actions.

## Phase 3 — Availability and atomic booking engine

- [x] **3.1 · P0** Implement a trusted `get-available-tables` query/function for a selected date, start time, duration, party size, and table-count preference.
- [x] **3.2 · P0** Apply opening hours, `Asia/Kolkata` timezone, duration validation, `[start, end)` overlap rules, and cleaning buffer consistently.
- [x] **3.3 · P0** Implement `shared_seating` capacity calculation using overlapping `seats_allocated` per table.
- [x] **3.4 · P0** Implement `exclusive_table` behavior where any overlapping active booking blocks the whole table.
- [x] **3.5 · P0** Implement auto-allocation of one or more tables and validation for an explicitly requested number of tables.
- [x] **3.6 · P0** Implement an atomic database operation (e.g. `create_booking_atomic`) that locks candidate tables in deterministic order, rechecks capacity, and inserts booking + table allocations in one transaction.
- [x] **3.7 · P0** Add idempotency protection so repeated submits/retries do not create duplicate bookings.
- [x] **3.8 · P0** Implement cancellation/status updates that free capacity correctly and emit availability events.

**Exit condition:** Overlap, capacity, multi-table, shared/exclusive, cancellation, and simultaneous-request tests pass.

## Phase 4 — Customer website and realtime availability

- [x] **4.1 · P1** Build/retain responsive single-page layout with hero, about, menu, gallery, location/contact, and footer.
- [x] **4.2 · P1** Display dummy content distinctly and make future replacement easy.
- [x] **4.3 · P0** Build booking form for date, start time, duration, number of guests, requested table count/auto-select, name, email, and optional phone.
- [x] **4.4 · P0** Show table-by-table chair capacity, assigned/occupied seats, remaining seats, and availability for the selected time window.
- [x] **4.5 · P0** Show clear booking summary and handle a stale availability/conflict response without losing the user's form data.
- [x] **4.6 · P0** Subscribe to safe availability-change events; re-query availability on changes and clean up subscriptions on unmount.
- [x] **4.7 · P1** Implement click-to-call, WhatsApp link, and map link using placeholders.
- [x] **4.8 · P1** Add loading, empty, error, success, and realtime reconnect states.

**Exit condition:** Two separate browser sessions show consistent availability without a full-page refresh.

## Phase 5 — Email notifications

- [x] **5.1 · P0** Choose/configure a server-side email provider; keep all provider credentials in Supabase Function secrets (or another trusted server environment).
- [x] **5.2 · P0** Implement customer confirmation template with booking reference, cafe details, date/time, duration, guest count, and table assignments.
- [x] **5.3 · P0** Implement owner alert with customer contact and all booking details.
- [x] **5.4 · P0** Log success/failure separately per recipient in `email_logs`.
- [x] **5.5 · P1** Add safe retry capability for transient email errors without creating a second booking.
- [x] **5.6 · P0** Simulate provider success and failure; verify truthfully reported email status.

**Exit condition:** Both notification flows work in a test environment and error states are visible without losing bookings.

## Phase 6 — Testing, security, and polish

- [x] **6.1 · P0** Test party size larger than capacity.
- [x] **6.2 · P0** Test shared seating: a 4-chair table with 2 seats allocated has 2 seats remaining for an overlapping interval.
- [x] **6.3 · P0** Test exclusive seating: any overlapping booking makes the whole table unavailable.
- [x] **6.4 · P0** Test back-to-back bookings and the configured cleaning buffer.
- [x] **6.5 · P0** Test past dates, closed hours, invalid duration, invalid email, inactive table, and out-of-service table.
- [x] **6.6 · P0** Send concurrent overlapping booking requests; verify overbooking is impossible.
- [x] **6.7 · P0** Test customer cancellation/admin cancellation and capacity recalculation.
- [x] **6.8 · P0** Test email failure, duplicate submit, timeout, and retry.
- [x] **6.9 · P0** Test RLS: anonymous visitor cannot read booking PII or modify owner settings.
- [x] **6.10 · P1** Test responsive layouts, keyboard navigation, focus, labels, status announcements, and contrast.
- [x] **6.11 · P0** Run available lint, type-check, automated tests, and production build; record the actual results.

**Exit condition:** Every P0 task is complete, test outcomes are recorded, and known limitations are documented.

## Phase 7 — Demo deployment

- [ ] **7.1 · P0** Deploy frontend to Netlify from the intended Git branch.
- [ ] **7.2 · P0** Apply Supabase migrations and deploy functions to the correct test project.
- [ ] **7.3 · P0** Configure environment variables/secrets without committing them.
- [ ] **7.4 · P0** Test the public demo URL from a signed-out browser and the admin route from an authorized owner account.
- [ ] **7.5 · P1** Add a demo disclaimer and reset procedure for demo bookings.
- [ ] **7.6 · P1** Record deployed URLs, environment/project identifiers (never secrets), build status, and next steps in `MEMORY.md`.

**Exit condition:** A reviewer can use the deployed prototype and complete a test booking end-to-end.

## Known follow-up decisions before production

- [ ] Owner confirms shared seating vs full-table reservations.
- [ ] Owner confirms actual table inventory and chair counts.
- [ ] Owner confirms business hours, booking durations, cleaning buffer, and cancellation policy.
- [ ] Owner supplies actual cafe name, address, landmark, contact info, logo, photos/videos, menu, and prices.
- [ ] Confirm sender-domain requirements and ongoing email/hosting costs.
- [ ] Review current Netlify, Supabase, and email-provider usage limits/pricing before launch.
