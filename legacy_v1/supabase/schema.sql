-- ============================================================
--  S Link — Database schema for Supabase (Postgres)
--  Run this once in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- ENUMS ----------
create type user_role        as enum ('pm','engineer','sub','client');
create type project_status   as enum ('not','prog','hold','insp','done');
create type task_status      as enum ('not','prog','hold','insp','done');
create type priority         as enum ('low','med','high','crit');
create type record_kind      as enum ('rfi','submittal','inspection','punch','log','issue');
create type expense_category as enum ('labor','materials','equipment','subcontractor','other');

-- ---------- TABLES ----------
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  role       user_role not null default 'engineer',
  created_at timestamptz default now()
);

create table projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text,
  location   text,
  status     project_status default 'not',
  budget     numeric default 0,                 -- total budget (PM editable)
  start_date date,
  end_date   date,
  color      text default '#2563eb',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects on delete cascade,
  user_id    uuid references profiles on delete cascade,
  role       user_role not null default 'engineer',
  primary key (project_id, user_id)
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects on delete cascade,
  title        text not null,
  description  text,
  status       task_status default 'not',
  priority     priority default 'med',
  assignee     uuid references profiles,
  start_date   date,
  due_date     date,
  is_milestone boolean default false,
  created_at   timestamptz default now()
);

create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks on delete cascade,
  author     uuid references profiles,
  body       text,
  created_at timestamptz default now()
);

-- Budget split per category (PM editable)
create table budget_lines (
  project_id uuid references projects on delete cascade,
  category   expense_category not null,
  amount     numeric default 0,
  primary key (project_id, category)
);

-- Actual costs entered by PM / engineers
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects on delete cascade,
  task_id     uuid references tasks on delete set null,
  category    expense_category not null default 'other',
  description text,
  amount      numeric not null default 0,
  spent_on    date default now(),
  created_by  uuid references profiles,
  created_at  timestamptz default now()
);

create table records (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  kind       record_kind not null,
  ref        text,                              -- e.g. RFI-018
  title      text not null,
  status     task_status default 'not',
  priority   priority default 'med',
  assignee   uuid references profiles,
  due_date   date,
  created_at timestamptz default now()
);

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects on delete cascade,
  task_id     uuid references tasks on delete set null,
  file_name   text,
  file_path   text,            -- path inside the 'drawings' storage bucket
  file_size   text,
  uploaded_by uuid references profiles,
  created_at  timestamptz default now()
);

create index on tasks(project_id);
create index on expenses(project_id);
create index on records(project_id);
create index on attachments(project_id);
create index on project_members(user_id);

-- ============================================================
--  HELPER FUNCTIONS  (security definer = bypass RLS, no recursion)
-- ============================================================
create or replace function public.is_pm() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'pm');
$$;

create or replace function public.is_project_member(pid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select public.is_pm()
      or exists (select 1 from project_members where project_id = pid and user_id = auth.uid());
$$;

create or replace function public.project_role(pid uuid) returns user_role
  language sql security definer stable set search_path = public as $$
  select case when public.is_pm() then 'pm'::user_role
              else (select role from project_members where project_id = pid and user_id = auth.uid())
         end;
$$;

create or replace function public.can_edit_project(pid uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select public.project_role(pid) in ('pm','engineer');
$$;

create or replace function public.task_project(tid uuid) returns uuid
  language sql security definer stable set search_path = public as $$
  select project_id from tasks where id = tid;
$$;

-- Auto-create a profile when someone signs up. First ever user becomes the PM (admin).
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.profiles;
  insert into public.profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          case when cnt = 0 then 'pm'::user_role else 'engineer'::user_role end);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table profiles        enable row level security;
alter table projects        enable row level security;
alter table project_members enable row level security;
alter table tasks           enable row level security;
alter table task_comments   enable row level security;
alter table budget_lines    enable row level security;
alter table expenses        enable row level security;
alter table records         enable row level security;
alter table attachments     enable row level security;

-- profiles: everyone signed in can read names; you edit yourself; PM edits anyone (roles)
create policy "profiles read"   on profiles for select using (auth.uid() is not null);
create policy "profiles insert" on profiles for insert with check (id = auth.uid());
create policy "profiles update" on profiles for update using (id = auth.uid() or public.is_pm());

-- projects: members see; only PM creates / edits / deletes
create policy "projects read"   on projects for select using (public.is_project_member(id));
create policy "projects insert" on projects for insert with check (public.is_pm());
create policy "projects update" on projects for update using (public.is_pm());
create policy "projects delete" on projects for delete using (public.is_pm());

-- project_members: PM manages; you can see your own memberships
create policy "members read"   on project_members for select using (public.is_pm() or user_id = auth.uid() or public.is_project_member(project_id));
create policy "members insert" on project_members for insert with check (public.is_pm());
create policy "members update" on project_members for update using (public.is_pm());
create policy "members delete" on project_members for delete using (public.is_pm());

-- tasks: members read; pm/engineer write; assignee (e.g. sub) can update their own task
create policy "tasks read"   on tasks for select using (public.is_project_member(project_id));
create policy "tasks insert" on tasks for insert with check (public.can_edit_project(project_id));
create policy "tasks update" on tasks for update using (public.can_edit_project(project_id) or assignee = auth.uid());
create policy "tasks delete" on tasks for delete using (public.can_edit_project(project_id));

-- comments: members read; anyone except client can comment; delete own or PM
create policy "comments read"   on task_comments for select using (public.is_project_member(public.task_project(task_id)));
create policy "comments insert" on task_comments for insert with check (author = auth.uid() and public.project_role(public.task_project(task_id)) <> 'client');
create policy "comments delete" on task_comments for delete using (author = auth.uid() or public.is_pm());

-- budget lines: members read; only PM edits the budget
create policy "budget read"   on budget_lines for select using (public.is_project_member(project_id));
create policy "budget insert" on budget_lines for insert with check (public.is_pm());
create policy "budget update" on budget_lines for update using (public.is_pm());
create policy "budget delete" on budget_lines for delete using (public.is_pm());

-- expenses: members read; pm/engineer enter & edit costs
create policy "expenses read"   on expenses for select using (public.is_project_member(project_id));
create policy "expenses insert" on expenses for insert with check (public.can_edit_project(project_id));
create policy "expenses update" on expenses for update using (public.can_edit_project(project_id));
create policy "expenses delete" on expenses for delete using (public.can_edit_project(project_id));

-- records: members read; pm/engineer/sub write (not client); pm/engineer delete
create policy "records read"   on records for select using (public.is_project_member(project_id));
create policy "records insert" on records for insert with check (public.project_role(project_id) <> 'client');
create policy "records update" on records for update using (public.project_role(project_id) <> 'client');
create policy "records delete" on records for delete using (public.can_edit_project(project_id));

-- attachments: members read; anyone except client uploads; uploader or pm/engineer delete
create policy "att read"   on attachments for select using (public.is_project_member(project_id));
create policy "att insert" on attachments for insert with check (public.project_role(project_id) <> 'client');
create policy "att delete" on attachments for delete using (uploaded_by = auth.uid() or public.can_edit_project(project_id));

-- ============================================================
--  STORAGE  (bucket for drawings / PDFs / site photos)
-- ============================================================
insert into storage.buckets (id, name, public) values ('drawings','drawings', false)
  on conflict (id) do nothing;

create policy "drawings read"   on storage.objects for select using (bucket_id = 'drawings' and auth.uid() is not null);
create policy "drawings upload" on storage.objects for insert with check (bucket_id = 'drawings' and auth.uid() is not null);
create policy "drawings delete" on storage.objects for delete using (bucket_id = 'drawings' and owner = auth.uid());

-- ============================================================
--  PAYMENT CERTIFICATES  (المستخلصات — interim payment certificates / IPCs)
--  Progress billing: track each certificate, its deductions, status and
--  whether it has been disbursed (اتصرف). Compared in-app against actual
--  spend (expenses) and actual physical progress to flag under-billing.
-- ============================================================
create type cert_status as enum ('draft','submitted','review','approved','paid');

create table payment_certificates (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references projects on delete cascade,
  seq              int not null default 1,           -- مستخلص رقم
  title            text,                             -- optional label, e.g. "Interim Payment 1"
  period_from      date,
  period_to        date,
  submitted_on     date,
  progress_pct     numeric default 0,                -- نسبة الإنجاز الفعلية (entered manually per certificate)
  gross_amount     numeric not null default 0,       -- إجمالي قيمة الأعمال المنفذة
  other_deduction  numeric default 0,                -- خصومات أخرى — flat penalty/deduction
  -- percentage-based construction deductions (the app computes money from these)
  discount_pct     numeric default 0,                -- % off the work value
  retention_pct    numeric default 0,                -- محتجز الضمان %
  advance_pct      numeric default 0,                -- استرداد الدفعة المقدمة %
  tax_pct          numeric default 15,               -- VAT % (KSA default 15)
  status           cert_status not null default 'draft',
  paid_on          date,                             -- تاريخ الصرف (set when disbursed)
  notes            text,
  created_by       uuid references profiles,
  created_at       timestamptz default now()
);
-- net payable = gross_amount - retention - advance_recovery - other_deduction + tax  (computed in app)
create index on payment_certificates(project_id);

alter table payment_certificates enable row level security;
-- members read; pm/engineer create / edit / delete (same as expenses)
create policy "certs read"   on payment_certificates for select using (public.is_project_member(project_id));
create policy "certs insert" on payment_certificates for insert with check (public.can_edit_project(project_id));
create policy "certs update" on payment_certificates for update using (public.can_edit_project(project_id));
create policy "certs delete" on payment_certificates for delete using (public.can_edit_project(project_id));

-- ============================================================
--  BUDGET CATEGORIES  (per-project, editable) + cost-calculator fields
--  Replaces the fixed expense_category enum + budget_lines for cost tracking.
-- ============================================================
create table budget_categories (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  name       text not null,
  color      text default '#2563eb',
  budget     numeric default 0,          -- amount allocated to this category
  sort       int default 0,
  created_at timestamptz default now()
);
create index on budget_categories(project_id);

alter table budget_categories enable row level security;
create policy "bcat read"   on budget_categories for select using (public.is_project_member(project_id));
create policy "bcat insert" on budget_categories for insert with check (public.is_pm());
create policy "bcat update" on budget_categories for update using (public.is_pm());
create policy "bcat delete" on budget_categories for delete using (public.is_pm());

-- expenses link to a dynamic category and carry an optional qty x rate breakdown.
-- `amount` remains the authoritative total (computed in the app).
alter table expenses add column if not exists category_id uuid references budget_categories on delete set null;
alter table expenses add column if not exists quantity    numeric;
alter table expenses add column if not exists unit_label  text;
alter table expenses add column if not exists rate        numeric;
alter table expenses add column if not exists rate_basis  text default 'flat';   -- flat | unit | day | hour
alter table expenses add column if not exists hours       numeric;
alter table expenses alter column category drop not null;

-- ============================================================
--  CLICKUP-STYLE TASKS  — per-project custom fields + subtasks + checklist + tags
-- ============================================================
create table task_fields (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  name       text not null,
  type       text not null default 'text',   -- text|number|money|percent|select|multiselect|date|checkbox|person
  options    jsonb default '[]'::jsonb,
  sort       int default 0,
  created_at timestamptz default now()
);
create index on task_fields(project_id);

alter table task_fields enable row level security;
create policy "tf read"   on task_fields for select using (public.is_project_member(project_id));
create policy "tf insert" on task_fields for insert with check (public.can_edit_project(project_id));
create policy "tf update" on task_fields for update using (public.can_edit_project(project_id));
create policy "tf delete" on task_fields for delete using (public.can_edit_project(project_id));

alter table tasks add column if not exists parent_id uuid references tasks on delete cascade;
alter table tasks add column if not exists custom    jsonb default '{}'::jsonb;
alter table tasks add column if not exists checklist jsonb default '[]'::jsonb;
alter table tasks add column if not exists tags      jsonb default '[]'::jsonb;
create index on tasks(parent_id);
