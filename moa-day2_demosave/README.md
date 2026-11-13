# Masters Of All (MoA) — Portal & Platform

Official website and internal Control Room for **Masters Of All**.

**Tagline:** Believe. Build. Become.

This is a full-stack application:

- Public-facing website (home, departments, projects, about, contact)
- Authenticated Admin / Control Room for content, media, team and settings
- Express API + file-based JSON database (easily swappable later)
- React + Vite + Tailwind CSS frontend

---

## Requirements

- **Node.js** 18 or newer
- npm (comes with Node)

---

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (API + Vite HMR on one process)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The server creates a `data/` folder and seeds the initial database on first run.

---

## Default admin account

On first launch a single founder account is created:

| Field    | Value                          |
|----------|--------------------------------|
| Email    | `muslimmehdi@mastersofall.org` |
| Password | `admin123`                     |

You will be forced to change the password on first sign-in.  
**Change this password immediately** after first login in production.

---

## Production deployment

### 1. Build the frontend

```bash
npm run build
```

This outputs static assets to `dist/`.

### 2. Start the production server

```bash
npm start
```

Or explicitly:

```bash
NODE_ENV=production tsx server.ts
```

The same Express process serves:

- Static files from `dist/`
- API routes under `/api/*`
- Uploaded media under `/uploads/*`

### Recommended process manager (PM2)

```bash
npm install -g pm2
pm2 start "npm start" --name moa-portal
pm2 save
pm2 startup
```

### Environment variables

Copy the example and adjust as needed:

```bash
cp .env.example .env
```

| Variable   | Default     | Description                |
|------------|-------------|----------------------------|
| `PORT`     | `3000`      | HTTP port                  |
| `NODE_ENV` | `development` | `production` for live use |

---

## Project structure

```
moa-portal/
├── public/                 # Static assets (logos, etc.)
│   ├── drawing1.png        # MoA emblem
│   ├── 5320.jpg            # RDD badge
│   └── rdd-logo.jpg
├── src/
│   ├── components/         # UI components + portal sub-components
│   ├── views/              # Page-level views
│   ├── services/           # API client + local storage helpers
│   ├── data/               # Seed / initial data
│   ├── design/             # Design tokens
│   ├── types/              # Shared TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── server.ts               # Express API + SPA host
├── data/                   # Runtime JSON database (created at runtime)
├── public/uploads/         # User-uploaded media
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Key features

- Atmospheric public site with department hierarchy and project showcase
- Full Control Room (admin portal) with:
  - Content & page management
  - Media library (locked brand assets)
  - Team / people management + invitations
  - Website settings & branding
  - Activity log, trash / restore
- Session-based auth with password change enforcement
- Responsive design with deep teal & copper brand system

---

## Notes for operators

- The JSON database lives at `data/database.json`. Back it up regularly.
- Uploaded files are stored in `public/uploads/`.
- Brand logos (`/drawing1.png`, `/5320.jpg`) are locked in the media library (replaceable, not deletable).
- For high-traffic or multi-instance deployments, replace the JSON adapter (`src/server/storageAdapter.ts`) with PostgreSQL / Supabase.

---

## License

Proprietary — Masters Of All. All rights reserved.
