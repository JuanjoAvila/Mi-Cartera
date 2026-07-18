-- ============================================================
-- 0015: reconstruye TODAS las políticas RLS del Hogar
-- Error real (Actividad 2026-07-18):
--   «new row violates row-level security policy for table "households"»
-- Causa: la BD se quedó sin la policy de INSERT de households (la 0014 solo
-- rehízo los SELECT) → crear un hogar fallaba siempre. Este script deja las
-- políticas de las 3 tablas en su estado bueno y es idempotente: se puede
-- pegar en SQL Editor → Run tantas veces como haga falta.
-- ============================================================

-- Helper sin recursión (mismo de 0014; se recrea por si falta)
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

-- ---------- households ----------
-- SELECT: miembros Y TAMBIÉN el creador (recién creado aún no es miembro:
-- sin el OR, el INSERT ... RETURNING del alta devolvía 0 filas).
drop policy if exists households_member_select on public.households;
create policy households_member_select on public.households
  for select to authenticated
  using (public.is_household_member(id) or created_by = auth.uid());

drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists households_owner_update on public.households;
create policy households_owner_update on public.households
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists households_owner_delete on public.households;
create policy households_owner_delete on public.households
  for delete to authenticated
  using (created_by = auth.uid());

-- ---------- household_members ----------
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- INSERT directo: solo el dueño se añade a sí mismo (los demás entran por el
-- RPC join_household_by_code, que es SECURITY DEFINER y no pasa por aquí).
drop policy if exists household_members_insert_owner on public.household_members;
drop policy if exists household_members_insert_self on public.household_members;
create policy household_members_insert_self on public.household_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.households h
      where h.id = household_members.household_id and h.created_by = auth.uid()
    )
  );

drop policy if exists household_members_delete_self on public.household_members;
create policy household_members_delete_self on public.household_members
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- household_snapshots ----------
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

-- Grants (por si el 0013 no llegó a aplicarse entero)
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.household_snapshots to authenticated;
grant all on public.households to service_role;
grant all on public.household_members to service_role;
grant all on public.household_snapshots to service_role;
