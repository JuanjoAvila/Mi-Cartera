-- ============================================================
-- 0006: telemetría mínima solo-admin (feedback 2026-07-10)
-- El dueño de la app reparte APKs a familia/amigos y necesita saber, sin estar
-- delante: quién la usa (ping diario) y qué errores les salen (window.onerror,
-- promesas sin catch, ErrorBoundary). Cada usuario INSERTA solo sus eventos;
-- SOLO el admin (por email del JWT) puede LEERLOS — nadie más ve nada de nadie.
-- Sin datos financieros: solo mensaje de error, versión y plataforma.
-- ============================================================

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  kind text not null default 'error',        -- 'error' | 'ping'
  message text,
  detail text,                               -- stack / contexto extra (recortado en cliente)
  app_version text,
  platform text,                             -- 'android' | 'web'
  created_at timestamptz not null default now()
);

alter table public.app_events enable row level security;

-- cualquiera con sesión registra SUS eventos
create policy app_events_insert on public.app_events
  for insert to authenticated
  with check (auth.uid() = user_id);

-- solo el admin los lee (gate por email del JWT; no hace falta conocer el UUID)
create policy app_events_admin_select on public.app_events
  for select to authenticated
  using ((auth.jwt()->>'email') = 'juanjo.avila.chavero@gmail.com');

-- consultas del panel: "últimos N" y "errores desde X"
create index if not exists app_events_created_idx on public.app_events (created_at desc);
