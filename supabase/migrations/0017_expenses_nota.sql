-- ============================================================
-- 0017: concepto (`nota`) de los movimientos
--
-- Petición del padre del creador (2026-07-24): en el histórico solo se veía el TÍTULO del
-- movimiento («Bizum de Maria», «PAGO TARJETA») y había que entrar en la app del banco para
-- saber de qué era. El dato ya llegaba y se tiraba:
--   · Open Banking (Enable Banking) manda `remittance_information` en cada transacción.
--   · El lector de notificaciones manda el texto completo de la noti, donde va el mensaje del bizum.
--
-- `nota`      → concepto tal cual lo da el banco / la noti (o lo que escriba el usuario).
-- `nota_edit` → true si lo escribió el USUARIO: así un re-sync del banco no le pisa su texto.
-- ============================================================

alter table public.expenses
  add column if not exists nota      text,
  add column if not exists nota_edit boolean not null default false;

-- Buscar por concepto en el histórico («¿cuál era el bizum del alquiler?») sin escanear la tabla.
create index if not exists expenses_user_nota_idx
  on public.expenses using gin (to_tsvector('spanish', coalesce(nota, '')));
