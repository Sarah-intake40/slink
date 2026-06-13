-- ============================================================
--  S Link — Migration: allow deleting users
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
--
--  WHY: deleting a user in Supabase (Authentication → Users) cascades to
--  `profiles`, but three columns referenced profiles with the default
--  ON DELETE NO ACTION, which BLOCKED the delete ("user can't be deleted"):
--    workspaces.created_by · tasks.created_by · task_comments.author
--  This switches those three to ON DELETE SET NULL so the row survives
--  (authored-by becomes unknown) and the user can be removed cleanly.
--  All other profile references already cascade or set null.
-- ============================================================

-- workspaces.created_by
alter table workspaces drop constraint if exists workspaces_created_by_fkey;
alter table workspaces add  constraint workspaces_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- tasks.created_by
alter table tasks drop constraint if exists tasks_created_by_fkey;
alter table tasks add  constraint tasks_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- task_comments.author
alter table task_comments drop constraint if exists task_comments_author_fkey;
alter table task_comments add  constraint task_comments_author_fkey
  foreign key (author) references profiles(id) on delete set null;
