-- ============================================================
-- 0005: flag no_card en expenses
-- Bizums/transferencias a personas: cuentan como movimiento del saldo pero
-- NO alimentan el round-up de TR (TR solo redondea compras con TARJETA).
-- Hasta ahora el flag noCard solo vivía en el estado local del móvil; con la
-- columna sobrevive a reinstalaciones y sincroniza entre dispositivos.
-- ============================================================

alter table public.expenses
  add column if not exists no_card boolean not null default false;
