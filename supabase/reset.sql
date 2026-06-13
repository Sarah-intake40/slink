-- ============================================================
--  DANGER — wipes the public schema so the new ClickUp schema.sql
--  can be applied to an EXISTING Supabase project (the old S Link v1
--  construction tables conflict with the new ones).
--
--  Only run this if you are REUSING the same Supabase project and are
--  OK losing all old data. Otherwise just create a fresh Supabase
--  project and run schema.sql there.
--
--  Run this first, THEN run schema.sql.
-- ============================================================

-- new ClickUp objects
drop table if exists task_comments     cascade;
drop table if exists task_assignees    cascade;
drop table if exists tasks             cascade;
drop table if exists statuses          cascade;
drop table if exists lists             cascade;
drop table if exists folders           cascade;
drop table if exists spaces            cascade;
drop table if exists workspace_members cascade;
drop table if exists workspaces        cascade;

-- old v1 (construction) objects
drop table if exists attachments          cascade;
drop table if exists payment_certificates cascade;
drop table if exists budget_categories    cascade;
drop table if exists task_fields          cascade;
drop table if exists records              cascade;
drop table if exists expenses             cascade;
drop table if exists budget_lines         cascade;
drop table if exists project_members      cascade;
drop table if exists projects             cascade;

-- shared
drop table if exists profiles cascade;

-- functions
drop function if exists public.is_pm() cascade;
drop function if exists public.is_project_member(uuid) cascade;
drop function if exists public.project_role(uuid) cascade;
drop function if exists public.can_edit_project(uuid) cascade;
drop function if exists public.task_project(uuid) cascade;
drop function if exists public.is_ws_member(uuid) cascade;
drop function if exists public.ws_role(uuid) cascade;
drop function if exists public.space_ws(uuid) cascade;
drop function if exists public.list_ws(uuid) cascade;
drop function if exists public.task_ws(uuid) cascade;
drop function if exists public.handle_new_user() cascade;

-- types
drop type if exists ws_role          cascade;
drop type if exists status_type      cascade;
drop type if exists priority         cascade;
drop type if exists user_role        cascade;
drop type if exists project_status   cascade;
drop type if exists task_status      cascade;
drop type if exists record_kind      cascade;
drop type if exists expense_category cascade;
drop type if exists cert_status      cascade;
