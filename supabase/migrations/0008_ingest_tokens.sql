-- ============================================================
-- 0008 · ingest MULTIUSUARIO
-- Hasta ahora el lector de notificaciones (Edge Function `ingest`) escribía SIEMPRE
-- para un único usuario, el del secreto INGEST_USER_ID (el creador). Por eso, cuando
-- una pareja/amigo instalaba la app y le llegaba la noti de un gasto de Trade Republic,
-- o no se apuntaba, o se apuntaba en la cuenta del creador — nunca en la suya.
--
-- Ahora cada persona genera un TOKEN propio (desde Ajustes → notificaciones) que se
-- guarda aquí ligado a su user_id. El lector nativo manda ese token e `ingest` lo
-- resuelve a la cuenta correcta. El token del creador (secreto INGEST_TOKEN →
-- INGEST_USER_ID) sigue funcionando igual: cero disrupción para lo que ya está montado.
-- ============================================================

create table if not exists public.ingest_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Un token vigente por usuario: al (re)generarlo se hace upsert por user_id.
create unique index if not exists ingest_tokens_user_idx on public.ingest_tokens(user_id);

alter table public.ingest_tokens enable row level security;

-- El usuario gestiona SOLO su propia fila (anon key + su sesión). La Edge Function
-- `ingest` usa la service role key (salta RLS) para resolver token → user_id sin sesión.
drop policy if exists ingest_tokens_select on public.ingest_tokens;
drop policy if exists ingest_tokens_insert on public.ingest_tokens;
drop policy if exists ingest_tokens_update on public.ingest_tokens;
drop policy if exists ingest_tokens_delete on public.ingest_tokens;

create policy ingest_tokens_select on public.ingest_tokens
  for select using (auth.uid() = user_id);
create policy ingest_tokens_insert on public.ingest_tokens
  for insert with check (auth.uid() = user_id);
create policy ingest_tokens_update on public.ingest_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ingest_tokens_delete on public.ingest_tokens
  for delete using (auth.uid() = user_id);
