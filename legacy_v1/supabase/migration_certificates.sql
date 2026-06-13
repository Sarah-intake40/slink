-- ============================================================
--  S Link — Migration: Payment Certificates (المستخلصات)
--  Run this ONCE in: Supabase Dashboard > SQL Editor > New query
--  Safe to run on an existing database — idempotent (re-runnable).
-- ============================================================

-- enum (guarded so re-running does not error)
do $$ begin
  create type cert_status as enum ('draft','submitted','review','approved','paid');
exception when duplicate_object then null; end $$;

create table if not exists payment_certificates (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references projects on delete cascade,
  seq              int not null default 1,           -- مستخلص رقم
  title            text,                             -- optional label, e.g. "Interim Payment 1"
  period_from      date,
  period_to        date,
  submitted_on     date,
  progress_pct     numeric default 0,                -- نسبة الإنجاز الفعلية (manual per certificate)
  gross_amount     numeric not null default 0,       -- إجمالي قيمة الأعمال المنفذة
  retention        numeric default 0,                -- محتجز الضمان (deducted)
  advance_recovery numeric default 0,                -- استرداد الدفعة المقدمة (deducted)
  other_deduction  numeric default 0,                -- خصومات أخرى (deducted)
  tax              numeric default 0,                -- الضريبة / VAT (added to net payable)
  status           cert_status not null default 'draft',
  paid_on          date,                             -- تاريخ الصرف (اتصرف)
  notes            text,
  created_by       uuid references profiles,
  created_at       timestamptz default now()
);
-- net payable = gross_amount - retention - advance_recovery - other_deduction + tax  (computed in app)
create index if not exists payment_certificates_project_idx on payment_certificates(project_id);

alter table payment_certificates enable row level security;

drop policy if exists "certs read"   on payment_certificates;
drop policy if exists "certs insert" on payment_certificates;
drop policy if exists "certs update" on payment_certificates;
drop policy if exists "certs delete" on payment_certificates;

-- members read; pm/engineer create / edit / delete (same as expenses)
create policy "certs read"   on payment_certificates for select using (public.is_project_member(project_id));
create policy "certs insert" on payment_certificates for insert with check (public.can_edit_project(project_id));
create policy "certs update" on payment_certificates for update using (public.can_edit_project(project_id));
create policy "certs delete" on payment_certificates for delete using (public.can_edit_project(project_id));
