# Product Requirements Document (PRD)

**Project:** Demo Café Website & Real-Time Table Booking  
**Version:** 1.0  
**Status:** Prototype requirements / draft  
**Last updated:** 2026-10-16  
**Primary goal:** Build a working prototype with realistic booking, capacity, real-time availability, and email flows while keeping cafe branding and menu data as placeholders.

> This document is the product source of truth. If the existing repository already contains working implementation, inspect it before making changes. Do not replace the current stack or working features without a specific reason.

## 1. Product overview

A mobile-first, single-page cafe website paired with a secure admin dashboard and a real-time reservation system. Dummy cafe name, logo, address, landmark, contact information, photos, and menu are acceptable during the prototype phase. Booking logic, capacity checks, database writes, and notification processing must be real—not mocked.

## 1A. Existing implementation constraints

The current development setup uses a Node.js wrapper that invokes the Next.js CLI (`next dev --hostname 0.0.0.0`). Tailwind CSS has been upgraded to v4.x. Keep the existing Next.js setup and launcher; do not migrate to Vite. Exact installed versions and the router type must be verified from the repository before implementation changes.

## 2. Problem statement

The cafe needs a simple web presence and a reliable way to see which tables and chairs are available for a chosen time. Customers should be able to choose a date, start time, duration, party size, and requested number of tables. After a successful booking, both the customer and cafe owner should receive an email.

## 3. Goals

- Present cafe details, location, contact information, gallery, and menu on one polished page.
- Let an owner configure the cafe's total inventory: tables and chair capacity per table.
- Show availability for the exact requested date, time, and duration.
- Track both table occupancy and remaining seats per table in real time.
- Accept bookings for a specified party size and duration, assigning one or more suitable tables.
- Prevent over-capacity and overlapping booking conflicts, including simultaneous requests.
- Email booking details to the customer and owner after the booking is successfully stored.
- Make the prototype easy to replace with real business content later.

## 4. Target users

### Customer
- Wants to browse the cafe, read the menu, see the location, and reserve seating.
- Needs clear availability, a booking reference, and a confirmation email.

### Cafe owner / manager
- Needs to set table inventory and chair counts, manage bookings, view occupancy, update cafe details, and receive new-booking emails.

## 5. MVP scope

### Public website
- Single-page responsive landing page.
- Temporary cafe name and logo placeholder.
- Hero section, short about section, photo/video gallery placeholders, menu categories and dummy menu items/prices.
- Address and landmark placeholders, contact number placeholder, click-to-call link, WhatsApp deep link, and map link placeholder.
- Booking section with date, start time, duration, number of guests, and number of tables requested (or an “auto-select suitable tables” option).
- Availability view listing available tables, total chair capacity, occupied/reserved seats, and free seats for the selected time window.
- Clear loading, no-availability, validation-error, booking-success, and booking-failure states.

### Real booking system
- Save bookings in the shared backend database.
- Recheck availability on the server immediately before allocation and insertion.
- Assign one or more tables whose capacity satisfies the party size and requested table count.
- Apply the configured seating mode:
  - `shared_seating`: multiple parties may share a table if enough chairs remain for overlapping time windows.
  - `exclusive_table`: any active overlapping booking reserves the whole table.
- Prototype default: `shared_seating`, so chair-level remaining capacity can be demonstrated. Show this mode clearly in the admin panel. Confirm the intended real-life seating policy with the owner before production launch.
- Treat booking intervals as start-inclusive and end-exclusive (`[start_at, end_at)`); adjacent bookings may touch without overlapping unless a cleanup buffer is configured.
- Default timezone: `Asia/Kolkata`. Store timestamps consistently (UTC in the database) and display them in cafe local time.
- Store booking status separately from email delivery status. An email failure must not silently delete or undo a valid booking.

### Owner/admin dashboard
- Protected owner login; no public admin self-registration.
- Dashboard overview of today's/upcoming bookings and current/selected-slot capacity.
- Create, edit, deactivate, or mark a table as unavailable for maintenance.
- Configure number of tables and chair capacity for each table.
- Configure opening hours, default booking-duration options, optional cleaning buffer, seating mode, cafe public details, and owner notification email.
- View bookings by date/status; cancel a booking; inspect customer, party size, time window, assigned tables, booking reference, and email delivery status.
- Changes to inventory or bookings update availability for open customer pages without a manual refresh.

### Email notifications
- After a booking is committed, attempt to send:
  1. A customer confirmation with reference, cafe details, date/time, duration, guest count, and assigned table(s).
  2. An owner notification with reference, customer contact, guest count, date/time, duration, and assigned table(s).
- Use a server-side email provider API or server-side SMTP integration. Never send mail directly from the browser.
- Record send outcome, provider message ID where available, retry count, and a sanitized error in `email_logs`.
- Display truthful status: booking success and email success/failure are separate states.

## 6. Main user journeys

### Customer booking
1. Customer selects date, start time, duration, party size, and preferred table count or auto-select.
2. The site requests availability for that exact window.
3. Customer reviews suitable table(s) and visible seat availability.
4. Customer enters name, email, and phone (phone may be optional for the prototype).
5. Customer reviews the booking summary and submits.
6. The backend validates input, rechecks availability atomically, assigns table(s), and commits the booking.
7. The interface shows a booking reference and current notification status. Customer and owner email attempts begin only after commit.

### Owner inventory update
1. Owner signs into the dashboard.
2. Owner adds/edits tables and each table's chair capacity, or marks a table out of service.
3. The backend validates changes against existing bookings and prevents unsafe edits where needed.
4. A safe availability-change event is emitted; customer pages re-fetch availability for their selected window.

## 7. Functional requirements

- **FR-01 Cafe content:** All business details must be editable placeholders during prototype development.
- **FR-02 Menu:** Menu items support name, description, category, price, image URL, and active/hidden state.
- **FR-03 Inventory:** Owner can configure the number of tables and chair capacity of each table independently.
- **FR-04 Capacity summary:** Admin can see total physical chairs, active assigned seats for a selected time window, and remaining bookable seats.
- **FR-05 Availability:** Availability depends on date, start time, duration, table status, opening hours, seating mode, and overlapping confirmed bookings.
- **FR-06 Party and table selection:** Customer provides party size and requested table count, or chooses auto-select. Assigned combined capacity must fit the party size.
- **FR-07 Validation:** Reject past bookings, invalid duration, closed hours, capacity overflow, inactive tables, and invalid contact details.
- **FR-08 Conflict protection:** Concurrent requests must not overbook the same table/seats. Server/database is authoritative; client-side availability is informational only.
- **FR-09 Realtime:** Other open browsers receive a safe availability-change signal and re-query availability without refreshing the whole page.
- **FR-10 Booking status:** Booking status includes at least `confirmed`, `cancelled`, `completed`, and `no_show`. Only relevant active statuses consume capacity.
- **FR-11 Notifications:** Attempt customer and owner emails after a committed booking and log each outcome separately.
- **FR-12 Admin access:** Only authenticated and authorized owners can access private bookings, owner settings, or email logs.
- **FR-13 Privacy:** Public visitors must not be able to query another customer's personal details or booking records.
- **FR-14 Demo labels:** The interface must visibly identify sample cafe/menu data as demo content until replaced.

## 8. Acceptance criteria

- A booking for a party larger than all available capacity is rejected with a clear message.
- If a table has 4 chairs and 2 overlapping seats are booked in shared mode, availability shows 2 seats remaining; another booking may use those seats only if the party fits and the owner has enabled shared seating.
- In exclusive-table mode, any overlapping active booking makes that table unavailable for the overlap, even when some physical chairs are empty.
- Changing the time window recalculates which tables and chairs are available.
- A booking on browser A causes the availability view on browser B to update without a full-page refresh.
- Two simultaneous conflicting requests cannot both successfully reserve the same capacity.
- After a successful booking, both customer and owner notification attempts are made with correct data.
- If email delivery fails, the booking remains stored and the UI/admin log reflects the email failure.
- A visitor cannot read private bookings by directly calling the database/API.
- The website works on common mobile and desktop widths and supports keyboard navigation for core flows.

## 9. Out of scope for the prototype

- Online payments, deposits, refunds, billing, or invoicing.
- Food delivery or POS integration.
- SMS/WhatsApp automated notifications (a WhatsApp click-to-chat link is in scope).
- Loyalty programs, customer accounts, reviews, or advanced analytics.
- Public bar/alcohol service information or claims that any license is available.
- Final production branding or real business data before the owner supplies it.

## 10. Assumptions and decisions to confirm

- Demo cafe name, address, landmark, contact number, gallery, menu, and prices are placeholders.
- Prototype default is shared seating to demonstrate chair-level availability. The owner must confirm whether tables are shareable or each booking reserves a whole table before production.
- Customer may request a number of tables, but the server validates that the requested combination can seat the party; auto-select should choose a valid, minimal combination when enabled.
- No payment is collected and no paid reservation is implied.
- Confirm opening hours, allowed booking durations, cleaning buffer, customer cancellation policy, owner email address, and sender-domain setup before production.

## 11. Success measures for the prototype

- No overbooking in the defined concurrency tests.
- Availability refreshes across two browsers after booking/cancellation/inventory changes.
- Booking data remains correct even when notification delivery fails.
- Owner can alter table/chair capacity without editing source code.
- All critical test cases in `TASKS.md` are marked complete before calling the prototype ready.
