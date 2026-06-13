# Changelog — S Link

All notable changes to this project are recorded here.

## v1.0.0 — 2026-06-12

First tagged release. A complete construction project & task management app for the
team, hosted on free tiers (React + Vite frontend, Supabase backend).

### Core
- Email/password auth with roles enforced in Postgres RLS: **pm** (admin), **engineer**,
  **sub**, **client**. First signup auto-becomes pm.
- Portfolio **Dashboard** (KPIs + project cards) and per-project workspace with 8 tabs.
- **Team** management: PM sets roles and per-project membership.
- Project create/edit with readable (comma-formatted) budget input.

### Tasks (ClickUp-style)
- Kanban board with drag-and-drop status.
- Per-project **custom fields** (text, number, money, percent, dropdown, multi-select,
  date, checkbox, person) — managed via **⚙ Fields**.
- **Subtasks**, inline **checklists**, and **tags** on every task; comments.

### Costs
- Per-project **editable budget categories** (name / colour / allocation), PM-managed.
- **Cost calculator** per expense: flat amount, or quantity × rate (per unit / per day /
  per hour × hours). `expenses.amount` stays the authoritative total.

### Invoices (المستخلصات)
- Construction payment certificates with **percentage-based** retention, advance recovery,
  VAT, and discount; live breakdown and net-payable calculation.
- Behind-on-billing banner (progress vs billed), cash position, and a cumulative
  billed-vs-spent chart.

### Records, Files, Reports
- RFIs, submittals, inspections, punch list, daily logs, issues.
- Drawing/PDF/photo uploads to Supabase Storage with signed-URL download.
- Status report export to **PDF** and **Excel**.

### Database
- Full schema in `supabase/schema.sql`. Incremental migrations (idempotent):
  `migration_certificates.sql`, `migration_budget.sql`, `migration_invoice.sql`,
  `migration_tasks.sql`.
