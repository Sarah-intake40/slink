# S Link — Work Management + Construction Finance

A hybrid app (v2): a **ClickUp-style work manager** — Workspace → Space → Folder → List → Task hierarchy, custom per-space statuses & fields, multi-assignees, priorities, dates, tags, subtasks, dependencies, watchers, comments, **recurring tasks**, and List / Board / Calendar / Table views with filter / sort / group, **global Cmd-K search**, **bulk actions**, realtime notifications, and **light + dark themes** — fused with a **construction finance suite**: category-based cost control with an expense calculator, bilingual (AR/EN) payment certificates (مستخلصات) with retention / advance / VAT, finance dashboards, and print-to-PDF reports.

Built to run **free** on the free tiers of **Supabase** (database + auth + storage) and **Netlify** or **Cloudflare Pages** (static hosting).

`© copyrights a7mdabdelsalam`

---

## Stack
- **Frontend:** React + Vite (plain JS) — static build, deploys anywhere
- **Backend:** Supabase — Postgres, Auth, Storage, Row-Level Security (no server code to run)
- **Exports:** jsPDF + SheetJS (run in the browser)

---

## Access model (v2)

The first person to sign up bootstraps a **Workspace** (becoming its owner). Anyone who is a member of a
workspace can currently read and write everything in it — row-level security (RLS) enforces *workspace
membership*, not fine-grained roles. The `owner / admin / member / guest` roles exist in the schema; per-role
restrictions and private/guest spaces are a planned refinement (not yet enforced in the UI).

> Migrating from the construction-only v1? Its PM / Engineer / Sub / Client role model lives in `legacy_v1/`.

---

## Setup — step by step

### 1. Create a free Supabase project
1. Go to https://supabase.com → sign up → **New project** (free plan).
2. Pick a name and a database password, choose the region closest to you, create it.
3. Wait ~2 minutes for it to provision.

### 2. Create the database
1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, copy **all** of it, paste, and click **Run**.
3. This creates every table, all security rules, the signup trigger, and the `drawings` storage bucket.

### 3. Get your keys
In Supabase: **Project Settings → API**. Copy:
- **Project URL**
- **anon public** key (the public one — safe for the browser)

### 4. Configure & run locally
```bash
cp .env.example .env
# open .env and paste your two values:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

npm install
npm run dev
```
Open the printed URL (usually http://localhost:5173). **Sign up** — you're now the Project Manager. Create a project and explore.

### 5. (Recommended) Turn off email confirmation while testing
Supabase → **Authentication → Providers → Email** → toggle **Confirm email** off so new sign-ups can log in instantly. Turn it back on for production if you like.

---

## Deploy free (pick one)

### Option A — Netlify (simplest)
1. Push this folder to a **GitHub** repo.
2. https://netlify.com → **Add new site → Import from Git** → pick the repo.
3. Build command `npm run build`, publish directory `dist` (the included `netlify.toml` sets this automatically).
4. **Site settings → Environment variables** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. You'll get a free `*.netlify.app` URL.

### Option B — Cloudflare Pages
1. Push to GitHub.
2. https://pages.cloudflare.com → **Create application → Connect to Git**.
3. Framework preset: **Vite** · build command `npm run build` · output dir `dist`.
4. Add the two `VITE_...` environment variables.
5. Deploy → free `*.pages.dev` URL.

> Both free tiers have no commercial-use restriction, unlike Vercel's Hobby plan.

### 6. Point Supabase at your live URL
Supabase → **Authentication → URL Configuration** → set **Site URL** to your deployed address so login redirects work.

---

## How your team joins
1. Share your deployed URL.
2. Each colleague signs up (name + email + password).
3. You (PM) go to **Team**, set each person's role, and tick which projects they can access.
   - Subs/clients only see projects you add them to — that's how external people get scoped, limited access.

---

## Free-tier limits to know
- **Supabase free:** 500 MB database, 1 GB file storage, 50k monthly active users, 2 projects. Plenty for a small team and storing PDFs/drawings/photos. (Very large CAD/BIM model files would eat storage fast — keep heavy native files in your usual drive and attach PDFs/screenshots here.)
- **Netlify / Cloudflare free:** generous static hosting + bandwidth for a team of this size.

---

## Project structure
```
slink/
├─ supabase/
│  ├─ schema.sql            ← run this first in the Supabase SQL Editor (full schema)
│  └─ migration_*.sql       ← idempotent add-ons; run any you haven't (e.g. migration_recurring.sql for repeats)
├─ src/
│  ├─ api.js                ← all database calls (+ search & recurring helpers)
│  ├─ auth.jsx · workspace.jsx · theme.jsx · notifications.jsx   ← context providers
│  ├─ pages/                ← Login, Home (My Work), Inbox, List/Space/User, Dashboard, Costs, Invoices, Reports
│  ├─ views/                ← List, Board, Calendar, Table
│  ├─ finance.js            ← cost / invoice math
│  └─ components/           ← Layout, Sidebar, CommandPalette, TaskViews, TaskModal, Charts, Modal, shared Bits
├─ .env.example
└─ netlify.toml
```

> **After deploying schema.sql once**, apply any migrations you skipped. Recurring tasks need
> `supabase/migration_recurring.sql` (adds `tasks.recurrence`). The finance pages need the finance migrations.

---

## Common gotchas
- **"Missing VITE_SUPABASE..." in console** → you didn't create `.env` (local) or set env vars (host).
- **Can sign up but see nothing** → that's correct for non-PM users until the PM adds you to a project.
- **Login redirect issues after deploy** → set the **Site URL** in Supabase (step 6).
- **File upload fails** → confirm `schema.sql` ran fully (it creates the `drawings` bucket and its policies).
