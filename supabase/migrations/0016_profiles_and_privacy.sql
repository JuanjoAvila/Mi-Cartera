-- ============================================================
-- 0012: perfiles (roles admin) + política app_events sin email hardcodeado en cliente
-- Aditiva. El admin inicial se marca por email en el trigger (misma regla que 0006).
-- ============================================================

create table if not exists public.profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  is_admin  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_own_read" on public.profiles;
create policy "profiles_own_read" on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

-- Nuevo usuario → fila en profiles (admin = email del creador de la app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, is_admin)
  values (new.id, new.email = 'juanjo.avila.chavero@gmail.com')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios ya existentes
insert into public.profiles (user_id, is_admin)
select id, email = 'juanjo.avila.chavero@gmail.com' from auth.users
on conflict (user_id) do nothing;

-- app_events: admin por profiles.is_admin (no por email en cada SELECT del cliente)
drop policy if exists app_events_admin_select on public.app_events;
create policy app_events_admin_select on public.app_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_admin
    )
  );
