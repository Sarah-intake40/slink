-- ============================================================
--  S Link / ClickUp-style — Database schema (Supabase / Postgres)
--  Phase 1: Workspace > Space > Folder > List > Task hierarchy.
--  Run once in: Supabase Dashboard > SQL Editor > New query.
-- ============================================================

-- ---------- ENUMS ----------
create type ws_role     as enum ('owner','admin','member','guest');
create type status_type as enum ('todo','active','done','closed');
create type priority    as enum ('urgent','high','normal','low');

-- ---------- CORE / AUTH ----------
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  email      text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ---------- HIERARCHY ----------
create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text default '#7B68EE',
  budget     numeric default 0,            -- whole-project budget (construction)
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces on delete cascade,
  user_id      uuid references profiles  on delete cascade,
  role         ws_role not null default 'member',
  created_at   timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table spaces (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  name         text not null,
  color        text default '#7B68EE',
  icon         text,                       -- emoji or short label
  private      boolean default false,
  sort         int default 0,
  archived     boolean default false,
  created_at   timestamptz default now()
);

create table folders (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid references spaces on delete cascade,
  name      text not null,
  sort      int default 0,
  archived  boolean default false,
  created_at timestamptz default now()
);

create table lists (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid references spaces  on delete cascade,
  folder_id uuid references folders on delete cascade,   -- null = folderless list in the space
  name      text not null,
  color     text default '#7B68EE',
  sort      int default 0,
  archived  boolean default false,
  created_at timestamptz default now()
);

-- Per-space status set (ClickUp defines statuses at the space level)
create table statuses (
  id       uuid primary key default gen_random_uuid(),
  space_id uuid references spaces on delete cascade,
  name     text not null,
  color    text default '#87909e',
  type     status_type not null default 'active',
  sort     int default 0
);

-- ---------- TASKS ----------
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid references lists on delete cascade,
  parent_id   uuid references tasks on delete cascade,    -- subtasks
  name        text not null,
  description text,
  status_id   uuid references statuses on delete set null,
  priority    priority,                                   -- null = no priority
  start_date  date,
  due_date    date,
  -- Phase-2 columns provisioned now to avoid later migrations:
  tags        jsonb default '[]'::jsonb,
  custom      jsonb default '{}'::jsonb,
  checklist   jsonb default '[]'::jsonb,
  time_estimate int,                                      -- minutes
  recurrence  jsonb,                                      -- repeat rule, e.g. {"freq":"weekly","interval":1}; null = no repeat
  move_to_list uuid references lists(id) on delete set null, -- when completed, relocate the task into this List
  sort        int default 0,
  created_by  uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at  timestamptz default now()
);

create table task_assignees (
  task_id uuid references tasks    on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (task_id, user_id)
);

create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  author     uuid references profiles(id) on delete set null,
  body       text,
  created_at timestamptz default now()
);

create index on spaces(workspace_id);
create index on folders(space_id);
create index on lists(space_id);
create index on lists(folder_id);
create index on statuses(space_id);
create index on tasks(list_id);
create index on tasks(parent_id);
create index on task_assignees(user_id);
create index on workspace_members(user_id);

-- ============================================================
--  HELPER FUNCTIONS  (security definer = bypass RLS, no recursion)
-- ============================================================
create or replace function public.is_ws_member(ws uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$$;

create or replace function public.ws_role(ws uuid) returns ws_role
  language sql security definer stable set search_path = public as $$
  select role from workspace_members where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function public.space_ws(s uuid) returns uuid
  language sql security definer stable set search_path = public as $$
  select workspace_id from spaces where id = s;
$$;

create or replace function public.list_ws(l uuid) returns uuid
  language sql security definer stable set search_path = public as $$
  select sp.workspace_id from lists li join spaces sp on sp.id = li.space_id where li.id = l;
$$;

create or replace function public.task_ws(t uuid) returns uuid
  language sql security definer stable set search_path = public as $$
  select sp.workspace_id
    from tasks tk join lists li on li.id = tk.list_id join spaces sp on sp.id = li.space_id
   where tk.id = t;
$$;

-- Auto-create a profile on signup. The first workspace is created app-side on first login.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Auto-add the creator as owner member when a workspace is created (avoids an RLS
-- bootstrap gap where the insert..returning row isn't yet visible to the creator).
create or replace function public.handle_new_workspace() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_workspace_created on workspaces;
create trigger on_workspace_created
  after insert on workspaces for each row execute function public.handle_new_workspace();

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table profiles         enable row level security;
alter table workspaces       enable row level security;
alter table workspace_members enable row level security;
alter table spaces           enable row level security;
alter table folders          enable row level security;
alter table lists            enable row level security;
alter table statuses         enable row level security;
alter table tasks            enable row level security;
alter table task_assignees   enable row level security;
alter table task_comments    enable row level security;

-- profiles: everyone signed in can read; you edit yourself
create policy "profiles read"   on profiles for select using (auth.uid() is not null);
create policy "profiles insert" on profiles for insert with check (id = auth.uid());
create policy "profiles update" on profiles for update using (id = auth.uid());

-- workspaces (creator can always read their own — covers insert..returning before membership exists)
create policy "ws read"   on workspaces for select using (public.is_ws_member(id) or created_by = auth.uid());
create policy "ws insert" on workspaces for insert with check (created_by = auth.uid());
create policy "ws update" on workspaces for update using (public.ws_role(id) in ('owner','admin'));
create policy "ws delete" on workspaces for delete using (public.ws_role(id) = 'owner');

-- workspace_members: members see the roster; you may add yourself (bootstrap); admins manage
create policy "wm read"   on workspace_members for select using (public.is_ws_member(workspace_id));
create policy "wm insert" on workspace_members for insert
  with check (user_id = auth.uid() or public.ws_role(workspace_id) in ('owner','admin'));
create policy "wm update" on workspace_members for update using (public.ws_role(workspace_id) in ('owner','admin'));
create policy "wm delete" on workspace_members for delete
  using (user_id = auth.uid() or public.ws_role(workspace_id) in ('owner','admin'));

-- spaces / folders / lists / statuses: any workspace member can read & manage (role refinement later)
create policy "spaces all" on spaces   for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "folders all" on folders for all using (public.is_ws_member(public.space_ws(space_id))) with check (public.is_ws_member(public.space_ws(space_id)));
create policy "lists all"  on lists    for all using (public.is_ws_member(public.space_ws(space_id))) with check (public.is_ws_member(public.space_ws(space_id)));
create policy "status all" on statuses for all using (public.is_ws_member(public.space_ws(space_id))) with check (public.is_ws_member(public.space_ws(space_id)));

-- tasks
create policy "tasks all" on tasks for all using (public.is_ws_member(public.list_ws(list_id))) with check (public.is_ws_member(public.list_ws(list_id)));

-- task assignees / comments
create policy "ta all" on task_assignees for all using (public.is_ws_member(public.task_ws(task_id))) with check (public.is_ws_member(public.task_ws(task_id)));
create policy "tc read"   on task_comments for select using (public.is_ws_member(public.task_ws(task_id)));
create policy "tc insert" on task_comments for insert with check (author = auth.uid() and public.is_ws_member(public.task_ws(task_id)));
create policy "tc delete" on task_comments for delete using (author = auth.uid());

-- ============================================================
--  PHASE 2 — task core: custom fields (per space), watchers, dependencies
-- ============================================================
create table task_fields (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid references spaces on delete cascade,
  name      text not null,
  type      text not null default 'text',   -- text|number|money|percent|date|select|multiselect|checkbox|person|url
  options   jsonb default '[]'::jsonb,
  sort      int default 0,
  created_at timestamptz default now()
);
create index on task_fields(space_id);

create table task_watchers (
  task_id uuid references tasks    on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (task_id, user_id)
);

create table task_dependencies (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  depends_on uuid references tasks on delete cascade,
  type       text not null default 'waiting_on',   -- waiting_on | links
  created_at timestamptz default now(),
  unique (task_id, depends_on, type)
);
create index on task_dependencies(task_id);
create index on task_dependencies(depends_on);

alter table task_fields       enable row level security;
alter table task_watchers     enable row level security;
alter table task_dependencies enable row level security;
create policy "tf all" on task_fields       for all using (public.is_ws_member(public.space_ws(space_id))) with check (public.is_ws_member(public.space_ws(space_id)));
create policy "tw all" on task_watchers     for all using (public.is_ws_member(public.task_ws(task_id)))   with check (public.is_ws_member(public.task_ws(task_id)));
create policy "td all" on task_dependencies for all using (public.is_ws_member(public.task_ws(task_id)))   with check (public.is_ws_member(public.task_ws(task_id)));

-- ============================================================
--  PHASE 4 — notifications
-- ============================================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles on delete cascade,
  actor_id   uuid references profiles on delete set null,
  type       text not null,                                  -- assigned | comment | mention | watching
  task_id    uuid references tasks on delete cascade,
  list_id    uuid references lists on delete cascade,
  body       text,
  read       boolean default false,
  created_at timestamptz default now()
);
create index on notifications(user_id, read);
alter table notifications enable row level security;
create policy "notif read"   on notifications for select using (user_id = auth.uid());
create policy "notif insert" on notifications for insert with check (public.is_ws_member(public.task_ws(task_id)));
create policy "notif update" on notifications for update using (user_id = auth.uid());
create policy "notif delete" on notifications for delete using (user_id = auth.uid());
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when others then null; end $$;

-- ============================================================
--  TASK ACTIVITY (Jira-style history) — every status/assignee/date/name move
-- ============================================================
create table task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  actor_id   uuid references profiles on delete set null,
  field      text not null,        -- created | status | assignee | due_date | start_date | priority | name | moved
  from_val   text,
  to_val     text,
  created_at timestamptz default now()
);
create index on task_activity(task_id);
alter table task_activity enable row level security;
create policy "act read"   on task_activity for select using (public.is_ws_member(public.task_ws(task_id)));
create policy "act insert" on task_activity for insert with check (public.is_ws_member(public.task_ws(task_id)));

-- ============================================================
--  CONSTRUCTION FINANCE — cost categories, expenses, invoices
-- ============================================================
create table cost_categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  name         text not null,
  color        text default '#7B68EE',
  sort         int default 0,
  created_at   timestamptz default now()
);
create index on cost_categories(workspace_id);

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  category_id  uuid references cost_categories on delete set null,
  description  text,
  amount       numeric not null default 0,    -- authoritative total (computed in app)
  quantity     numeric,                        -- cost calculator
  unit_label   text,
  rate         numeric,
  rate_basis   text default 'flat',            -- flat | unit | day | hour
  hours        numeric,
  spent_on     date default now(),
  created_by   uuid references profiles on delete set null,
  created_at   timestamptz default now()
);
create index on expenses(workspace_id);

create table invoices (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid references workspaces on delete cascade,
  seq                 int not null default 1,
  title               text,
  invoice_date        date default now(),
  contract_total      numeric default 0,
  work_to_date        numeric default 0,
  previous_works      numeric default 0,
  advance_pct         numeric default 15,
  retention_works_pct numeric default 5,
  retention_final_pct numeric default 5,
  vat_pct             numeric default 15,
  status              text default 'draft',
  received_on         date,
  notes               text,
  created_by          uuid references profiles on delete set null,
  created_at          timestamptz default now()
);
create index on invoices(workspace_id);

alter table cost_categories enable row level security;
alter table expenses        enable row level security;
alter table invoices        enable row level security;
create policy "cc all"  on cost_categories for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "ex all"  on expenses        for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "inv all" on invoices        for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
