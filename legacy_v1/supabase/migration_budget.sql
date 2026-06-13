-- ============================================================
--  S Link — Migration: Flexible budget categories + cost calculator
--  Run ONCE in: Supabase Dashboard > SQL Editor > New query
--  Safe to run on an existing database — idempotent (re-runnable).
-- ============================================================

-- Per-project budget categories: editable name/colour and their own
-- allocated budget. Replaces the fixed `expense_category` enum + budget_lines.
create table if not exists budget_categories (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  name       text not null,
  color      text default '#2563eb',
  budget     numeric default 0,          -- amount allocated to this category
  sort       int default 0,
  created_at timestamptz default now()
);
create index if not exists budget_categories_project_idx on budget_categories(project_id);

alter table budget_categories enable row level security;
drop policy if exists "bcat read"   on budget_categories;
drop policy if exists "bcat insert" on budget_categories;
drop policy if exists "bcat update" on budget_categories;
drop policy if exists "bcat delete" on budget_categories;
-- members read; only PM manages the category structure & allocations (matches budget control)
create policy "bcat read"   on budget_categories for select using (public.is_project_member(project_id));
create policy "bcat insert" on budget_categories for insert with check (public.is_pm());
create policy "bcat update" on budget_categories for update using (public.is_pm());
create policy "bcat delete" on budget_categories for delete using (public.is_pm());

-- Expenses: link to a dynamic category + optional qty x rate breakdown.
-- `amount` stays the authoritative total (computed in app) so all existing
-- budget rollups keep working unchanged.
alter table expenses add column if not exists category_id uuid references budget_categories on delete set null;
alter table expenses add column if not exists quantity    numeric;           -- e.g. 10 (workers), 40 (m³)
alter table expenses add column if not exists unit_label  text;              -- e.g. "worker", "m³", "day"
alter table expenses add column if not exists rate        numeric;           -- price per unit / day / hour
alter table expenses add column if not exists rate_basis  text default 'flat'; -- flat | unit | day | hour
alter table expenses add column if not exists hours       numeric;           -- hours worked (when rate_basis='hour')
-- the old `category` enum column is left in place (nullable default) but no longer used.
alter table expenses alter column category drop not null;
