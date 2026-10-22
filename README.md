# Cafe Booking Website Prototype

A cafe website prototype with a customer-facing page and a table-reservation workflow. The prototype may use dummy cafe details, menu items, images, and sample data until the real cafe information is available.

> **Project status:** Prototype. Do not assume booking, real-time availability, or email notifications are production-ready until each feature has been tested end to end.

## Technology

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS v4
- **Development launcher:** Custom Node.js script that starts the local Next.js development server and displays the active network IP address
- **Backend / database / email:** Check the current project configuration and `docs/ARCHITECTURE.md` for the services actually connected

This project does **not** use Vite. Do not add Vite configuration or Vite-specific packages unless the project architecture is deliberately changed.

## Requirements

- Node.js and npm, using versions compatible with the installed Next.js version
- Dependencies installed from `package.json`
- Required environment variables configured locally, if the current implementation uses external services

## Getting started

1. Open a terminal in the project root.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Check the `scripts` section in `package.json` and run the project's configured development command. If the `dev` script points to the custom Node.js launcher, use:

   ```bash
   npm run dev
   ```

   If no `dev` script exists, use the launcher filename shown in `package.json` or add the correct script only after confirming the filename and intended command. Do not assume the launcher is named `server.js` or `dev-server.js` without checking the project files.

4. Open the local URL printed by the development server. To test from another device on the same network, use the active LAN IP and port printed in the terminal. Network access may be blocked by the operating system firewall or Wi-Fi network isolation.

## Tailwind CSS v4

Use Tailwind CSS v4-compatible configuration. In a standard CSS entry file, the v4 import is:

```css
@import "tailwindcss";
```

For Next.js, follow the Tailwind CSS v4 PostCSS integration used by the existing project. Do **not** use `@tailwindcss/vite`, Vite plugins, or the old Tailwind v3 setup (`@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`) unless a confirmed migration requirement calls for it.

Before changing the styling setup, inspect `package.json`, the CSS entry file, and the existing PostCSS configuration.

## Planned prototype capabilities

The intended prototype scope includes:

- Cafe home page with temporary name, logo, location, contact details, and gallery
- Sample cafe menu
- Table inventory with configurable table count and chair capacity
- Booking by date, start time, duration, and number of guests
- Availability updates based on overlapping reservations
- Customer booking email and owner notification email
- Admin controls for tables, bookings, and cafe settings

These are **intended requirements**, not a guarantee that all features are already implemented. Track implementation and test results in `docs/TASKS.md` and `docs/MEMORY.md`.

## Project context files

Read these files before making significant project changes:

- `docs/PRD.md` — requirements and acceptance criteria
- `docs/ARCHITECTURE.md` — framework, backend, database, and system design
- `docs/RULES.md` — coding, security, and workflow rules
- `docs/DESIGN.md` — visual style and responsive UI rules
- `docs/TASKS.md` — development and testing checklist
- `docs/MEMORY.md` — current state, decisions, risks, and next steps

Keep these documents aligned with the actual code. Update `TASKS.md` and `MEMORY.md` when implementation status or technical decisions change.

## Environment Variables & Gmail SMTP Setup

Create a `.env.local` file in the project root:

```env
# Next.js Public Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Gmail SMTP Credentials (Server-only)
GMAIL_USER=your-cafe@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
CAFE_OWNER_EMAIL=management@yourcafe.com
```

> **Setting up Gmail App Passwords:**
> 1. Go to your Google Account -> **Security**.
> 2. Enable **2-Step Verification**.
> 3. Search for **App passwords** (or go to `myaccount.google.com/apppasswords`).
> 4. Create a new App Password named "Cafe Reservation Engine".
> 5. Copy the 16-character generated password into `GMAIL_APP_PASSWORD`.
> 6. *Never* use your regular Gmail password.

## Verification & Testing

Run the automated test suite:
```bash
npm test
```

Run the production build:
```bash
npm run build
```

## Security notes

- Never commit `.env`, `.env.local`, API keys, SMTP passwords, service-role keys, or other secrets.
- Keep privileged database operations and email credentials on the server, not in browser code.
- Treat customer contact details and booking records as private data.
- Enforce booking availability and conflict prevention on the server/database, not only in the UI.
- Do not display a booking as confirmed or an email as sent until the corresponding operation has succeeded.

## Before deployment

- Run `npm test` and `npm run build` to ensure all tests and compilation pass.
- Apply `supabase-schema.sql` to your Supabase project in the SQL Editor.
- Configure all environment variables in Netlify / hosting dashboard.
