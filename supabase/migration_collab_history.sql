-- ============================================================
--  S Link (ClickUp) — Migration: collaborators + task history
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
-- ============================================================

-- 1) store email on profiles so collaborators can be added by email
alter table profiles add column if not exists email text;
update profiles p set email = u.email
  from auth.users u where u.id = p.id and (p.email is null or p.email = '');

-- signup trigger now also stores the email
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

-- 2) task activity log (Jira-style history) — every status/assignee/date/name move
create table if not exists task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  actor_id   uuid references profiles on delete set null,
  field      text not null,        -- created | status | assignee | due_date | start_date | priority | name | moved
  from_val   text,
  to_val     text,
  created_at timestamptz default now()
);
create index if not exists task_activity_task_idx on task_activity(task_id);

alter table task_activity enable row level security;
drop policy if exists "act read"   on task_activity;
drop policy if exists "act insert" on task_activity;
create policy "act read"   on task_activity for select using (public.is_ws_member(public.task_ws(task_id)));
create policy "act insert" on task_activity for insert with check (public.is_ws_member(public.task_ws(task_id)));
