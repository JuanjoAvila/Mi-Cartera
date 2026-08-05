# 0002 — Un solo HTML, sin build ni JSX

**Estado:** vigente, con matiz · **Fecha:** 2026-04, revisada en 2026-07 (era v3.101)

## Lo que se decidió
La app se sirve como **un único `public/index.html`** con React vía `React.createElement` — sin
JSX, sin bundler, sin `node_modules` en el resultado. Desde la v3.101 la FUENTE está partida en
`src/modules/*.js` y `npm run build` los concatena; lo que se publica sigue siendo un fichero.

## Por qué
- **Se despliega sola.** Push a `main` → Pages. Sin pipeline que se rompa, sin versiones de
  herramientas que caduquen. Esta app la mantiene una persona en sus ratos.
- **Funciona offline entera** y arranca de un tirón: una petición, nada que resolver.
- **Cualquier IA puede trabajar en ella** sin montar nada. Ha sido la diferencia entre que Cursor,
  Claude de escritorio y Claude del móvil pudieran tocar el mismo repo o no.

## Qué se paga por ello
- `React.createElement` es más verboso que JSX. Se asume.
- Dos ficheros (`10-app-components.js` y `11-app-main.js`) han crecido sin parar y son los que
  duelen. Anotado en el ROADMAP: se reagrupa por dominio **cuando duela**, no antes.
- El minificador **no puede renombrar identificadores** (`minifyIdentifiers` prohibido): hay
  globales que se llaman por nombre.

## Lo que ya se probó y NO se vuelve a intentar
Partir la fuente en módulos **sin** cambiar lo que se publica: hecho, funciona, es lo de ahora.
Lo que no se hace es meter un bundler y publicar varios ficheros — se pierden las tres ventajas de
arriba a cambio de comodidad al escribir.

## Qué haría cambiar de opinión
Que el bundle no cupiera en el presupuesto (`tests/presupuesto-rendimiento.test.mjs`: 310 KB gzip)
y hiciera falta cargar pantallas bajo demanda de verdad.
