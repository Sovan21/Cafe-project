# Development Rules

**Project:** Demo Café Website & Real-Time Table Booking  
**Purpose:** Rules for AI coding assistants and human contributors. Read this file and the other project documents before changing code.

## 1. Source-of-truth rules

1. Read `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `TASKS.md`, and the current `MEMORY.md` before a substantial coding task.
2. Inspect the existing repository, `package.json`, environment setup, and current implementations before editing. These documents guide the project; they do not authorize a full rewrite of working code.
3. If code and documents conflict, report the discrepancy and propose a small, explicit decision. Do not silently invent requirements.
4. Keep `TASKS.md` and `MEMORY.md` updated after meaningful changes, tests, or decisions.

## 2. General engineering rules

- Prefer small, focused, reviewable changes.
- Reuse existing components, services, and conventions; avoid duplicate logic.
- Do not change unrelated files or remove existing features without a clear reason.
- Use meaningful names and keep components/functions focused.
- Avoid adding dependencies unless they provide clear value. Explain new dependencies in the change summary.
- Do not leave fake implementations, TODO placeholders, or hard-coded success messages in a flow that is described as functional.
- Keep demo data in a clearly identified seed file or seed script, not mixed into production logic.

## 3. Frontend and TypeScript

- This repository uses a Node.js launcher that invokes the Next.js CLI. Preserve Next.js and the existing JavaScript conventions unless `package.json`/source inspection proves otherwise and the user approves a migration. Do not introduce Vite.
- Avoid `any`; use explicit types for bookings, table inventory, availability responses, and function results.
- Treat all client-side values as untrusted. The client may display a pre-check, but it never authorizes a reservation.
- Use reusable form controls, loading/error/empty/success states, and clear validation messages.
- Keep Supabase subscription setup and cleanup inside a single lifecycle-safe hook/service; always unsubscribe when no longer needed.
- Never show “email sent” until the server/provider reports a successful send. Distinguish booking success from notification failure.

## 3A. Next.js and Tailwind CSS v4 project constraints

- The provided local launcher calls `node_modules/next/dist/bin/next dev --hostname 0.0.0.0`; this is a Next.js development wrapper, not Vite and not a separate Express backend. Inspect the actual filename and `package.json` scripts before editing it.
- Do not install Vite, create a `vite.config.*`, use `@tailwindcss/vite`, or rewrite startup scripts without explicit need and approval.
- Tailwind CSS is v4.x in this project; verify the exact installed version from `package.json` and the lockfile. Do not use Tailwind v3 setup such as `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` or blindly add `tailwind.config.js` content globs.
- For a Next.js + Tailwind v4 setup, inspect the existing PostCSS config and global stylesheet. The standard setup uses `@tailwindcss/postcss` and `@import "tailwindcss"`; adapt only after checking the current configuration. Official guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Preserve the current Next.js App Router or Pages Router; determine which one this repository uses before creating/moving routes.
- The launcher runs `next dev` for development only. Do not configure the production host to run this development wrapper.

## 4. Booking correctness rules

- Availability must be computed for the exact requested date, start time, duration, seating mode, opening hours, and cleaning buffer.
- Use `Asia/Kolkata` as the prototype cafe timezone unless owner requirements change it. Store timestamps consistently in UTC; display in cafe local time.
- Use start-inclusive/end-exclusive intervals (`[start, end)`) and document buffer behavior.
- Do not implement booking creation as a sequence of unprotected browser-side reads and inserts.
- Validate and assign table/chair capacity in one atomic server/database operation with concurrency protection.
- Make booking submission idempotent so retries/double-clicks do not create duplicate reservations.
- Cancelled bookings must stop consuming availability according to the status policy; changes must emit an availability event.
- Never expose other customers' names, emails, phone numbers, or booking details through public queries or realtime events.
- The default demo seating mode is `shared_seating`; do not assume that shared seating is the final business policy.

## 5. Security and privacy rules

- Never place Supabase service-role/secret keys, email API keys, SMTP passwords, or other secrets in frontend code or `NEXT_PUBLIC_*` variables. Those variables are public to the browser.
- Use only the Supabase anon/publishable key in the browser, combined with correctly configured RLS and server-side authorization.
- Enable and test RLS for all API-exposed tables.
- Public users must not directly insert/read private booking rows. Use trusted server functions and the transactional booking operation.
- Verify owner authorization on the server; never trust an `isAdmin` flag provided by the client.
- Do not put secrets, real customer data, or `.env` files in Git, screenshots, test fixtures, or project docs.
- Use fictional names/emails in seed data and test cases.
- Sanitize provider errors before exposing them to UI users.

## 6. Database and migrations

- Store schema changes in version-controlled migrations; avoid undocumented manual production edits.
- Add appropriate primary keys, foreign keys, uniqueness checks, non-negative/positive capacity checks, and indexes for booking lookup by time/status/table.
- Keep inventory updates safe when future bookings already exist. Do not reduce a table's capacity below an active allocation without warning/blocking the operation.
- Use deterministic lock ordering when locking multiple tables to reduce deadlock risk.
- Never use realtime subscription payloads as the availability source of truth; use them only as change signals, then re-query a trusted availability function.

## 7. UI and accessibility

- Follow `DESIGN.md` tokens instead of introducing arbitrary colors and spacing.
- Mobile-first layouts; no horizontal overflow on small screens.
- Use semantic HTML, visible focus indicators, keyboard-accessible interactions, labels for inputs, and accessible status messages.
- Do not rely on color alone to communicate table status; include text and/or icons.
- Provide clear messages for no availability, invalid duration, closed hours, stale/reconnecting live status, booking conflict, and email failure.
- Mark temporary name, photos, location, and menu as demo content.

## 8. Testing and quality gates

Before calling a booking change complete:
- Run the relevant tests and build/lint commands available in the repository.
- Test boundary time intervals, duration validation, shared and exclusive seating modes, multiple-table allocation, cancellation, and table deactivation.
- Test two simultaneous conflicting requests; only valid non-conflicting capacity may be committed.
- Test in two browsers to verify realtime refresh.
- Simulate email provider success and failure; verify that booking state remains correct in both cases.
- Test RLS as anonymous visitor and authenticated owner.
- Report commands run and any tests not run. Never claim a test passed if it was not executed.

## 9. Git and delivery

- Do not commit generated build output, `.env`, provider credentials, or real booking exports.
- Keep commits/change sets small and descriptive where Git is used.
- Update `TASKS.md` status only when there is evidence of completion.
- Add new architectural decisions and important bugs to `MEMORY.md`.
- At the end of a coding task, summarize changed files, behavior, tests, remaining risks, and next task.
