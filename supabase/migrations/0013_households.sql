-- ============================================================
-- 0013: Hogar compartido (snapshots de solo lectura mutua)
-- Cada usuario publica SU vista; el hogar fusiona sin tocar app_state ajeno.
-- ============================================================

create table if not exists public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Mi hogar',
  invite_code  text not null unique,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_snapshots (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx on public.household_members (user_id);
create index if not exists household_snapshots_household_idx on public.household_snapshots (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_snapshots enable row level security;

-- households: solo miembros ven su hogar
drop policy if exists households_member_select on public.households;
create policy households_member_select on public.households
  for select to authenticated
  using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id and m.user_id = auth.uid()
    )
  );

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

-- members
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select to authenticated
  using (
    exists (
      select 1 from public.household_members m2
      where m2.household_id = household_members.household_id and m2.user_id = auth.uid()
    )
  );

drop policy if exists household_members_insert_owner on public.household_members;
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

-- snapshots: leer todos los del hogar; escribir solo el propio
drop policy if exists household_snapshots_select on public.household_snapshots;
create policy household_snapshots_select on public.household_snapshots
  for select to authenticated
  using (
    exists (
      select 1 from public.household_members m
      where m.household_id = household_snapshots.household_id and m.user_id = auth.uid()
    )
  );

drop policy if exists household_snapshots_upsert on public.household_snapshots;
create policy household_snapshots_upsert on public.household_snapshots
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.household_members m
      where m.household_id = household_snapshots.household_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.households to authenticated;
grant select, insert, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.household_snapshots to authenticated;
grant all on public.households to service_role;
grant all on public.household_members to service_role;
grant all on public.household_snapshots to service_role;

-- Unirse por código (sin exponer hogares ajenos en SELECT directo)
create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select id into hid
  from public.households
  where upper(trim(invite_code)) = upper(trim(p_code))
  limit 1;
  if hid is null then
    raise exception 'invalid_code';
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;
  return hid;
end;
$$;

revoke all on function public.join_household_by_code(text) from public;
grant execute on function public.join_household_by_code(text) to authenticated;
