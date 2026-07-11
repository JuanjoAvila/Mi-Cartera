-- 0009: grants que faltaban en ingest_tokens (bug 2026-07-11:
-- "permission denied for table ingest_tokens" al activar «Apuntar aquí
-- mis gastos de Trade Republic» en Ajustes).
-- La 0008 creó tabla + RLS pero, igual que pasó con app_events (0007),
-- los defaults del proyecto no dan privilegios a los roles de la API:
-- RLS decide QUÉ filas, pero sin GRANT no se llega ni a la tabla.

-- El usuario gestiona su propia fila desde la web (anon key + sesión).
grant select, insert, update, delete on public.ingest_tokens to authenticated;

-- La Edge Function `ingest` resuelve token → user_id con la service role key.
-- Sin este grant la resolución fallaría en silencio y todo token parecería inválido.
grant select on public.ingest_tokens to service_role;

-- `ingest` ahora también registra sus fallos en app_events (telemetría solo-admin):
-- antes un gasto que fallaba en el servidor desaparecía sin dejar rastro.
grant insert on public.app_events to service_role;
grant usage, select on all sequences in schema public to service_role;
