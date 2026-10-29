# System Architecture

**Project:** L'Aura Cafe & Artisanal Roastery  
**Version:** 2.0 (Production-Hardened)  
**Status:** Active System Architecture  

---

## 1. Architectural Principles

- **Zero Client-Side Secrets**: Privileged secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD`) are strictly confined to server-side environments. The frontend client only possesses the public Supabase anon key.
- **Authoritative Database Integrity**: Table availability and booking allocations are calculated and enforced inside atomic PostgreSQL transactions, never trusted to browser calculations.
- **Zero Customer PII Exposure**: Anonymous visitors and customer browsers cannot query customer names, emails, phone numbers, or notes from the database. Availability queries use privacy-preserving views and RPCs.
- **Dedicated Table Policy**: All cafe bookings are 100% exclusive table reservations. Shared seating between strangers is completely eliminated.
- **Decoupled Notification Pipeline**: Booking creation is completely decoupled from SMTP email delivery. Email failures never roll back or invalidate a successfully committed reservation.
- **Resilient Realtime Synchronization**: Hybrid synchronization combining Supabase Postgres Changes with browser multi-tab `BroadcastChannel` ensures immediate UI updates across tabs and devices.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Devices (Mobile / Tablet / Desktop)"]
        CB[Customer Browser]
        AB[Admin / Owner Browser]
        BC[BroadcastChannel: laura_cafe_realtime_sync]
        CB <--> BC
        AB <--> BC
    end

    subgraph HostingLayer ["Next.js App Server (Netlify / Node.js)"]
        APP[Next.js 16 App Router UI]
        DEV[devserver.js: LAN IPv4 Wi-Fi Launcher]
        API["API Route: /api/send-email\n(Rate Limited, Origin Verified)"]
    end

    subgraph SupabaseLayer ["Supabase Managed Backend (PostgreSQL)"]
        PUB_VIEW[View: public_booked_slots]
        SET_VIEW[View: public_cafe_settings]
        RPC_BOOK[Function: book_table_atomic]
        RPC_SLOTS[Function: get_public_booked_slots]
        RPC_CLAIMS[Functions: claim_notification_dispatch & record_notification_result]
        RPC_AUTO[Function: auto_complete_expired_bookings]
        RT[Supabase Realtime Channel: bookings]
        DB[(Tables: cafe_tables, bookings, cafe_settings, notification_claims, email_logs)]
    end

    subgraph EmailLayer ["Transactional Email Provider"]
        SMTP[Gmail SMTP via Nodemailer]
    end

    CB -->|HTTPS Public Browsing| APP
    AB -->|HTTPS + Supabase Auth| APP
    APP -->|Public Availability Query - No PII| RPC_SLOTS
    RPC_SLOTS --> PUB_VIEW
    APP -->|Atomic Reservation Request| RPC_BOOK
    RPC_BOOK -->|Exclusive Lock & Insert| DB
    DB -->|Postgres Changes| RT
    RT -->|Availability Change Signal| CB
    RT -->|Availability Change Signal| AB
    APP -->|POST Claim & Dispatch| API
    API -->|Claim Lock (service_role)| RPC_CLAIMS
    API -->|Send Transactional Emails| SMTP
    API -->|Record Result (service_role)| RPC_CLAIMS
```

---

## 3. Technology Stack & Runtime Specifications

| Layer | Technology | Version | Purpose & Configuration |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.4.2` | Server & client rendering, `/api/send-email` route handler, metadata |
| **UI Library** | React | `19.3.1` | Component lifecycle, state management, concurrent rendering |
| **Development** | Turbopack / Next Dev | Built-in | Fast HMR dev server launched via `devserver.js` with local LAN IP resolution |
| **Styling** | Tailwind CSS + PostCSS | `v4.3.3` | `@tailwindcss/postcss` with global `@import "tailwindcss"`, CSS variables |
| **Icons & Media** | Lucide React | `^1.16.0` | Feather-style icons, responsive SVG rendering |
| **Database** | Supabase (PostgreSQL 15+) | Cloud | Managed relational database, RLS policies, PL/pgSQL atomic RPCs |
| **Auth** | Supabase Auth (GoTrue) | Cloud | Admin authentication with email/password session tokens |
| **Realtime** | Supabase Realtime | Cloud | WebSocket postgres_changes events on the `bookings` table |
| **Inter-Tab Sync**| BroadcastChannel API | Native Browser | Instant zero-latency state sync across tabs (`laura_cafe_realtime_sync`) |
| **Email Service**| Nodemailer + Gmail SMTP | `^8.3.0` | Server-only transactional email delivery with custom HTML styling |
| **Deployment** | Netlify / Node.js Host | Production | Static assets, SSR endpoints, CSP security headers via `netlify.toml` |

---

## 4. Local Development Launcher (`devserver.js`)

The project includes an intelligent launcher script `devserver.js`:
- Uses Node.js `child_process.spawn` to launch Next.js (`node_modules/next/dist/bin/next dev --hostname 0.0.0.0`).
- Automatically scans network interfaces (Wi-Fi, Ethernet) to discover the local LAN IPv4 address (e.g. `192.168.1.X`).
- Dynamically rewrites Next.js terminal output so developers can test on physical mobile devices connected to the same Wi-Fi network without manual configuration.

---

## 5. Master SQL Architecture (`supabase-fresh-install.sql`)

All database structure is consolidated into a single authoritative master SQL file (`supabase-fresh-install.sql`), organized into 12 structured sections in strict dependency order:

1. **Table Definitions**: `admin_users`, `cafe_settings`, `cafe_tables`, `menu_categories`, `menu_items`, `bookings`, `notification_claims`, `email_logs`.
2. **Performance Indexes**: B-tree indexes on `(booking_date, status, table_id)`, `(table_id, booking_date)`, and timestamps.
3. **Admin Verification Function (`is_admin`)**: Validates `auth.uid()` against verified entries in `admin_users` (never grants privileges by client email alone).
4. **Row Level Security (RLS)**: Enforces table-level isolation across all 8 tables.
5. **Atomic Booking RPC (`book_table_atomic`)**:
   - Acquires deterministic row locks (`SELECT id FROM cafe_tables WHERE id = p_table_id FOR UPDATE`).
   - Converts timestamps to cafe timezone (`Asia/Kolkata`).
   - Handles overnight post-midnight operating hours.
   - Enforces the **Dedicated Table Policy** (rejects any overlapping booking within `[start_time, end_time + cleaning_buffer]`).
   - Enforces physical table capacity (`p_guest_count <= table.capacity`).
   - Inserts confirmed booking and returns JSON result.
6. **Auto-Complete Expired Bookings (`auto_complete_expired_bookings`)**:
   - Automatically transitions confirmed bookings past their grace period (`end_time + 15 mins`) to `completed`.
7. **Two-Phase Notification Claims**:
   - `claim_notification_dispatch(p_booking_id)`: Atomically locks a pending email claim to prevent duplicate delivery.
   - `record_notification_result(...)`: Updates delivery status, provider message IDs, retry counters, and logs in `email_logs`.
8. **Privacy-Preserving Public Views**:
   - `public_booked_slots`: Exposes only `(booking_date, start_time, end_time, table_id, status)` for availability calculation. Completely omits customer names, emails, and phone numbers.
   - `public_cafe_settings`: Exposes public cafe details while completely omitting `owner_email` and internal flags.
9. **Public Availability RPC (`get_public_booked_slots`)**:
   - Allows anonymous clients to fetch booked intervals for a target date without exposing private data.
10. **Public Settings RPC (`get_public_cafe_settings`)**:
    - Returns safe public cafe metadata.
11. **Least-Privilege Security Grants & Revokes**:
    - Revokes direct SELECT/INSERT on `cafe_settings`, `bookings`, `notification_claims`, and `email_logs` from `anon` and `PUBLIC`.
    - Revokes internal functions (`claim_notification_dispatch`, `record_notification_result`) from client access; grants exclusively to `service_role`.
12. **Idempotent Seed Data**: Inserts default tables (`T01`–`T08`), menu categories, menu items, and initial settings using `ON CONFLICT (id) DO NOTHING`.

---

## 6. Realtime Availability & Synchronization Flow

1. **Public Availability Calculation**:
   - When the user selects a Date, Time, Duration, and Party Size, the frontend calls `calculateTableAvailability`.
   - The engine queries `get_public_booked_slots(targetDate)`.
   - Dedicated table rule: If any confirmed booking overlaps with `[start_time, end_time + cleaning_buffer]`, the table is marked as **Reserved** (0 seats available).
   - If no overlap exists and `table.capacity >= party_size`, the table is marked as **Available**.
2. **Supabase Realtime**:
   - The app subscribes to `postgres_changes` on `schema: public, table: bookings`.
   - When any booking is inserted, confirmed, or cancelled, a lightweight event triggers a background refresh of `get_public_booked_slots`.
3. **Multi-Tab BroadcastChannel**:
   - `new BroadcastChannel('laura_cafe_realtime_sync')` broadcasts reservation events across all open browser tabs on the same origin, ensuring 0ms latency sync without waiting for network round-trips.

---

## 7. Email Notification Architecture (`/api/send-email`)

- **Server-Side Route**: Next.js App Router route handler at `src/app/api/send-email/route.js`.
- **Zero Client Secrets**: Uses server environment variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (e.g. Gmail App Password), and `SUPABASE_SERVICE_ROLE_KEY`.
- **Origin Validation**: Rejects requests where the `Origin` or `Referer` header does not match the configured host or local development origin.
- **In-Memory Rate Limiting**: Enforces a strict sliding window limit of 10 requests per minute per IP address.
- **Two-Phase Idempotent Claims**:
  1. Calls `supabase.rpc('claim_notification_dispatch')` using `service_role`. If a claim is already pending or submitted, prevents duplicate email dispatch.
  2. Dispatches branded HTML customer confirmation and owner notification via Nodemailer.
  3. Calls `supabase.rpc('record_notification_result')` to transition claim status to `submitted` or `failed` (for safe retries) and records audit entries in `email_logs`.

---

## 8. Security & Compliance Architecture

- **Content-Security-Policy (CSP)**: Configured in `next.config.js` and `netlify.toml` with strict `default-src 'self'`, `frame-ancestors 'none'`, and secure external connections (Supabase API & Realtime WSS).
- **Anti-Clickjacking**: `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- **MIME Sniffing Protection**: `X-Content-Type-Options: nosniff`.
- **Cross-Domain Isolation**: `X-Permitted-Cross-Domain-Policies: none`.
- **Strict Transport Security**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
