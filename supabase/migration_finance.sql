-- ============================================================
--  S Link (ClickUp) — Migration: construction finance
--  Project budget (on the workspace) + Costs (expenses) + Invoices
--  (المستخلصات / progress claims to the owner). Run ONCE. Idempotent.
-- ============================================================

-- whole-project budget lives on the workspace
alter table workspaces add column if not exists budget numeric default 0;

-- editable, colour-coded cost categories (per workspace)
create table if not exists cost_categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  name         text not null,
  color        text default '#7B68EE',
  sort         int default 0,
  created_at   timestamptz default now()
);
create index if not exists cost_categories_ws_idx on cost_categories(workspace_id);

-- actual money spent on the project
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  category_id  uuid references cost_categories on delete set null,
  description  text,
  amount       numeric not null default 0,
  spent_on     date default now(),
  created_by   uuid references profiles on delete set null,
  created_at   timestamptz default now()
);
create index if not exists expenses_ws_idx on expenses(workspace_id);

-- invoices / payment certificates claimed from the owner
create table if not exists invoices (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid references workspaces on delete cascade,
  seq                 int not null default 1,
  title               text,
  invoice_date        date default now(),
  contract_total      numeric default 0,   -- القيمة الكلية للعقد
  work_to_date        numeric default 0,   -- قيمة الأعمال حتى تاريخه
  previous_works      numeric default 0,   -- الأعمال المنفذة سابقاً
  advance_pct         numeric default 15,  -- خصم نسبة الدفعة المقدمة %
  retention_works_pct numeric default 5,   -- خصم ضمان أعمال %
  retention_final_pct numeric default 5,   -- خصم ضمان نهائي %
  vat_pct             numeric default 15,  -- ضريبة القيمة المضافة %
  status              text default 'draft',-- draft | submitted | approved | received
  received_on         date,
  notes               text,
  created_by          uuid references profiles on delete set null,
  created_at          timestamptz default now()
);
create index if not exists invoices_ws_idx on invoices(workspace_id);

alter table cost_categories enable row level security;
alter table expenses        enable row level security;
alter table invoices        enable row level security;

drop policy if exists "cc all" on cost_categories;
drop policy if exists "ex all" on expenses;
drop policy if exists "inv all" on invoices;
create policy "cc all"  on cost_categories for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "ex all"  on expenses        for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "inv all" on invoices        for all using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
