-- ============================================================
--  S Link — Migration: Invoice (المستخلص) percentage-based deductions
--  Run ONCE in: Supabase Dashboard > SQL Editor > New query
--  Safe to run on an existing database — idempotent (re-runnable).
--
--  Construction invoices calculate retention / advance recovery / tax /
--  discount as PERCENTAGES of the certified work value, not fixed amounts.
--  These columns store the rates; the app computes the money from them.
--  (The table keeps its internal name `payment_certificates`; the UI calls
--   it "Invoice".)
-- ============================================================
alter table payment_certificates add column if not exists discount_pct  numeric default 0;   -- % off the work value
alter table payment_certificates add column if not exists retention_pct numeric default 0;   -- محتجز الضمان %
alter table payment_certificates add column if not exists advance_pct   numeric default 0;   -- استرداد الدفعة المقدمة %
alter table payment_certificates add column if not exists tax_pct       numeric default 15;  -- VAT % (KSA default 15)
-- `other_deduction` (flat) and `gross_amount` already exist and stay as-is.
-- The old fixed-amount columns (retention, advance_recovery, tax) are left in
-- place but no longer used.
