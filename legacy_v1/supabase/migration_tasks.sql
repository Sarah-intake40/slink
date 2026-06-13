-- ============================================================
--  S Link — Migration: ClickUp-style tasks
--  Per-project custom fields + subtasks + checklists + tags.
--  Run ONCE in: Supabase Dashboard > SQL Editor > New query
--  Safe to run on an existing database — idempotent (re-runnable).
-- ============================================================

-- Per-project custom field definitions (the "add your own attribute" magic)
create table if not exists task_fields (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  name       text not null,
  type       text not null default 'text',   -- text|number|money|percent|select|multiselect|date|checkbox|person
  options    jsonb default '[]'::jsonb,       -- choices for select / multiselect
  sort       int default 0,
  created_at timestamptz default now()
);
create index if not exists task_fields_project_idx on task_fields(project_id);

alter table task_fields enable row level security;
drop policy if exists "tf read"   on task_fields;
drop policy if exists "tf insert" on task_fields;
drop policy if exists "tf update" on task_fields;
drop policy if exists "tf delete" on task_fields;
create policy "tf read"   on task_fields for select using (public.is_project_member(project_id));
create policy "tf insert" on task_fields for insert with check (public.can_edit_project(project_id));
create policy "tf update" on task_fields for update using (public.can_edit_project(project_id));
create policy "tf delete" on task_fields for delete using (public.can_edit_project(project_id));

-- Tasks gain: subtasks (parent_id), custom field values, an inline checklist, and tags.
alter table tasks add column if not exists parent_id uuid references tasks on delete cascade;
alter table tasks add column if not exists custom    jsonb default '{}'::jsonb;   -- { field_id: value }
alter table tasks add column if not exists checklist jsonb default '[]'::jsonb;   -- [ { id, text, done } ]
alter table tasks add column if not exists tags      jsonb default '[]'::jsonb;   -- [ "tag", ... ]
create index if not exists tasks_parent_idx on tasks(parent_id);
