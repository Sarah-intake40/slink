-- ============================================================
--  S Link (ClickUp) — FIX: workspace creation 403 (RLS bootstrap)
--  Run ONCE in the SQL Editor. Idempotent / safe to re-run.
--
--  Cause: creating a workspace did `insert ... returning *`, but the
--  creator wasn't a member yet, so the read policy hid the returned row.
--  Fix: (1) creator can always read their own workspaces, and
--       (2) a trigger auto-adds the creator as owner member on insert.
-- ============================================================

-- 1) creator can read workspaces they created (covers the insert..returning)
drop policy if exists "ws read" on workspaces;
create policy "ws read" on workspaces for select
  using (public.is_ws_member(id) or created_by = auth.uid());

-- 2) auto-add the creator as an owner member (security definer = bypasses RLS)
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

-- 3) backfill: adopt any workspaces that were created but left member-less
--    (orphans from the earlier failed attempts) so you don't get duplicates.
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.created_by, 'owner'
  from public.workspaces w
 where w.created_by is not null
   and not exists (select 1 from public.workspace_members m where m.workspace_id = w.id)
on conflict do nothing;
