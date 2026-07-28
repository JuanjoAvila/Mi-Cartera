# 0003 — Cero CDNs de terceros

**Estado:** vigente y no negociable · **Fecha:** 2026-06

## Lo que se decidió
React, ReactDOM, supabase-js y las fuentes van **auto-hospedados** en `public/vendor/` y
`public/fonts/`, con la versión fijada. Ni un `<script src="https://cdn…">`.

## Por qué
- **Un CDN es un tercero que puede ver a quién sirve.** Esto es una app de finanzas: cada carga
  contaría a un tercero que alguien la está abriendo.
- **Una etiqueta flotante rompe la app sin tocar nada.** supabase-js venía de jsdelivr con `@2`:
  una versión nueva con un cambio incompatible bastaba para dejar sin nube a la familia un martes
  cualquiera, sin un commit al que señalar.
- **Sin CDN no hay app offline.** Y sin app offline no hay APK que arranque en el metro.
- La CSP puede ser **cerrada** de verdad, en vez de tener que abrir dominios ajenos.

## Qué se paga por ello
- Actualizar una dependencia es a mano.
- El bundle es más grande (por eso existe el presupuesto de rendimiento).
- Los logos de banco reales siguen pendientes justo por esto: habría que auto-hospedar ocho.

## Qué haría cambiar de opinión
Nada previsible. Si algún día hiciera falta algo que solo existe en CDN, se copia al repo.
