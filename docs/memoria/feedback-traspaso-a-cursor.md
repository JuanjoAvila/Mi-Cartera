<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-traspaso-a-cursor.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-traspaso-a-cursor
description: "⚠ No basta con actualizar la memoria propia: el plan/brief COMPARTIDO del repo tiene que quedar al día en cada tanda, porque él no trabaja solo conmigo y Cursor tiene que poder retomar sin preguntarle."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c3a6b0a3-82cd-40b5-8be7-6aec293a2f8c
  modified: 2026-08-17T16:13:24.046Z
---

**No trabaja solo conmigo.** Alterna Claude Code, Cursor y sesiones desde el móvil, a veces sobre
el mismo repo el mismo día. Actualizar solo mi memoria (`docs/memoria/`) **no sirve**: lo que Cursor
lee es el repo — `AGENTS.md`, `docs/ROADMAP.md`, el CHANGELOG y sobre todo el **brief/plan de la
tanda en curso**.

**Regla:** al cerrar cada tanda, dejar en el plan compartido una sección de **estado** que diga qué
está hecho, qué está en beta sin veredicto, qué está bloqueado y por qué, y qué es la siguiente
candidata. Escrita para alguien que llega frío y **no puede preguntarle a él**.

**Why:** me lo dijo el 2026-08-17 tras dos tandas seguidas en las que avancé mucho y dejé
`docs/briefs/plan-vuelta-crucero.md` con el plan original, sin marcar nada de lo hecho. Si esa noche
hubiera abierto Cursor, habría tenido que reconstruirlo todo preguntándole — que es justo el
trabajo que estos documentos existen para ahorrarle.

**Y el aviso que iba con ello, sin adornos:** «a veces cursor en temas de bugs complejos te ha
superado por mucho en análisis y ejecución para encontrar dónde estaba el problema y resolvió cosas
que tú ni en montón de sesiones pudiste». Es cierto y está documentado: `gestos` lo cerró Cursor en
35 commits después de que yo me estrellara varias sesiones (ver [[mi-cartera-backlog-2026-08]] §1).
Consecuencias prácticas: **no tratar a Cursor como el que pica lo fácil**, y cuando un bug se
resista más de una sesión, escribir lo descartado CON MEDIDAS en el repo para que el siguiente
—sea quien sea— no repita el camino.

**How to apply:** antes de dar una tanda por cerrada, además de `npm run memoria`, actualizar el
plan/brief de la tanda con la tabla de estado. Enlaza con [[feedback-memoria-siempre-al-repo]] y
[[feedback-coste-tokens-cursor]].
