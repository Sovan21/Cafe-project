# Development & Security Rules

**Project:** L'Aura Cafe & Artisanal Roastery  
**Status:** Mandatory Engineering Rules for All AI Assistants and Human Contributors  
**Last Updated:** Current Production State  

---

## 1. ABSOLUTE HIGHEST PRIORITY — ZERO CLIENT SECRET EXPOSURE (ক্লায়েন্টে কোনো সিক্রেট কি বা পাসওয়ার্ড এক্সপোজ না করা)

> [!CAUTION]
> **CRITICAL SECURITY MANDATE:**
> Under NO circumstances should any private secret key, privileged token, service-role credential, or SMTP password EVER be exposed to the client-side code, frontend bundles, or public repository.

1. **Strict Credential Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD`, `SMTP_PASS`, and private database credentials MUST strictly reside in server-side environment variables (`.env.local` / Netlify Environment Variables).
   - NEVER prefix server-only secrets with `NEXT_PUBLIC_`. Any variable starting with `NEXT_PUBLIC_` is bundled into client JavaScript and readable by anyone opening DevTools.
   - Client code is ONLY permitted to access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Server-Side Privileged Operations**:
   - Privileged operations (such as dispatching transactional emails via Nodemailer, reading the private `owner_email`, claiming notification dispatch via `claim_notification_dispatch`, or writing to `email_logs`) must be executed strictly on the server (e.g. inside Next.js App Router route handlers like `/api/send-email`).
   - Server-side routes MUST validate request origin, enforce rate limiting, and use `SUPABASE_SERVICE_ROLE_KEY` securely without reflecting it to the response.
3. **Zero Customer PII in Public Bundles & Queries**:
   - Never allow anonymous users to query the `bookings` table directly.
   - Public availability must exclusively query privacy-preserving views/functions (`public_booked_slots` / `get_public_booked_slots`), which omit all customer names, emails, phone numbers, and notes.
   - Never cache other customers' personal booking data in `localStorage` or `sessionStorage`.

---

## 2. 100% Dedicated Table Reservation Policy (No Shared Seating)

- **Dedicated Table Exclusivity**: Every reservation reserves the entire physical table privately for the customer party.
- **Shared Seating Eliminated**: Shared seating between unrelated strangers is completely removed from both the UI and database availability calculation.
- **Availability Invariant**: Any active confirmed booking on a table for an overlapping time interval (`[start_time, end_time + cleaning_buffer]`) renders the entire table **Reserved** (0 seats available).
- **Physical Capacity Fit**: Bookings are only permitted if the customer party size is less than or equal to the table's chair capacity (`party_size <= table.capacity`).

---

## 3. Single Master SQL File Maintenance (`supabase-fresh-install.sql`)

- **Authoritative SQL Source**: All database schemas, performance indexes, RLS policies, atomic functions, security definer triggers, views, and seed data must reside in a single, authoritative master file: `supabase-fresh-install.sql`.
- **Structured Dependency Order**: Maintain all SQL in strict dependency order across its 12 structured sections (tables → indexes → functions → RLS policies → atomic RPCs → claims → views → security grants → seed data).
- **Idempotency & Safe Execution**: Always use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `ON CONFLICT (id) DO NOTHING`. Never include destructive drops (`DROP TABLE`, `TRUNCATE`, `DELETE FROM`).
- **Immediate Synchronization**: Whenever any database structure, RPC, or policy is modified, immediately update `supabase-fresh-install.sql` so it remains 100% complete and self-contained.

---

## 4. Strictly English-Only, Concise Code & SQL Comments

- **Strict English Comments**: NEVER write comments in Bengali or any non-English language inside code snippets, SQL queries, JavaScript/JSX files, CSS, configuration files, or shell scripts.
- **Concise & Necessary Only**: Comments must be concise and strictly focused on essential context or non-obvious logic. Redundant, bloated, or conversational comments are prohibited.
- **Language Boundary**: While conversational responses in the chat may be in Bengali as requested by the user, all code, SQL statements, and file comments must remain strictly 100% English.

---

## 5. Atomic Database Transactions & Concurrency Control

- **Server-Authoritative Availability**: Client-side availability checks are purely informational for UX. The authoritative reservation must be executed inside PostgreSQL via the `book_table_atomic` RPC.
- **Deterministic Row Locking**: `book_table_atomic` must acquire explicit row locks (`SELECT id FROM cafe_tables WHERE id = p_table_id FOR UPDATE`) to eliminate race conditions between simultaneous concurrent booking requests.
- **Timezone Awareness**: Availability and operating hour comparisons must strictly respect the cafe's configured timezone (`Asia/Kolkata`) using PostgreSQL `NOW() AT TIME ZONE cafe_tz`.
- **Overnight Hours Support**: Accommodate operating hours spanning midnight (e.g. 08:00 to 01:00 next day) by checking post-midnight boundaries against the previous calendar day's opening time.

---

## 6. Decoupled Email Notifications & Two-Phase Claims

- **Decoupled Architecture**: Booking creation must be completely decoupled from email dispatch. A network timeout or failure in SMTP delivery must NEVER roll back or cancel a validly committed booking.
- **Two-Phase Claims**: Email dispatch must use `claim_notification_dispatch` to atomically lock the notification claim row in `notification_claims`. This prevents duplicate emails from being dispatched on page refreshes or concurrent triggers.
- **Truthful Status Reporting**: The UI and admin dashboard must distinguish between "Booking Confirmed" and "Email Notification Status" (`sent`, `failed`, or `unconfigured`). Never display a false "Email Sent" success message if the SMTP service failed or was not configured.

---

## 7. Continuous Documentation Maintenance (MANDATORY)

- **Immediate Documentation Updates**: After EVERY code, schema, or configuration modification, immediately update:
  - `docs/MEMORY.md`: Log the session handoff, modified files, technical details of what was implemented, test results, and next steps.
  - `docs/TASKS.md`: Update task statuses with `[x]` and add new tasks or phases as needed.
- Maintain a comprehensive, chronological, and truthful record of all work and architectural decisions.

---

## 8. Quality Gates & Test-First Validation

Before concluding any task or declaring work complete:
1. Run the comprehensive test suite (`test-validation.mjs`) using Node.js:
   ```powershell
   & "C:\Program Files\nodejs\node.exe" test-validation.mjs
   ```
   All 267+ tests across all 28 test suites must pass with 0 failures.
2. Run the production build check to ensure zero build or syntax errors:
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run build
   ```
3. Verify that all interactive controls, responsive viewports, and navigation links operate smoothly without console errors or horizontal scrolling.
4. Never claim an improvement or security fix works without running the verification commands.
