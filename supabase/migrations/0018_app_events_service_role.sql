-- ============================================================
-- 0018: app_events también para `service_role` (bug encontrado 2026-07-25)
--
-- La 0006 creó la tabla y la 0007 le dio privilegios a `authenticated`, pero a NADIE se le dio a
-- `service_role`. Consecuencia real, silenciosa y de las caras:
--
--   · `logIngestError()` en la Edge Function `ingest` inserta con service_role. Desde que se
--     añadió (2026-07-11) SIEMPRE ha fallado con «permission denied for table app_events», y como
--     está envuelta en `catch (_) {}` a propósito (para no tumbar el ingest por un fallo de
--     telemetría), nadie se enteró. O sea: la telemetría que se puso EXACTAMENTE para que los
--     fallos del ingest dejaran de ser invisibles… era invisible ella misma. Un token inválido o
--     un gasto que no se guarda no dejaban rastro en ningún sitio.
--   · `scripts/errores.mjs` (leer los errores del móvil desde la consola) tampoco podía consultar.
--
-- RLS no tiene nada que ver: service_role se la salta, pero los privilegios de TABLA sí le aplican.
-- Es el mismo despiste que la 0007 arregló para `authenticated`, en el otro rol.
--
-- No se amplía la superficie de nadie más: `anon` sigue sin tocar esta tabla, y para el resto de
-- usuarios manda la política de la 0006 (cada uno inserta lo suyo, solo el admin lee).
-- ============================================================

grant insert, select on public.app_events to service_role;

-- id es identity → insertar exige USAGE de su secuencia (misma razón que en la 0007)
grant usage, select on all sequences in schema public to service_role;
