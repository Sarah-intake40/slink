-- ============================================================
--  S Link (ClickUp) — Migration: list colors
--  Each list (category) gets a colour; tickets are tinted by their list
--  on the Space view so they can be read by colour.
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
-- ============================================================
alter table lists add column if not exists color text default '#7B68EE';
