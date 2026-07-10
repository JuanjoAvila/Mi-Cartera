-- ============================================================
-- 0007: grants que faltaban en app_events (bug 2026-07-10:
-- "permission denied for table app_events" en el panel Actividad).
-- La 0006 creó tabla + RLS pero el rol `authenticated` no tenía
-- privilegios sobre la tabla (los defaults del proyecto no aplicaron
-- a esta tabla creada por `db push`). RLS sigue mandando: insert solo
-- de lo propio, select solo el admin — esto solo abre la puerta base.
-- ============================================================

grant insert, select on public.app_events to authenticated;
-- la columna id es identity → insertar necesita USAGE de su secuencia
grant usage, select on all sequences in schema public to authenticated;
