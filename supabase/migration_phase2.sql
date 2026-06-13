-- ============================================================
--  S Link (ClickUp) — Migration: Phase 2 task core
--  Custom fields (per space), watchers, dependencies.
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
--  (If you ran the latest schema.sql fresh, these already exist.)
-- ============================================================

-- Per-space custom field definitions; values live in tasks.custom jsonb keyed by field id.
create table if not exists task_fields (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid references spaces on delete cascade,
  name      text not null,
  type      text not null default 'text',   -- text|number|money|percent|date|select|multiselect|checkbox|person|url
  options   jsonb default '[]'::jsonb,
  sort      int default 0,
  created_at timestamptz default now()
);
create index if not exists task_fields_space_idx on task_fields(space_id);

-- Watchers (followers) of a task.
create table if not exists task_watchers (
  task_id uuid references tasks    on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (task_id, user_id)
);

-- Task relationships: A (task_id) --type--> B (depends_on).
--   waiting_on : A is waiting on B  (B blocks A)
--   links      : non-blocking link  (symmetric)
create table if not exists task_dependencies (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  depends_on uuid references tasks on delete cascade,
  type       text not null default 'waiting_on',
  created_at timestamptz default now(),
  unique (task_id, depends_on, type)
);
create index if not exists task_deps_task_idx on task_dependencies(task_id);
create index if not exists task_deps_dep_idx  on task_dependencies(depends_on);

alter table task_fields       enable row level security;
alter table task_watchers     enable row level security;
alter table task_dependencies enable row level security;

drop policy if exists "tf all" on task_fields;
create policy "tf all" on task_fields for all
  using (public.is_ws_member(public.space_ws(space_id)))
  with check (public.is_ws_member(public.space_ws(space_id)));

drop policy if exists "tw all" on task_watchers;
create policy "tw all" on task_watchers for all
  using (public.is_ws_member(public.task_ws(task_id)))
  with check (public.is_ws_member(public.task_ws(task_id)));

drop policy if exists "td all" on task_dependencies;
create policy "td all" on task_dependencies for all
  using (public.is_ws_member(public.task_ws(task_id)))
  with check (public.is_ws_member(public.task_ws(task_id)));
