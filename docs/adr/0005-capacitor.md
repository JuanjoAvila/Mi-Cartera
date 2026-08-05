# 0005 — Capacitor en vez de nativo o React Native

**Estado:** vigente · **Fecha:** 2026-06

## Lo que se decidió
La app Android es la misma PWA dentro de una WebView de **Capacitor**, con plugins Java propios
para lo que la web no puede.

## Por qué
Una sola base de código, y lo que se arregla llega por OTA **el mismo día** sin pasar por ninguna
tienda. React Native habría obligado a reescribir la UI entera; nativo, a mantener dos apps.

## Lo que SÍ ha habido que escribir en Java, que es la frontera real
- El puente de **Trade Republic** (WebView oculta con su jar de cookies).
- El **lector de notificaciones** que apunta los gastos.
- El **widget** del escritorio y las **notificaciones** locales.
- El **icono y el splash nativos**.

## Qué se paga por ello
- **OTA ≠ APK.** Si el arreglo es Java, sin APK nueva el móvil no lo tiene. Ha costado sesiones
  enteras confundir las dos cosas; por eso Ajustes canta ahora `web vX · app Y`.
- La WebView **no se comporta como Chrome**: no hay rubber-band (por eso el rebote de las pestañas
  está escrito a mano), `gfxinfo` miente al medir, y el reCAPTCHA de MyInvestor rechaza el token
  por dominio — lo que mantiene ese login pendiente de una WebView nativa.

## Qué haría cambiar de opinión
Nada a la vista. El coste de Capacitor es conocido y está documentado; el de reescribir, no.
