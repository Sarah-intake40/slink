-- ============================================================
--  S Link (ClickUp) — Migration: Recurring tasks
--  Adds tasks.recurrence (jsonb). Run ONCE in the SQL Editor.
--  Idempotent / safe to re-run.
-- ============================================================

-- Recurrence rule for a task, e.g. {"freq":"weekly","interval":1}.
-- null = does not repeat. When a recurring task is completed, the app
-- spawns the next instance with start/due dates advanced by the rule.
alter table tasks add column if not exists recurrence jsonb;
