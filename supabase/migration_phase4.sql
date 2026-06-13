-- ============================================================
--  S Link (ClickUp) — Migration: Phase 4a notifications
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
-- ============================================================
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles on delete cascade,     -- recipient
  actor_id   uuid references profiles on delete set null,    -- who triggered it
  type       text not null,                                  -- assigned | comment | mention | watching
  task_id    uuid references tasks on delete cascade,
  list_id    uuid references lists on delete cascade,        -- for navigation
  body       text,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on notifications(user_id, read);

alter table notifications enable row level security;
drop policy if exists "notif read"   on notifications;
drop policy if exists "notif insert" on notifications;
drop policy if exists "notif update" on notifications;
drop policy if exists "notif delete" on notifications;
create policy "notif read"   on notifications for select using (user_id = auth.uid());
create policy "notif insert" on notifications for insert with check (public.is_ws_member(public.task_ws(task_id)));
create policy "notif update" on notifications for update using (user_id = auth.uid());
create policy "notif delete" on notifications for delete using (user_id = auth.uid());

-- live updates (no error if already added)
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when others then null; end $$;
