# Hogar compartido (Fase 1 + 2)

## Qué hace

Como la cuenta conjunta de CaixaBank, pero **sin mezclar datos**:

1. Persona A crea un **Hogar** → recibe código de 6 letras
2. Persona B entra en **Compartido → Unirme con código**
3. Cada uno pulsa **Actualizar mi vista** → publica un snapshot (patrimonio, cuentas)
4. Todos ven la **suma fusionada** + detalle por miembro (solo lectura)

Des-compartir = salir del hogar (borra tu snapshot, no toca el `app_state` del otro).

## Migraciones Supabase

1. `0013_households.sql` — tablas del hogar (una vez).
2. `0014_household_rls_no_recursion.sql` — **si ves**  
   `infinite recursion detected in policy for relation "household_members"`  
   pégalo en **SQL Editor → Run** (arregla las políticas RLS).

## Probar con dos cuentas

1. Cuenta A: Compartido → Crear hogar → copia el código
2. Cuenta B (otro email): Compartido → Unirme → código
3. Ambas: **Actualizar mi vista**
4. Deberíais ver patrimonio sumado

## Fase 2 (v3.110+)

Al pulsar **Actualizar mi vista**, el snapshot incluye también:

- gastos del mes por categoría (sin comercios)
- total de fijos + top 5 fijos por miembro

La UI del hogar muestra gasto fusionado y barras por categoría. **No hace falta otra migración SQL.**
