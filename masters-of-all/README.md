# Masters Of All (MoA) — Portal & Platform

Official website and internal Control Room for **Masters Of All**.

**Tagline:** Believe. Build. Become.

This is a full-stack application:

- Public-facing website (home, about, departments, our work, contact, custom pages)
- Authenticated Control Room with role-based permissions for content, media, team, and settings
- Express API + modular JSON-file repository layer (`server/db/`) with atomic writes and rolling backups
- React 19 + Vite + Tailwind CSS v4 frontend

---

## Requirements

- **Node.js** 20 or newer
- npm

---

## Quick start (development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

When `NODE_ENV !== 'production'` (or `ENABLE_TEST_ACCOUNTS=true`), temporary development test accounts are provisioned and reset at startup with clear console warnings.

---

## Initial founder account (production)

On first launch without an existing `data/database.json`, a founder administrator account (`muslimmehdi@mastersofall.org`) is created with `isFounder: true` and `mustChangePassword: true`:

- Set `INITIAL_ADMIN_PASSWORD` in your environment before first startup (must be 12+ characters with uppercase, number, and symbol), **or**
- Leave it unset so the server generates a random 16+ character one-time password and prints it **once** to the server console.

---

## Production build & deployment

```bash
# 1. Build frontend assets and bundle production server to dist/
npm run build

# 2. Start production server (runs without devDependencies)
npm start
```

Verify types and tests before deploying:

```bash
npm run lint
npm run test
```

---

## Environment variables

Copy `.env.example` to `.env` and configure values for your host:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Set to `production` in live environments |
| `APP_URL` | `http://localhost:3000` | Canonical public URL for emails, sitemaps, and CORS |
| `INITIAL_ADMIN_PASSWORD` | — | Optional strong (12+ chars) initial founder password on first boot |
| `ENABLE_TEST_ACCOUNTS` | `false` | Set `true` only for staging QA; never enable in live production |
| `TRUST_PROXY` | `1` | Express proxy hop setting (`1`, `true`, `false`, or subnet) |
| `ALLOWED_ORIGINS` | — | Optional comma-separated extra allowed origins |
| `SMTP_HOST` | — | SMTP server host for invitations, password resets, and notifications |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Set `true` for TLS/port 465 |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `Masters Of All <noreply@mastersofall.org>` | Sender address for transactional emails |
| `NOTIFY_EMAIL` | — | Optional inbox email notified on new Contact form submissions |

---

## LAUNCH CHECKLIST

Before going live in production, complete every step:

1. **Delete test accounts**: Sign in as Founder Admin and remove `admin@mastersofall.org` and `solo@mastersofall.org` (or ensure `NODE_ENV=production` without `ENABLE_TEST_ACCOUNTS=true` so the server automatically deactivates them).
2. **Set `NODE_ENV=production`**: Enables strict 2FA enforcement, production static serving, and disables development test accounts.
3. **Set `INITIAL_ADMIN_PASSWORD`** (if initializing a fresh database) and verify your Founder password + 2FA recovery codes are safely stored.
4. **Configure `SMTP_*` environment variables** (and `APP_URL`) so team invitations and password resets deliver real emails.
5. **Delete old test data**: Review Projects, Publications, Products, Inbox submissions, and Empty Trash before opening traffic.
6. **Verify backups**: Confirm `data/backups/` is writable and off-site backups include `data/database.json` and `public/uploads/`.

---

## Architecture & Operations

- Database resides at `data/database.json`, accessed through `server/db/` repositories using a serialized write queue, atomic temp-file writes, and rolling backups in `data/backups/`.
- Uploads live in `public/uploads/`, verified by magic bytes (SVG and spoofed extensions rejected).
- Official brand logos (`/drawing1.png`, `/5320.jpg`) are locked in the Media Library (replaceable, not deletable).
- Proprietary — Masters Of All. All rights reserved.
