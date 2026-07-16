-- ============================================================
-- 0014: rompe recursión infinita en RLS de household_members
-- Error: "infinite recursion detected in policy for relation household_members"
-- Causa: la policy SELECT de members hacía EXISTS sobre la misma tabla → loop.
-- Fix: función SECURITY DEFINER que lee members sin pasar por RLS.
-- ============================================================

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

-- households: miembros ven su hogar (sin subquery RLS circular)
drop policy if exists households_member_select on public.households;
create policy households_member_select on public.households
  for select to authenticated
  using (public.is_household_member(id));

-- members: ves filas de hogares donde tú eres miembro
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- snapshots: igual
drop policy if exists household_snapshots_select on public.household_snapshots;
create policy household_snapshots_select on public.household_snapshots
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists household_snapshots_upsert on public.household_snapshots;
create policy household_snapshots_upsert on public.household_snapshots
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_household_member(household_id)
  );
