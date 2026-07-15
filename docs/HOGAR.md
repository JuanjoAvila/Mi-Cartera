# Hogar compartido — Fase 1

## Qué hace

Como la cuenta conjunta de CaixaBank, pero **sin mezclar datos**:

1. Persona A crea un **Hogar** → recibe código de 6 letras
2. Persona B entra en **Compartido → Unirme con código**
3. Cada uno pulsa **Actualizar mi vista** → publica un snapshot (patrimonio, cuentas)
4. Todos ven la **suma fusionada** + detalle por miembro (solo lectura)

Des-compartir = salir del hogar (borra tu snapshot, no toca el `app_state` del otro).

## Migración Supabase (obligatoria una vez)

En el panel Supabase → **SQL Editor** → ejecuta el contenido de:

`supabase/migrations/0013_households.sql`

O aplica migraciones con CLI si la usas.

## Probar con dos cuentas

1. Cuenta A: Compartido → Crear hogar → copia el código
2. Cuenta B (otro email): Compartido → Unirme → código
3. Ambas: **Actualizar mi vista**
4. Deberíais ver patrimonio sumado

## Fase 2 (pendiente)

Gastos del día a día y fijos fusionados en el snapshot.
