# 0001 — Supabase en vez de Firebase

**Estado:** vigente · **Fecha:** 2026-05 (escrito a posteriori el 2026-07-28)

## El problema
Hacía falta una nube con login, base de datos y funciones de servidor, gratis en el tramo de una
familia, y que no obligara a montar servidores.

## Lo que se decidió
Supabase: Postgres + Auth + Edge Functions + RLS.

## Por qué, y no Firebase
- **Es Postgres de verdad.** Los datos son financieros y se consultan por fecha, por categoría y
  por rango de importes. Eso en SQL son tres líneas; en Firestore son índices compuestos y una
  colección desnormalizada por cada consulta nueva.
- **RLS es una frontera de verdad**, escrita en la base de datos, no en la aplicación. Con tres
  usuarios que comparten gastos de casa, «que la pareja vea lo compartido y no el resto» es una
  política SQL, no lógica de cliente que se puede saltar.
- **Salir es posible.** Es Postgres: un `pg_dump` y te lo llevas. Firestore no tiene equivalente.
- El coste de las dos opciones a esta escala es el mismo: cero.

## Qué se paga por ello
- Las Edge Functions son Deno, que no es lo que se usa en el resto del repo. Cuesta cambiar de
  chip al tocarlas, y **Deno no está instalado en local**: por eso hay un test que las parsea con
  esbuild (`tests/edge-sintaxis.test.mjs`) en vez de ejecutarlas.
- El proyecto gratis se pausa por inactividad. No ha pasado, pero está ahí.

## Qué haría cambiar de opinión
Que hiciera falta tiempo real de verdad (varios móviles editando lo mismo a la vez). Hoy la
sincronización es «empuja al guardar, tira al abrir» y sobra.
