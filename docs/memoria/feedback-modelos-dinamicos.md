<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-modelos-dinamicos.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-modelos-dinamicos
description: El usuario quiere que use el modelo de Claude adecuado a cada subtarea de forma dinámica (subagentes con modelo distinto) cuando aporte
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0cd125f0-71eb-4cd1-81c3-7f20cdc6d6bb
---

Pedido 2026-07-11: «cambiar entre modelos de Claude dependiendo de la tarea, de manera dinámica en mitad de la tarea».

**Qué se puede y qué no:**
- El modelo del hilo principal NO puede cambiarse solo a mitad de turno; el usuario puede cambiarlo con `/model` entre turnos (aplica a los siguientes).
- Lo que SÍ puedo hacer dinámicamente: lanzar **subagentes con `model` distinto** (haiku/sonnet/opus/fable) por subtarea — p. ej. búsquedas amplias o trabajo mecánico a haiku/sonnet, razonamiento delicado en el principal.

**Why:** el usuario paga el plan y quiere eficiencia coste/velocidad sin perder calidad en lo delicado.

**How to apply:** en tareas grandes con partes mecánicas separables (exploración masiva, generación repetitiva, verificaciones), delegar esas partes a subagentes con modelo más barato; mantener en el hilo principal el diseño, los fixes delicados de [[mi-cartera-deploy]] y todo lo que toque dinero/estado del usuario. Este pedido cuenta como autorización general para usar subagentes con ese fin (sin abusar: spawns fríos re-derivan contexto y cuestan).
