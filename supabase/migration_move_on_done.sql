-- ============================================================
--  S Link — Migration: move a task to another List when completed
--  Adds tasks.move_to_list. Run ONCE in the SQL Editor. Idempotent.
--
--  When a task that has move_to_list set is moved to a Done/Closed status,
--  the app relocates it into that List. Destinations are kept within the
--  same Space (so the per-Space status set stays valid).
-- ============================================================

alter table tasks add column if not exists move_to_list uuid references lists(id) on delete set null;
