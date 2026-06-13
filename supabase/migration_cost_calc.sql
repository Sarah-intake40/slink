-- ============================================================
--  S Link — Migration: cost calculator on expenses
--  Expenses can be a flat amount OR quantity × rate (per unit/day/hour).
--  `amount` stays the authoritative total (computed in the app).
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
-- ============================================================
alter table expenses add column if not exists quantity   numeric;
alter table expenses add column if not exists unit_label text;             -- e.g. "worker", "m³", "day"
alter table expenses add column if not exists rate       numeric;          -- price per unit / day / hour
alter table expenses add column if not exists rate_basis text default 'flat'; -- flat | unit | day | hour
alter table expenses add column if not exists hours      numeric;          -- hours worked (when rate_basis='hour')
