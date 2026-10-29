# Code, SQL, and Documentation Standards

## 1. Zero Client Secret Exposure & Credential Isolation (HIGHEST PRIORITY)
- **Zero Secrets on Client 
  - NEVER expose `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD`, `SMTP_PASS`, or database connection passwords in client-side code, public components, or `NEXT_PUBLIC_*` variables.
  - Privileged actions (sending emails, claiming notification dispatch, reading private `owner_email`) must execute strictly inside server-side routes (`/api/send-email`).
  - Never query or leak customer PII (names, emails, phones) to anonymous visitors.

## 2. Dedicated Table Reservation Policy
- **100% Private Table Reservations**: All reservations are strictly exclusive table bookings. Shared seating between strangers is completely disabled.
- **Availability Rule**: Any overlapping booking on a table renders the entire table reserved (`0` available seats).

## 3. Continuous Documentation Maintenance (MANDATORY)
- **Always update documentation after EVERY change**: Whenever code, schemas, or configurations are created, modified, or deleted, immediately update:
  - `docs/MEMORY.md`: Record the date, modified files, technical details of what was implemented, test results, and next steps in the session handoff log.
  - `docs/TASKS.md`: Update task statuses, mark completed tasks with `[x]`, and append new phases/tasks as work progresses.
- Maintain a comprehensive, chronological, and truthful record of all work and design decisions.

## 4. Single Master SQL File Maintenance (`supabase-fresh-install.sql`)
- **One Unified Master SQL File**: All SQL logic for the database (tables, indexes, atomic functions, views, RLS policies, least-privilege grants/revokes, and seed data) must reside in a single authoritative master file: `supabase-fresh-install.sql`.
- **Structured Sections**: Organize the SQL file into clean, sequential paragraphs/sections in proper dependency order.
- **Immediate Synchronization**: Whenever any database schema, function, grant, or policy is created, updated, or provided to the user, immediately update `supabase-fresh-install.sql` so that the master file is always 100% complete, idempotent, and production-ready.

## 5. Strictly English-Only, Concise Comments
- **English-Only Comments**: NEVER write comments in Bengali or any non-English language inside code snippets, SQL queries, JavaScript/JSX files, CSS, configuration files, or shell scripts.
- **Concise & Necessary Only**: Comments must be concise and strictly focused on essential context or non-obvious logic. Avoid redundant or bloated comments.
- **Language Boundary**: While conversational responses in the chat may be in Bengali as preferred by the user, all code, SQL statements, and file comments must remain strictly 100% English.
