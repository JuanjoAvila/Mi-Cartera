---
name: lag-asentamiento-raf
description: Causa del tirón al soltar — transition CSS del carrusel a 120 Hz (2026-07-27 Cursor)
metadata:
  type: project
---

**CERRADO con medida en SU móvil (PipelineReporter presentados, beta .43):** al soltar el dedo
la secuencia de huecos es `25 8 25 8 …` trece veces (= 0,42 s = duración de la transition del
`.track`). El arrastre iba a 8,3 ms clavados. WAAPI igual de malo; rAF escribiendo transform:
**0 saltos**.

Arreglo: `asentarTrack` en `11-app-main.js` + `.track{transition:none}`. Guardián:
`tests/track-asentar-raf.test.mjs`. Herramientas: `tools/movil/huecos.mjs`, `ab-waapi.mjs`,
`banco.mjs`.

⚠ El bus de `active` (6ª vuelta) se queda — era un re-render real — pero él dijo «sigue» tras la
.43. No lo deshagas ni lo vuelvas a «arreglar» como si fuera ESTO.

⚠ Varas que mienten: rAF (hilo principal ≠ compositor), `% DROPPED` (33 % en reposo es normal),
umbral 32 ms (es de 60 Hz; el suyo es 120 → malo >12,5 ms).

De paso: `applySeason("")` dejaba `data-season=""` y encendía fabpulse. No era este tirón; se
arregló con `removeAttribute`.
